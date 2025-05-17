import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function getUserSubscription(
  userId: string,
  collectiveId: string
) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options) {
          cookieStore.set(name, value, options);
        },
        remove(name: string, options) {
          cookieStore.set(name, "", options);
        },
      },
    }
  );
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .eq("target_entity_type", "collective")
    .eq("target_entity_id", collectiveId)
    .eq("status", "active")
    .maybeSingle();
  if (error) throw error;
  return !!data;
}
