import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "../database.types";

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: async (name) => {
          return cookieStore.get(name)?.value;
        },
        set: async (name, value, options) => {
          try {
            cookieStore.set(name, value, options);
          } catch (error) {
            // Server Component may be trying to set cookies - this is expected in some cases
            console.warn('Warning: Cannot set cookies in Server Component context');
          }
        },
        remove: async (name, options) => {
          try {
            cookieStore.set(name, '', { ...options, maxAge: 0 });
          } catch (error) {
            // Server Component may be trying to remove cookies - this is expected in some cases
            console.warn('Warning: Cannot remove cookies in Server Component context');
          }
        },
      },
    }
  );

  return supabase;
}
