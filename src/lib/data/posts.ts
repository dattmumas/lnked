import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getPostById(postId: string): Promise<unknown> {
  const supabase = createServerSupabaseClient();
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

export async function getPostBySlug(slug: string): Promise<unknown> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("posts")
    .select(
      `
      *,
      author:users(*),
      collective:collectives(*)
    `
    )
    .eq("slug", slug)
    .single();
  if (error) throw error;
  return data;
}

export async function getPostStats(postId: string): Promise<unknown> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("posts")
    .select("like_count, dislike_count, bookmark_count, view_count")
    .eq("id", postId)
    .single();
  if (error) throw error;
  return data;
}

export async function getPostStatsBySlug(slug: string): Promise<unknown> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("posts")
    .select("like_count, dislike_count, bookmark_count, view_count")
    .eq("slug", slug)
    .single();
  if (error) throw error;
  return data;
}
