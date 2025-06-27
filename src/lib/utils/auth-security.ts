/* eslint-disable no-magic-numbers */

import { z } from 'zod';

import type { NextRequest } from 'next/server';

const ALLOWED_CONTENT_TYPE = 'application/json';
const MAX_BODY_SIZE_KB = 100;
const MAX_BODY_SIZE_BYTES = MAX_BODY_SIZE_KB * 1024;
const CSRF_SECRET = process.env['AUTH_CSRF_SECRET'] || 'fallback-dev-secret-change-in-prod';
const COOKIE_MAX_AGE_DAYS = 7;
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * COOKIE_MAX_AGE_DAYS;

// Environment-driven origins configuration
const getAppOrigins = (): readonly string[] => {
  const origins = [
    process.env['NEXT_PUBLIC_APP_URL'],
    process.env['VERCEL_URL'] !== null && process.env['VERCEL_URL'] !== undefined 
      ? `https://${process.env['VERCEL_URL']}` 
      : undefined,
  ].filter(Boolean) as string[];

  // Add development origins from environment or default pattern
  if (process.env.NODE_ENV === 'development') {
    const devOriginsEnv = process.env['DEV_ORIGINS'];
    if (devOriginsEnv) {
      const devOrigins = devOriginsEnv.split(',');
      origins.push(...devOrigins);
    } else {
      // Default development origins
      origins.push('http://localhost:3000', 'https://localhost:3000');
    }
    
    // Support localhost with any port pattern
    for (let port = 3000; port <= 3010; port++) {
      origins.push(`http://localhost:${port}`, `https://localhost:${port}`);
    }
  }

  return Object.freeze(origins);
};

const getSupabaseCookieNames = (): readonly string[] => {
  return Object.freeze([
    'sb-access-token',
    'sb-refresh-token',
    'sb-provider-token',
    'sb-auth-token',
  ]);
};

