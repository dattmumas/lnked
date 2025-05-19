import { createServerSupabaseClient } from "@/lib/supabase/server";

interface TogglePostReactionArgs {
  postId: string;
  userId: string;
  type: "like" | "dislike";
}

interface ToggleCommentReactionArgs {
  commentId: string;
  userId: string;
  type: "like" | "dislike";
}

export async function togglePostReaction({
  postId,
  userId,
  type,
}: TogglePostReactionArgs) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("post_reactions")
    .upsert([{ post_id: postId, user_id: userId, type }], {
      onConflict: "post_id,user_id",
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function toggleCommentReaction({
  commentId,
  userId,
  type,
}: ToggleCommentReactionArgs) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("comment_reactions")
    .upsert([{ comment_id: commentId, user_id: userId, type }], {
      onConflict: "comment_id,user_id",
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getReactionsForPost(postId: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("post_reactions")
    .select("user_id, type, created_at")
    .eq("post_id", postId);
  if (error) throw error;
  return data;
}
