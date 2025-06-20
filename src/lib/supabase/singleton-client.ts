/* eslint-disable no-underscore-dangle, @typescript-eslint/no-unsafe-assignment */

import { createServerClient } from '@supabase/ssr';

import type { Database } from '@/lib/database.types';
import type { CookieOptions } from '@supabase/ssr';

// Singleton client promise to prevent race conditions
let clientPromise: Promise<ReturnType<typeof createServerClient<Database>>> | null = null;

// Client configuration with safer environment handling
const CLIENT_CONFIG = {
  url: (process.env.SUPABASE_URL !== null && process.env.SUPABASE_URL !== undefined && process.env.SUPABASE_URL !== '') 
    ? process.env.SUPABASE_URL 
    : (process.env.NEXT_PUBLIC_SUPABASE_URL !== null && process.env.NEXT_PUBLIC_SUPABASE_URL !== undefined && process.env.NEXT_PUBLIC_SUPABASE_URL !== '') 
      ? process.env.NEXT_PUBLIC_SUPABASE_URL 
      : '',
  anonKey: (process.env.SUPABASE_ANON_KEY !== null && process.env.SUPABASE_ANON_KEY !== undefined && process.env.SUPABASE_ANON_KEY !== '') 
    ? process.env.SUPABASE_ANON_KEY 
    : (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== null && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== undefined && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== '') 
      ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY 
      : '',
} as const;

// Validate required configuration
if (CLIENT_CONFIG.url === '' || CLIENT_CONFIG.anonKey === '') {
  throw new Error('Missing required Supabase configuration. Set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.');
}

/**
 * Cookie handler interface for request-scoped cookie operations
 */
export interface CookieHandler {
  get: (name: string) => Promise<string | null | undefined>;
  set: (name: string, value: string, options?: CookieOptions) => void;
  remove: (name: string, options?: CookieOptions) => void;
}

/**
 * Cookie options with secure defaults
 */
interface SecureCookieOptions extends CookieOptions {
  path?: string;
  domain?: string;
  maxAge?: number;
  expires?: Date;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
}

/**
 * Creates or returns the singleton Supabase client with atomic initialization
 * Prevents race conditions and resource leaks
 */
export async function getSupabaseSingleton(cookieHandler: CookieHandler): Promise<ReturnType<typeof createServerClient<Database>>> {
  if (clientPromise === null) {
    clientPromise = Promise.resolve(createServerClient<Database>(
      CLIENT_CONFIG.url,
      CLIENT_CONFIG.anonKey,
      {
        cookies: {
          get: cookieHandler.get,
          set: cookieHandler.set,
          remove: cookieHandler.remove,
        },
      }
    ));
  }

  const client = await clientPromise;

  // Hot-swap cookie callbacks without cloning client (prevents resource leaks)
  // This avoids creating multiple onAuthStateChange listeners
  if (typeof client === 'object' && client !== null && '_options' in client) {
    const clientWithOptions = client as { _options?: { cookies?: CookieHandler } };
    if (clientWithOptions._options !== null && clientWithOptions._options !== undefined) {
      clientWithOptions._options.cookies = {
        get: cookieHandler.get,
        set: cookieHandler.set,
        remove: cookieHandler.remove,
      };
    }
  }

  return client;
}

/**
 * Creates a production-safe cookie handler with header deduplication
 */