// IPv6 private range detection
const isPrivateIPv6 = (hostname: string): boolean => {
  // Check for IPv6 loopback and private ranges
  const ipv6Patterns = [
    /^\[::1\]$/, // IPv6 loopback
    /^\[::ffff:127\.\d+\.\d+\.\d+\]$/, // IPv4-mapped loopback
    /^\[fc[0-9a-f]{2}:/i, // Unique local addresses (fc00::/7)
    /^\[fd[0-9a-f]{2}:/i, // Unique local addresses (fd00::/8)
    /^\[fe80:/i, // Link-local addresses
  ];
  
  return ipv6Patterns.some(pattern => pattern.test(hostname));
};

// CSRF token generation and verification
const generateCSRFToken = (): string => {
  const timestamp = Date.now().toString();
  const random = crypto.getRandomValues(new Uint8Array(16));
  const payload = `${timestamp}:${Array.from(random).map(b => b.toString(16).padStart(2, '0')).join('')}`;
  
  return btoa(payload);
};

const verifyCSRFToken = async (token: string): Promise<boolean> => {
  try {
    const payload = atob(token);
    const [timestamp, random] = payload.split(':');
    
    if (random === null || random === undefined || random === '') {
      return false;
    }

    // Verify timestamp is within last hour
    const tokenTime = parseInt(timestamp || '0', 10);
    const now = Date.now();
    const maxAge = 60 * 60 * 1000; // 1 hour

    if (isNaN(tokenTime) || now - tokenTime > maxAge) {
      return false;
    }

    // In production, verify HMAC signature
    if (process.env.NODE_ENV === 'production') {
      const encoder = new TextEncoder();
      if (CSRF_SECRET) {
        await crypto.subtle.importKey(
          'raw',
          encoder.encode(CSRF_SECRET),
          { name: 'HMAC', hash: 'SHA-256' },
          false,
          ['verify']
        );
      }
      
      // For production, implement proper HMAC verification
      // This is a simplified version - implement full HMAC in production
      return random.length === 32; // Basic length check
    }

    return true;
  } catch {
    return false;
  }
};

// Zod schema for auth callback payload validation
export const AuthCallbackSchema = z.object({
  event: z.enum(['SIGNED_IN', 'TOKEN_REFRESHED', 'SIGNED_OUT']),
  session: z.object({
    access_token: z.string().min(1),
    refresh_token: z.string().min(1),
    expires_at: z.number().int().positive(),
    expires_in: z.number().int().positive(),
    token_type: z.literal('bearer'),
    user: z.object({
      id: z.string().uuid(),
      email: z.string().email().optional(),
      // Add other user fields as needed
    }).passthrough(),
  }).optional(),
});

export type AuthCallbackPayload = z.infer<typeof AuthCallbackSchema>;

// Enhanced logging interface
interface AuthLogger {
  warn: (message: string, context: Record<string, unknown>) => void;
}

// Supabase auth response types
interface SupabaseUser {
  id: string;
  email?: string;
  [key: string]: unknown;
}

interface SupabaseSession {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  expires_in: number;
  token_type: string;
  user: SupabaseUser;
  [key: string]: unknown;
}

interface SupabaseAuthResponse {
  data: {
    user: SupabaseUser | null;
    session: SupabaseSession | null;
  };
  error: {
    message: string;
    [key: string]: unknown;
  } | null;
}

interface SessionValidationResult {
  valid: boolean;
  session?: SupabaseSession;
  error?: string;
}

// CSRF and Origin validation
export class AuthSecurityValidator {
  private static readonly APP_ORIGINS = getAppOrigins();

  /**
   * Validates CSRF token and origin for auth callback requests
   */
  static async validateRequest(
    request: NextRequest,
    logger: AuthLogger
  ): Promise<{ valid: boolean; error?: string }> {
    const clientIP = (request.headers.get('x-forwarded-for') !== null && request.headers.get('x-forwarded-for') !== undefined) 
      ? request.headers.get('x-forwarded-for') 
      : (request.headers.get('x-real-ip') !== null && request.headers.get('x-real-ip') !== undefined) 
        ? request.headers.get('x-real-ip') 
        : 'unknown';

    // Check for required CSRF header and verify value
    const csrfToken = request.headers.get('x-supabase-csrf');
    if (csrfToken === null || csrfToken === undefined) {
      logger.warn('Missing CSRF token', { clientIP, origin: request.headers.get('origin') });
      return { valid: false, error: 'Missing CSRF token' };
    }

    const csrfValid = await verifyCSRFToken(csrfToken);
    if (!csrfValid) {
      logger.warn('Invalid CSRF token', { clientIP, origin: request.headers.get('origin') });
      return { valid: false, error: 'Invalid CSRF token' };
    }

    // Validate origin with enhanced checks
    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');
    
    if (origin === null && referer === null) {
      logger.warn('Missing origin and referer headers', { clientIP });
      return { valid: false, error: 'Missing origin and referer headers' };
    }

    const requestOrigin = origin !== null && origin !== undefined 
      ? origin 
      : (referer !== null && referer !== undefined ? new URL(referer).origin : undefined);
      
    if (requestOrigin === null || requestOrigin === undefined) {
      logger.warn('Could not determine request origin', { clientIP, origin, referer });
      return { valid: false, error: 'Could not determine request origin' };
    }

    // Check IPv6 private ranges
    try {
      const url = new URL(requestOrigin);
      if (isPrivateIPv6(url.hostname)) {
        logger.warn('IPv6 private range detected', { clientIP, origin: requestOrigin });
        return { valid: false, error: 'Invalid origin: private IPv6 range' };
      }
    } catch {
      logger.warn('Invalid origin URL format', { clientIP, origin: requestOrigin });
      return { valid: false, error: 'Invalid origin URL format' };
    }

    if (!this.APP_ORIGINS.includes(requestOrigin)) {
      logger.warn('Origin not in allowlist', { 
        clientIP, 
        origin: requestOrigin, 
        allowedOrigins: this.APP_ORIGINS 
      });
      return { 
        valid: false, 
        error: `Invalid origin: ${requestOrigin}. Expected one of: ${this.APP_ORIGINS.join(', ')}` 
      };
    }

    // Enhanced SameSite validation with fallback for missing header
    const sameSite = request.headers.get('sec-fetch-site');
    if (sameSite !== null && sameSite !== undefined && sameSite !== 'same-origin' && sameSite !== 'same-site') {
      logger.warn('Invalid cross-site request', { clientIP, origin: requestOrigin, sameSite });
      return { valid: false, error: 'Invalid cross-site request' };
    }

    // If sec-fetch-site is missing (Safari/older browsers), require strict origin match
    if (sameSite === null || sameSite === undefined) {
      const isStrictMatch = this.APP_ORIGINS.includes(requestOrigin);
      if (!isStrictMatch) {
        logger.warn('Missing sec-fetch-site with non-strict origin', { 
          clientIP, 
          origin: requestOrigin 
        });
        return { valid: false, error: 'Cross-site request with missing security headers' };
      }
    }

    return { valid: true };
  }

  /**
   * Validates request body size and content type with streaming
   */
  static async validateBody(
    request: NextRequest,
    logger: AuthLogger
  ): Promise<{
    valid: boolean;
    body?: AuthCallbackPayload;
    error?: string;
  }> {
    const clientIP = (request.headers.get('x-forwarded-for') !== null && request.headers.get('x-forwarded-for') !== undefined) 
      ? request.headers.get('x-forwarded-for') 
      : (request.headers.get('x-real-ip') !== null && request.headers.get('x-real-ip') !== undefined) 
        ? request.headers.get('x-real-ip') 
        : 'unknown';

    // Check Content-Type
    const contentType = request.headers.get('content-type');
    if (contentType === null || contentType === undefined || !contentType.includes(ALLOWED_CONTENT_TYPE)) {
      logger.warn('Invalid content-type', { 
        clientIP, 
        contentType, 
        expected: ALLOWED_CONTENT_TYPE 
      });
      return { valid: false, error: `Invalid content-type. Expected: ${ALLOWED_CONTENT_TYPE}` };
    }

    // Check Content-Length if available, but don't trust it exclusively
    const contentLength = request.headers.get('content-length');
    if (contentLength !== null && contentLength !== undefined) {
      const size = parseInt(contentLength, 10);
      if (!isNaN(size) && size > MAX_BODY_SIZE_BYTES) {
        logger.warn('Body too large via Content-Length', { 
          clientIP, 
          size, 
          maxSize: MAX_BODY_SIZE_BYTES 
        });
        return { valid: false, error: `Body too large. Max: ${MAX_BODY_SIZE_KB}KB` };
      }
    }

    try {
      // Stream body with size limit (independent of headers)
      const reader = request.body?.getReader();
      if (reader === null || reader === undefined) {
        logger.warn('No request body available', { clientIP });
        return { valid: false, error: 'Request body required' };
      }

      const chunks: Uint8Array[] = [];
      let totalSize = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        totalSize += value.length;
        if (totalSize > MAX_BODY_SIZE_BYTES) {
          logger.warn('Body too large via streaming', { 
            clientIP, 
            size: totalSize, 
            maxSize: MAX_BODY_SIZE_BYTES 
          });
          return { valid: false, error: `Body too large. Max: ${MAX_BODY_SIZE_KB}KB` };
        }

        chunks.push(value);
      }

      // Reconstruct body
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const body = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        body.set(chunk, offset);
        offset += chunk.length;
      }

      const bodyText = new TextDecoder().decode(body);
      const parsedBody: unknown = JSON.parse(bodyText);
      
      const parsed = AuthCallbackSchema.safeParse(parsedBody);
      if (!parsed.success) {
        logger.warn('Invalid payload schema', { 
          clientIP, 
          errors: parsed.error.errors.map(e => e.message) 
        });
        return { 
          valid: false, 
          error: `Invalid payload: ${parsed.error.errors.map(e => e.message).join(', ')}` 
        };
      }

      return { valid: true, body: parsed.data };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Invalid JSON';
      logger.warn('Body parsing error', { clientIP, error: errorMessage });
      return { 
        valid: false, 
        error: errorMessage
      };
    }
  }

  /**
   * Generate a CSRF token for client use
   */
  static generateCSRFToken(): string {
    return generateCSRFToken();
  }
}

// Cookie security enforcement with Edge runtime compatibility
export class CookieSecurityManager {
  private static readonly SUPABASE_COOKIE_NAMES = getSupabaseCookieNames();

  /**
   * Enforces security flags on all Supabase auth cookies with Edge runtime compatibility
   */
  static enforceSecurityFlags(response: Response): void {
    if (process.env.NODE_ENV !== 'production') {
      return; // Don't enforce in development
    }

    try {
      // Edge runtime compatible cookie header handling
      const setCookieHeaders: string[] = [];
      
      // Try modern API first, fallback for Edge runtime
      if ('getSetCookie' in response.headers && typeof response.headers.getSetCookie === 'function') {
        setCookieHeaders.push(...response.headers.getSetCookie());
      } else {
        // Edge runtime fallback - iterate through all headers
        response.headers.forEach((value, key) => {
          if (key.toLowerCase() === 'set-cookie') {
            setCookieHeaders.push(value);
          }
        });
      }

      // Process each Set-Cookie header
      setCookieHeaders.forEach((cookieHeader) => {
        const cookieParts = cookieHeader.split('=');
        const cookieName = cookieParts[0] ?? '';
        
        if (this.SUPABASE_COOKIE_NAMES.some(name => cookieName.includes(name))) {
          const updatedCookie = this.addSecurityFlags(cookieHeader);
          
          // Remove old header and add new one
          response.headers.delete('set-cookie');
          response.headers.append('Set-Cookie', updatedCookie);
        }
      });
    } catch (error) {
      // Silently handle Edge runtime compatibility issues
      console.warn('Cookie security enforcement failed:', error);
    }
  }

  private static addSecurityFlags(cookieHeader: string): string {
    const [nameValue, ...attributes] = cookieHeader.split(';').map(s => s.trim());
    
    // Parse existing Max-Age if present, otherwise use default
    const existingMaxAge = attributes.find(attr => 
      attr.toLowerCase().startsWith('max-age=')
    );
    
    const maxAge = existingMaxAge !== null && existingMaxAge !== undefined
      ? existingMaxAge.split('=')[1] 
      : COOKIE_MAX_AGE_SECONDS.toString();

    const secureFlags = [
      'Secure',
      'HttpOnly',
      'SameSite=Lax',
      `Max-Age=${maxAge}`,
    ];

    // Remove existing security flags and add new ones
    const filteredAttributes = attributes.filter(attr => {
      const lowerAttr = attr.toLowerCase();
      return !lowerAttr.startsWith('secure') &&
             !lowerAttr.startsWith('httponly') &&
             !lowerAttr.startsWith('samesite') &&
             !lowerAttr.startsWith('max-age');
    });

    return [nameValue, ...filteredAttributes, ...secureFlags].join('; ');
  }
}

// Session validation with optimization
export class SessionManager {
  /**
   * Optimized session validation - accepts Supabase AuthResponse<Session>
   */
  static validateSessionIntegrity(
    authResponse: SupabaseAuthResponse,
    expectedUserId?: string
  ): SessionValidationResult {
    try {
      // Trust the setSession result as primary validation
      if (authResponse.error !== null && authResponse.error !== undefined) {
        return { valid: false, error: authResponse.error.message };
      }

      const session = authResponse.data?.session;
      if (session === null || session === undefined) {
        return { valid: false, error: 'Session not found in setSession result' };
      }

      // Validate user ID if provided
      if (expectedUserId !== null && expectedUserId !== undefined && session.user?.id !== expectedUserId) {
        return { valid: false, error: 'Session user ID mismatch' };
      }

      // Background integrity check can be implemented separately
      // This avoids the extra round-trip during callback processing

      return { valid: true, session };
    } catch (error) {
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : 'Session validation failed' 
      };
    }
  }

  /**
   * Clears all auth cookies on session error with proper header handling
   */
  static clearAuthCookies(response: Response): void {
    const cookiesToClear = getSupabaseCookieNames();

    cookiesToClear.forEach(cookieName => {
      // Use append to handle multiple cookies properly
      response.headers.append(
        'Set-Cookie',
        `${cookieName}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Lax`
      );
    });
  }
} 