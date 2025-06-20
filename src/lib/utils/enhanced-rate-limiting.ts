import { NextRequest } from 'next/server';

import { createRequestScopedSupabaseClient } from '@/lib/supabase/request-scoped';

// Rate limiting configuration constants
const RATE_LIMIT_DEFAULTS = {
  USER_REQUESTS_PER_HOUR: 60,
  USER_WINDOW_HOURS: 1,
  IP_REQUESTS_PER_HOUR: 200,
  IP_WINDOW_HOURS: 1,
  CACHE_TTL_HOURS: 24,
  MINUTES_PER_HOUR: 60,
  SECONDS_PER_HOUR: 3600,
  MS_PER_HOUR: 3600000,
  MS_PER_MINUTE: 60000,
  SECONDS_PER_MS: 1000,
} as const;

// Enhanced rate limiting configuration
const RATE_LIMIT_CONFIG = {
  // User-based limits
  USER_REQUESTS_PER_HOUR: Number(process.env.RATE_LIMIT_USER_REQUESTS_PER_HOUR) || RATE_LIMIT_DEFAULTS.USER_REQUESTS_PER_HOUR,
  USER_WINDOW_HOURS: Number(process.env.RATE_LIMIT_USER_WINDOW_HOURS) || RATE_LIMIT_DEFAULTS.USER_WINDOW_HOURS,
  
  // IP-based limits (global protection)
  IP_REQUESTS_PER_HOUR: Number(process.env.RATE_LIMIT_IP_REQUESTS_PER_HOUR) || RATE_LIMIT_DEFAULTS.IP_REQUESTS_PER_HOUR,
  IP_WINDOW_HOURS: Number(process.env.RATE_LIMIT_IP_WINDOW_HOURS) || RATE_LIMIT_DEFAULTS.IP_WINDOW_HOURS,
  
  // Cache TTL (24 hours in milliseconds)
  CACHE_TTL_MS: Number(process.env.RATE_LIMIT_CACHE_TTL_MS) || (RATE_LIMIT_DEFAULTS.CACHE_TTL_HOURS * RATE_LIMIT_DEFAULTS.MS_PER_HOUR),
} as const;

interface RateLimitResult {
  allowed: boolean;
  error?: string;
  headers: Record<string, string>;
  remainingRequests?: number;
  resetTime?: Date;
  limitType?: 'user' | 'ip';
}

interface RateLimitRecord {
  request_count: number;
  window_start: string;
  last_request: string;
  expires_at: string;
}

// Extract real IP address from request headers
function extractRealIP(request: NextRequest): string {
  // Check common proxy headers in order of preference
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor !== null && forwardedFor.length > 0) {
    // Take the first IP in the list (original client)
    const firstIP = forwardedFor.split(',')[0]?.trim();
    if (firstIP !== undefined && firstIP.length > 0) return firstIP;
  }
  
  const realIP = request.headers.get('x-real-ip');
  if (realIP !== null && realIP.length > 0) return realIP;
  
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  if (cfConnectingIP !== null && cfConnectingIP.length > 0) return cfConnectingIP;
  
  // Fallback to 'unknown' since NextRequest doesn't have ip property
  return 'unknown';
}