export function createCookieHandler(
  cookieStore: any, // Next.js 15 RequestCookies type
  responseRef: Response,
  verbose = false
): CookieHandler {
  // Production-safe verbose logging
  const isVerbose = verbose && process.env.NODE_ENV !== 'production';
  
  // Header deduplication map to prevent Cloudflare 8KB limit issues
  const cookieHeaders = new Map<string, string>();
  
  // Track if headers have been flushed to avoid multiple flushes
  let headersFlushed = false;

  function flushCookieHeaders(): void {
    if (headersFlushed) return;
    headersFlushed = true;
    
    // Clear existing set-cookie headers to prevent duplicates
    responseRef.headers.delete('set-cookie');
    
    // Add all cookies in deterministic order
    for (const [, cookieString] of cookieHeaders) {
      responseRef.headers.append('Set-Cookie', cookieString);
    }
  }

  // Flush headers when any Set-Cookie operation happens
  // This ensures headers are written even if response.json isn't called
  const scheduleFlush = (): void => {
    // Use setTimeout to defer header writing until current execution context completes
    setTimeout(flushCookieHeaders, 0);
  };

  return {
    get: async (name: string): Promise<string | null | undefined> => {
      try {
        // Handle Next.js 15 cookie format: CookieValue | undefined
        const cookie = cookieStore.get(name);
        // If cookie is a string (legacy), return it; if it's an object with .value, return .value; otherwise null
        return typeof cookie === 'string' ? cookie : cookie?.value ?? null;
      } catch (unknownError) {
        if (isVerbose) {
          console.warn(`Failed to get cookie ${name}:`, unknownError instanceof Error ? unknownError : new Error('Unknown cookie error'));
        }
        return null;
      }
    },
    
    set: (name: string, value: string, options?: CookieOptions): void => {
      try {
        if (isVerbose) {
          console.warn(`Setting cookie: ${name}`);
        }
        
        // Format cookie with secure defaults
        const cookieString = formatCookieWithDefaults(name, value, options);
        
        // Store in deduplication map (overwrites previous value for same name)
        cookieHeaders.set(name, cookieString);
        
        // Schedule header flush
        scheduleFlush();
      } catch (unknownError) {
        if (isVerbose) {
          console.error(`Failed to set cookie ${name}:`, unknownError instanceof Error ? unknownError : new Error('Unknown cookie error'));
        }
      }
    },
    
    remove: (name: string, options?: CookieOptions): void => {
      try {
        if (isVerbose) {
          console.warn(`Removing cookie: ${name}`);
        }
        
        const cookieString = formatCookieWithDefaults(name, '', {
          ...options,
          maxAge: 0,
          expires: new Date(0),
        });
        
        // Store in deduplication map
        cookieHeaders.set(name, cookieString);
        
        // Schedule header flush
        scheduleFlush();
      } catch (unknownError) {
        if (isVerbose) {
          console.error(`Failed to remove cookie ${name}:`, unknownError instanceof Error ? unknownError : new Error('Unknown cookie error'));
        }
      }
    },
  };
}

/**
 * Formats a cookie string with secure production defaults
 */
function formatCookieWithDefaults(name: string, value: string, options?: CookieOptions): string {
  let cookieString = `${name}=${value}`;
  
  const secureOptions: SecureCookieOptions = options !== null && options !== undefined ? options : {};
  
  // Apply secure defaults
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Default to root path if not specified
  const path = secureOptions.path !== null && secureOptions.path !== undefined ? secureOptions.path : '/';
  cookieString += `; Path=${path}`;
  
  if (secureOptions.domain !== null && secureOptions.domain !== undefined) {
    cookieString += `; Domain=${secureOptions.domain}`;
  }
  
  if (secureOptions.maxAge !== null && secureOptions.maxAge !== undefined) {
    cookieString += `; Max-Age=${secureOptions.maxAge}`;
  }
  
  if (secureOptions.expires !== null && secureOptions.expires !== undefined) {
    cookieString += `; Expires=${secureOptions.expires.toUTCString()}`;
  }
  
  if (secureOptions.httpOnly === true) {
    cookieString += '; HttpOnly';
  }
  
  if (secureOptions.secure === true) {
    cookieString += '; Secure';
  }
  
  // Security default: SameSite=Lax in production if not specified
  const sameSite = secureOptions.sameSite !== null && secureOptions.sameSite !== undefined 
    ? secureOptions.sameSite 
    : (isProduction ? 'lax' : undefined);
  if (sameSite !== null && sameSite !== undefined) {
    cookieString += `; SameSite=${sameSite}`;
  }
  
  return cookieString;
}

/**
 * Cleanup function for testing or special cases
 */
export function resetSingletonClient(): void {
  clientPromise = null;
}

/**
 * Alternative swap function for advanced use cases
 * Swaps cookie functions without creating new client instance
 */
export function swapCookieFunctions(
  client: ReturnType<typeof createServerClient<Database>>,
  handler: CookieHandler
): void {
  if (typeof client === 'object' && client !== null && '_options' in client) {
    const clientWithOptions = client as { _options?: { cookies?: CookieHandler } };
    if (clientWithOptions._options !== null && clientWithOptions._options !== undefined) {
      clientWithOptions._options.cookies = {
        get: handler.get,
        set: handler.set,
        remove: handler.remove,
      };
    }
  }
} 