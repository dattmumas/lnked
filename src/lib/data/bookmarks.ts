import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

interface ToggleBookmarkArgs {
  postId: string;
  userId: string;
}

export async function toggleBookmark({ postId, userId }: ToggleBookmarkArgs) {
  const supabase = await createServerSupabaseClient();
  // Check if bookmark exists
  const { data: existing } = await supabase
    .from("post_bookmarks")
    .select("*")
    .eq("post_id", postId)
    .eq("user_id", userId)
    .single();

  if (existing) {
    // Remove bookmark
    const { error } = await supabase
      .from("post_bookmarks")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", userId);
    if (error) throw error;
    return { removed: true };
  } else {
    // Add bookmark
    const { data, error } = await supabase
      .from("post_bookmarks")
      .insert([{ post_id: postId, user_id: userId }])
      .select()
      .single();
    if (error) throw error;
    return { added: true, data };
  }
}

export async function getBookmarksForUser(userId: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("post_bookmarks")
    .select(`post_id, created_at, posts:posts(*)`)
    .eq("user_id", userId);
  if (error) throw error;
  return data;
}
