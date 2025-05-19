import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getUserSubscription(
  userId: string,
  collectiveId: string
) {
  const supabase = await createServerSupabaseClient();
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
