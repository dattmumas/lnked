import { supabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * Rate limiting utility using Supabase for persistence
 * Supports per-user and per-IP rate limiting with configurable windows
 */

// Constants for calculations
const MILLISECONDS_PER_SECOND = 1000;

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: Date;
  error?: string;
}

const DEFAULT_CONFIGS = {
  notifications_per_user: {
    maxRequests: parseInt(process.env['NOTIF_RATE_LIMIT_PER_USER'] ?? '60', 10), // 60 requests per hour
    windowMs: parseInt(process.env['NOTIF_RATE_WINDOW_MS'] ?? '3600000', 10), // 1 hour
    keyPrefix: 'notif_user',
  },
  notifications_per_ip: {
    maxRequests: parseInt(process.env['NOTIF_RATE_LIMIT_PER_IP'] ?? '200', 10), // 200 requests per hour
    windowMs: parseInt(process.env['NOTIF_RATE_WINDOW_MS'] ?? '3600000', 10), // 1 hour
    keyPrefix: 'notif_ip',
  },
} as const;

/**
 * Check and update rate limit for a given key
 */
export async function checkRateLimit(
  identifier: string,
  configName: keyof typeof DEFAULT_CONFIGS,
): Promise<RateLimitResult> {
  const config = DEFAULT_CONFIGS[configName];
  const cacheKey = `${config.keyPrefix}:${identifier}`;
  const now = new Date();
  const windowStart = new Date(now.getTime() - config.windowMs);

  try {
    // Clean up old entries first
    await supabaseAdmin
      .from('api_cache')
      .delete()
      .eq('cache_key', cacheKey)
      .lt('expires_at', windowStart.toISOString());

    // Get current request count in window
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('api_cache')
      .select('data, created_at')
      .eq('cache_key', cacheKey)
      .gte('created_at', windowStart.toISOString())
      .order('created_at', { ascending: false });

    if (fetchError !== null) {
      console.error(
        'Rate limit fetch error:',
        fetchError.message ?? 'Unknown error',
      );
      return {
        allowed: true, // Fail open
        remaining: config.maxRequests - 1,
        resetTime: new Date(now.getTime() + config.windowMs),
        error: 'Rate limit check failed',
      };
    }

    const requestCount = existing?.length ?? 0;

    if (requestCount >= config.maxRequests) {
      // Rate limit exceeded
      const oldestRequest = existing?.[existing.length - 1];
      const resetTime =
        oldestRequest !== null &&
        oldestRequest !== undefined &&
        oldestRequest.created_at !== null &&
        oldestRequest.created_at !== undefined
          ? new Date(
              new Date(oldestRequest.created_at).getTime() + config.windowMs,
            )
          : new Date(now.getTime() + config.windowMs);

      return {
        allowed: false,
        remaining: 0,
        resetTime,
      };
    }

    // Record this request
    const { error: insertError } = await supabaseAdmin
      .from('api_cache')
      .insert({
        cache_key: cacheKey,
        data: JSON.stringify({ timestamp: now.toISOString() }),
        expires_at: new Date(now.getTime() + config.windowMs).toISOString(),
      });

    if (insertError !== null) {
      console.error('Rate limit insert error:', insertError);
      return {
        allowed: true, // Fail open
        remaining: config.maxRequests - requestCount - 1,
        resetTime: new Date(now.getTime() + config.windowMs),
        error: 'Rate limit update failed',
      };
    }

    return {
      allowed: true,
      remaining: config.maxRequests - requestCount - 1,
      resetTime: new Date(now.getTime() + config.windowMs),
    };
  } catch (error) {
    console.error('Rate limiting error:', error);
    return {
      allowed: true, // Fail open for availability
      remaining: config.maxRequests - 1,
      resetTime: new Date(now.getTime() + config.windowMs),
      error: 'Rate limit system error',
    };
  }
}

/**
 * Extract IP address from request, handling proxies
 */
export function getClientIP(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');

  // Try different headers in order of preference
  if (cfConnectingIP !== null && cfConnectingIP !== undefined)
    return cfConnectingIP;
  if (realIP !== null && realIP !== undefined) return realIP;
  if (forwardedFor !== null && forwardedFor !== undefined) {
    // x-forwarded-for can be a comma-separated list
    const ips = forwardedFor.split(',').map((ip) => ip.trim());
    return ips[0] || 'unknown'; // First IP is usually the client
  }

  return 'unknown';
}

/**
 * Apply rate limiting to a request
 */
export async function applyRateLimit(
  request: Request,
  userId?: string,
): Promise<{
  allowed: boolean;
  headers: Record<string, string>;
  error?: string;
}> {
  const ip = getClientIP(request);
  const results = await Promise.all([
    // Check both user and IP limits
    userId
      ? checkRateLimit(userId, 'notifications_per_user')
      : Promise.resolve(undefined),
    checkRateLimit(ip, 'notifications_per_ip'),
  ]);

  const [userLimit, ipLimit] = results;

  // If either limit is exceeded, deny the request
  const allowed = (userLimit?.allowed ?? true) && ipLimit.allowed;
  const mostRestrictive =
    userLimit && userLimit.remaining < ipLimit.remaining ? userLimit : ipLimit;

  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(
      DEFAULT_CONFIGS.notifications_per_user.maxRequests,
    ),
    'X-RateLimit-Remaining': String(mostRestrictive.remaining),
    'X-RateLimit-Reset': Math.ceil(
      mostRestrictive.resetTime.getTime() / MILLISECONDS_PER_SECOND,
    ).toString(),
  };

  if (!allowed) {
    headers['Retry-After'] = Math.ceil(
      (mostRestrictive.resetTime.getTime() - Date.now()) /
        MILLISECONDS_PER_SECOND,
    ).toString();
  }

  return {
    allowed,
    headers,
    ...(allowed ? {} : { error: 'Rate limit exceeded' }),
  };
}
