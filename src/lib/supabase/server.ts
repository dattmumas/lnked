import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "../database.types";

export async function createServerSupabaseClient() {
  // Debug: log env vars and Supabase client creation
  console.log("SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log("SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  const cookieStore = await cookies();

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: async (name) => {
          return (await cookieStore.get(name))?.value;
        },
      },
    }
  );

  console.log("supabase.auth", supabase.auth);
  return supabase;
}
