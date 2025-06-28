import { createServerClient } from '@supabase/ssr';

import type { Database } from '@/lib/database.types';

/**
 * Request-scoped Supabase client factory
 * Properly handles session context for edge runtimes and RLS
 */

let cachedClient: ReturnType<typeof createServerClient<Database>> | undefined;
let cachedRequestId: string | undefined;

/**
 * Create a session-aware Supabase client for the current request
 * Reuses the client within the same request for efficiency
 */
export function createRequestScopedSupabaseClient(request: Request): ReturnType<typeof createServerClient<Database>> {
  const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL'];
  const supabaseAnonKey = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

  if (supabaseUrl === null || supabaseUrl === undefined || supabaseAnonKey === null || supabaseAnonKey === undefined) {
    throw new Error('Missing Supabase environment variables');
  }

  // Generate a simple request ID for caching
  const requestIdHeader = request.headers.get('x-request-id');
  const cfRayHeader = request.headers.get('cf-ray');
  const requestId = requestIdHeader !== null && requestIdHeader !== undefined
    ? requestIdHeader
    : cfRayHeader !== null && cfRayHeader !== undefined
      ? cfRayHeader
      : crypto.randomUUID();

  // Return cached client if it's for the same request
  if (cachedClient !== undefined && cachedRequestId === requestId) {
    return cachedClient;
  }

  // Create new client with proper session context
  const client = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
              get(name: string) {
          try {
            const cookieHeader = request.headers.get('cookie');
            if (cookieHeader === null || cookieHeader === undefined || cookieHeader === '') return undefined;
          
          // More robust cookie parsing
          const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
            const [key, ...valueParts] = cookie.trim().split('=');
            if (key && valueParts.length > 0) {
              acc[key] = decodeURIComponent(valueParts.join('='));
            }
            return acc;
          }, {} as Record<string, string>);
          
          return cookies[name];
        } catch (error) {
          // Silent fail for cookie parsing errors
          console.warn(`Failed to parse cookie ${name}:`, error);
          return undefined;
        }
      },
      set() {
        // No-op for API routes - we don't set cookies in responses here
      },
      remove() {
        // No-op for API routes
      },
    },
    global: {
      headers: (() => {
        const headers: Record<string, string> = {};
        
        // Only add headers if they exist to avoid empty strings
        const authHeader = request.headers.get('Authorization');
        if (authHeader !== null && authHeader !== undefined && authHeader !== '') {
          headers['Authorization'] = authHeader;
        }
        
        const clientInfo = request.headers.get('X-Client-Info');
        if (clientInfo !== null && clientInfo !== undefined && clientInfo !== '') {
          headers['X-Client-Info'] = clientInfo;
        }
        
        const forwardedFor = request.headers.get('X-Forwarded-For');
        if (forwardedFor !== null && forwardedFor !== undefined && forwardedFor !== '') {
          headers['X-Forwarded-For'] = forwardedFor;
        }
        
        const userAgent = request.headers.get('User-Agent');
        if (userAgent !== null && userAgent !== undefined && userAgent !== '') {
          headers['User-Agent'] = userAgent;
        }
        
        return headers;
      })(),
    },
  });

  // Cache for this request
  cachedClient = client;
  cachedRequestId = requestId;

  return client;
}

/**
 * Create a session-aware Supabase client using Next.js cookies (for App Router)
 * Use this for routes that have access to the cookies() function
 */
export async function createServerSupabaseClientWithContext(): Promise<ReturnType<typeof createServerClient<Database>>> {
  const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL'];
  const supabaseAnonKey = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

  if (supabaseUrl === null || supabaseUrl === undefined || supabaseAnonKey === null || supabaseAnonKey === undefined) {
    throw new Error('Missing Supabase environment variables');
  }

  // Import next/headers only when needed to avoid client-side import issues
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { cookies } = require('next/headers') as typeof import('next/headers');
  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string): string | undefined {
        try {
          const cookie = cookieStore.get(name);
          return cookie?.value;
        } catch {
          return undefined;
        }
      },
      set(name: string, value: string, options: Record<string, unknown>): void {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // This can fail in middleware where cookies() is not available
        }
      },
      remove(name: string, options: Record<string, unknown>): void {
        try {
          cookieStore.set({ name, value: '', ...options });
        } catch {
          // This can fail in middleware where cookies() is not available
        }
      },
    },
  });
}

/**
 * Clear the cached client (useful for testing or explicit cleanup)
 */
export function clearClientCache(): void {
  cachedClient = undefined;
  cachedRequestId = undefined;
} 