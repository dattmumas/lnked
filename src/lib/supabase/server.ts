import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

interface CookieKV {
  name: string;
  value: string;
  options?: Record<string, unknown>;
}

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: (): CookieKV[] =>
          cookieStore.getAll().map(
            (c: { name: string; value: string }): CookieKV => ({
              name: c.name,
              value: c.value,
            })
          ),
        setAll: (newCookies: CookieKV[]): void => {
          newCookies.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );
}
