import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

export async function getPostById(postId: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("posts")
    .select(
      `
      *,
      author:users(*),
      collective:collectives(*)
    `
    )
    .eq("id", postId)
    .single();
  if (error) throw error;
  return data;
}

export async function getPostStats(postId: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("posts")
    .select("like_count, dislike_count, bookmark_count, view_count")
    .eq("id", postId)
    .single();
  if (error) throw error;
  return data;
}
