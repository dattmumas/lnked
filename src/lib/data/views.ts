import { Database } from "@/lib/database.types";
import { createServerSupabaseClient } from "@/lib/supabase/server";


type PostViewRow = Database["public"]["Tables"]["post_views"]["Row"];

interface LogPostViewArgs {
  postId: string;
  userId?: string | undefined;
}

export async function logPostView(
  { postId, userId }: LogPostViewArgs
): Promise<PostViewRow> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("post_views")
    .insert([{ post_id: postId, user_id: userId ?? undefined }])
    .select()
    .single();
  if (error) throw error;
  return data as PostViewRow;
}
