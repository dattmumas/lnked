import { createServerSupabaseClient } from '@/lib/supabase/server';

import type { Database } from '@/lib/database.types';

type PostWithAuthorAndCollective =
  Database['public']['Tables']['posts']['Row'] & {
    author: Database['public']['Tables']['users']['Row'] | null;
    collective: Database['public']['Tables']['collectives']['Row'] | null;
  };

export async function getPostById(
  postId: string,
): Promise<PostWithAuthorAndCollective | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('posts')
    .select(
      `
      *,
      author:users(*),
      collective:collectives(*)
    `,
    )
    .eq('id', postId)
    .single();
  if (error) throw error;
  return data;
}

export async function getPostBySlug(
  slug: string,
): Promise<PostWithAuthorAndCollective | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('posts')
    .select(
      `
      *,
      author:users(*),
      collective:collectives(*)
    `,
    )
    .eq('slug', slug)
    .single();
  if (error) throw error;
  return data;
}

export async function getPostStats(
  postId: string,
): Promise<Partial<Database['public']['Tables']['posts']['Row']> | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('posts')
    .select('like_count, dislike_count, view_count')
    .eq('id', postId)
    .single();
  if (error) throw error;
  return data;
}

export async function getPostStatsBySlug(
  slug: string,
): Promise<Partial<Database['public']['Tables']['posts']['Row']> | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('posts')
    .select('like_count, dislike_count, view_count')
    .eq('slug', slug)
    .single();
  if (error) throw error;
  return data;
}

export async function getPostsByTenant(
  tenantId: string,
): Promise<PostWithAuthorAndCollective[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('posts')
    .select(
      `
      *,
      author:users(*),
      collective:collectives(*)
    `,
    )
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getPostsByUser(
  userId: string,
): Promise<PostWithAuthorAndCollective[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('posts')
    .select(
      `
      *,
      author:users(*),
      collective:collectives(*)
    `,
    )
    .eq('author_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getPublicPosts(): Promise<PostWithAuthorAndCollective[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('posts')
    .select(
      `
      *,
      author:users(*),
      collective:collectives(*)
    `,
    )
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return data || [];
}
