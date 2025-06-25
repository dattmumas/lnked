import { createServerSupabaseClient } from "@/lib/supabase/server";

interface ToggleBookmarkArgs {
  postId: string;
  userId: string;
}

export async function toggleBookmark({ postId, userId }: ToggleBookmarkArgs): Promise<{ removed?: boolean; added?: boolean; data?: unknown }> {
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

export async function getBookmarksForUser(userId: string): Promise<unknown[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("post_bookmarks")
    .select(`post_id, created_at, posts:posts(*)`)
    .eq("user_id", userId);
  if (error) throw error;
  return data;
}

type BookmarkedPost = {
  post: {
    id: string;
    title: string;
    created_at: string;
  }
}

export async function getBookmarkedPosts(userId: string): Promise<{ id: string; title: string; created_at: string }[]> {
  const supabase = await createServerSupabaseClient();
  
  const { data, error } = await supabase
    .from("post_bookmarks")
    .select(`
      post:posts(id, title, created_at)
    `)
    .eq("user_id", userId);

  if (error !== null) {
    throw error;
  }

  return data?.map((bookmark: BookmarkedPost) => bookmark.post) || [];
}

export async function addBookmark(postId: string, userId: string): Promise<void> {
  const supabase = await createServerSupabaseClient();
  
  const { error } = await supabase
    .from("post_bookmarks")
    .insert({ post_id: postId, user_id: userId });

  if (error !== null) {
    throw error;
  }
}

export async function removeBookmark(postId: string, userId: string): Promise<void> {
  const supabase = await createServerSupabaseClient();
  
  const { error } = await supabase
    .from("post_bookmarks")
    .delete()
    .eq("post_id", postId)
    .eq("user_id", userId);

  if (error !== null) {
    throw error;
  }
}

export async function isBookmarked(postId: string, userId: string): Promise<boolean> {
  const supabase = await createServerSupabaseClient();
  
  const { data, error } = await supabase
    .from("post_bookmarks")
    .select("id")
    .eq("post_id", postId)
    .eq("user_id", userId)
    .single();

  if (error !== null && error.code !== 'PGRST116') {
    throw error;
  }

  return data !== null;
}