// Validate IP address format
function isValidIP(ip: string): boolean {
  if (ip === 'unknown') return false;
  
  // IPv4 regex
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  
  // IPv6 regex (simplified)
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

// Check rate limit for a specific key (user or IP)
async function checkRateLimit(
  supabase: ReturnType<typeof createRequestScopedSupabaseClient>,
  limitKey: string,
  limitType: 'user' | 'ip',
  maxRequests: number,
  windowHours: number,
): Promise<RateLimitResult> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - (windowHours * RATE_LIMIT_DEFAULTS.MS_PER_HOUR));
  
  try {
    // Get current rate limit record from api_cache
    const { data: existingRecord, error: fetchError } = await supabase
      .from('api_cache')
      .select('data')
      .eq('cache_key', limitKey)
      .maybeSingle(); // Use maybeSingle instead of single to avoid 406 errors

    if (fetchError !== null && fetchError.code !== 'PGRST116') { // Not "not found"
      throw fetchError;
    }

    let currentRecord: RateLimitRecord | undefined;
    
    if (existingRecord?.data !== null && existingRecord?.data !== undefined) {
      try {
        const recordData = existingRecord.data as unknown as RateLimitRecord;
        currentRecord = recordData;
        
        // Check if record has expired
        if (typeof currentRecord.expires_at === 'string' && new Date(currentRecord.expires_at) < now) {
          currentRecord = undefined;
        }
      } catch {
        // Invalid data, treat as no record
        currentRecord = undefined;
      }
    }

    // Check if we need to reset the window - handle undefined safely
    let needsReset = true;
    if (currentRecord !== undefined) {
      const currentWindowStart = new Date(currentRecord.window_start);
      needsReset = currentWindowStart.getTime() < windowStart.getTime();
    }

    let requestCount = 1;
    let actualWindowStart = now;

    if (needsReset === false && currentRecord !== undefined) {
      requestCount = currentRecord.request_count + 1;
      actualWindowStart = new Date(currentRecord.window_start);
    }

    // Check if limit exceeded
    if (requestCount > maxRequests) {
      const resetTime = new Date(actualWindowStart.getTime() + (windowHours * RATE_LIMIT_DEFAULTS.MS_PER_HOUR));
      
      return {
        allowed: false,
        error: `Rate limit exceeded. Try again in ${Math.ceil((resetTime.getTime() - now.getTime()) / RATE_LIMIT_DEFAULTS.MS_PER_MINUTE)} minutes.`,
        headers: {
          'X-RateLimit-Limit': maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': Math.ceil(resetTime.getTime() / RATE_LIMIT_DEFAULTS.SECONDS_PER_MS).toString(),
          'Retry-After': Math.ceil((resetTime.getTime() - now.getTime()) / RATE_LIMIT_DEFAULTS.SECONDS_PER_MS).toString(),
        },
        remainingRequests: 0,
        resetTime,
        limitType,
      };
    }

    // Update the rate limit record
    const expiresAt = new Date(actualWindowStart.getTime() + RATE_LIMIT_CONFIG.CACHE_TTL_MS);
    
    const newRecord: RateLimitRecord = {
      request_count: requestCount,
      window_start: actualWindowStart.toISOString(),
      last_request: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    };

    // Upsert the record using correct api_cache schema
    const recordDataJson: unknown = JSON.parse(JSON.stringify(newRecord));
    const { error: upsertError } = await supabase
      .from('api_cache')
      .upsert({
        cache_key: limitKey,
        data: recordDataJson as any,
        created_at: now.toISOString(),
      }, {
        onConflict: 'cache_key',
      });

    if (upsertError !== null) {
      throw upsertError;
    }

    const remainingRequests = Math.max(0, maxRequests - requestCount);
    const resetTime = new Date(actualWindowStart.getTime() + (windowHours * RATE_LIMIT_DEFAULTS.MS_PER_HOUR));

    return {
      allowed: true,
      headers: {
        'X-RateLimit-Limit': maxRequests.toString(),
        'X-RateLimit-Remaining': remainingRequests.toString(),
        'X-RateLimit-Reset': Math.ceil(resetTime.getTime() / RATE_LIMIT_DEFAULTS.SECONDS_PER_MS).toString(),
      },
      remainingRequests,
      resetTime,
      limitType,
    };

  } catch (error: unknown) {
    // On database error, allow the request but log the issue
    console.error(`Rate limiting error for ${limitType} ${limitKey}:`, error);
    
    // For authentication errors, still allow the request to proceed
    // This prevents rate limiting from blocking legitimate requests when auth fails
    return {
      allowed: true,
      headers: {
        'X-RateLimit-Fallback': 'true',
        'X-RateLimit-Error': limitType === 'user' ? 'auth-failed' : 'service-unavailable',
      },
      error: `Rate limiting service unavailable`,
    };
  }
}

// Enhanced rate limiting with both user and IP protection
export async function applyEnhancedRateLimit(
  request: NextRequest,
  userId?: string,
): Promise<RateLimitResult> {
  const supabase = createRequestScopedSupabaseClient(request);
  const clientIP = extractRealIP(request);
  
  // Always check IP-based rate limiting first (global protection)
  if (isValidIP(clientIP)) {
    const ipLimitKey = `rate_limit:ip:${clientIP}`;
    const ipResult = await checkRateLimit(
      supabase,
      ipLimitKey,
      'ip',
      RATE_LIMIT_CONFIG.IP_REQUESTS_PER_HOUR,
      RATE_LIMIT_CONFIG.IP_WINDOW_HOURS,
    );
    
    if (!ipResult.allowed) {
      return ipResult;
    }
  }
  
  // Check user-based rate limiting if authenticated
  if (userId !== undefined && userId.length > 0) {
    const userLimitKey = `rate_limit:user:${userId}`;
    const userResult = await checkRateLimit(
      supabase,
      userLimitKey,
      'user',
      RATE_LIMIT_CONFIG.USER_REQUESTS_PER_HOUR,
      RATE_LIMIT_CONFIG.USER_WINDOW_HOURS,
    );
    
    if (!userResult.allowed) {
      return userResult;
    }
    
    // Merge headers from both checks
    return {
      allowed: true,
      headers: {
        ...userResult.headers,
        'X-RateLimit-IP-Limit': RATE_LIMIT_CONFIG.IP_REQUESTS_PER_HOUR.toString(),
        'X-Client-IP': isValidIP(clientIP) ? clientIP : 'unknown',
      },
    };
  }
  
  // For unauthenticated requests, only IP limiting applies
  return {
    allowed: true,
    headers: {
      'X-RateLimit-IP-Limit': RATE_LIMIT_CONFIG.IP_REQUESTS_PER_HOUR.toString(),
      'X-Client-IP': isValidIP(clientIP) ? clientIP : 'unknown',
    },
  };
}

// Export configuration for testing and monitoring
export { RATE_LIMIT_CONFIG };
