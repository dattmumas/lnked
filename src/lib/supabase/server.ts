import { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "../database.types";

export function createServerSupabaseClient(): SupabaseClient<Database> {
  const cookieStore = cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url === undefined || url === "" || anonKey === undefined || anonKey === "") {
    throw new Error("Supabase environment variables are missing");
  }

  const supabase = createServerClient<Database>(
    url,
    anonKey,
    {
      cookies: {
        get: (name) => {
          return cookieStore.get(name)?.value;
        },
        set: (name, value, options) => {
          try {
            cookieStore.set(name, value, options);
          } catch {
            // Server Component may be trying to set cookies - this is expected in some cases
            console.warn('Warning: Cannot set cookies in Server Component context');
          }
        },
        remove: (name, options) => {
          try {
            cookieStore.set(name, '', { ...options, maxAge: 0 });
          } catch {
            // Server Component may be trying to remove cookies - this is expected in some cases
            console.warn('Warning: Cannot remove cookies in Server Component context');
          }
        },
      },
    }
  );

  return supabase;
}
