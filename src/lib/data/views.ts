import { createServerSupabaseClient } from "@/lib/supabase/server";

interface LogPostViewArgs {
  postId: string;
  userId?: string | null;
}

export async function logPostView({ postId, userId }: LogPostViewArgs) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("post_views")
    .insert([{ post_id: postId, user_id: userId || null }])
    .select()
    .single();
  if (error) throw error;
  return data;
}
