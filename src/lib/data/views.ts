import { createServerSupabaseClient } from '@/lib/supabase/server';

interface LogPostViewArgs {
  postId: string;
  userId?: string | undefined;
}

export async function logPostView(
  { postId, userId }: LogPostViewArgs
): Promise<unknown> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("post_views")
    .insert([{ post_id: postId, user_id: userId }])
    .select()
    .single();
  if (error) throw error;
  return data;
}
