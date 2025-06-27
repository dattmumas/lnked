import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";

import type { Database } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

type CookieOptions = Partial<{
  domain: string;
  expires: Date;
  httpOnly: boolean;
  maxAge: number;
  path: string;
  priority: 'low' | 'medium' | 'high';
  sameSite: 'strict' | 'lax' | 'none';
  secure: boolean;
}>;

/**
 * Create a request-scoped Supabase client using React's cache function
 * This ensures we only create one client per request, improving performance
 * while maintaining proper session context through cookies
 */
export const createServerSupabaseClient = cache(async (): Promise<SupabaseClient<Database>> => {
  const cookieStore = await cookies();

  const url = process.env['NEXT_PUBLIC_SUPABASE_URL']!;
  const key = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!;

  return createServerClient<Database>(
    url,
    key,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options?: CookieOptions) {
          try {
            cookieStore.set(name, value, options ?? {});
          } catch {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove(name: string, options?: CookieOptions) {
          try {
            cookieStore.set(name, '', { ...options, maxAge: 0 });
          } catch {
            // The `remove` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    },
  );
});

// Create a service role client for admin operations
export const createServerSupabaseAdminClient = cache(async (): Promise<SupabaseClient<Database>> => {
  const cookieStore = await cookies();

  const url = process.env['NEXT_PUBLIC_SUPABASE_URL']!;
  const key = process.env['SUPABASE_SERVICE_ROLE_KEY']!;

  return createServerClient<Database>(
    url,
    key,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options?: CookieOptions) {
          try {
            cookieStore.set(name, value, options ?? {});
          } catch {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove(name: string, options?: CookieOptions) {
          try {
            cookieStore.set(name, '', { ...options, maxAge: 0 });
          } catch {
            // The `remove` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    },
  );
});
