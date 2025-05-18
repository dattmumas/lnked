import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

interface AddCommentArgs {
  postId: string;
  userId: string;
  content: string;
  parentId?: string;
}

export async function getCommentsByPostId(postId: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("comments")
    .select(
      `
      *,
      user:users(*),
      reactions:comment_reactions(*)
    `
    )
    .eq("post_id", postId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function addComment({
  postId,
  userId,
  content,
  parentId,
}: AddCommentArgs) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("comments")
    .insert([
      {
        post_id: postId,
        user_id: userId,
        content,
        parent_id: parentId || null,
      },
    ])
    .select()
    .single();
  if (error) throw error;
  return data;
}
