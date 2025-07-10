'use client';

import { useQuery, useInfiniteQuery } from '@tanstack/react-query';

import {
  Collective,
  CollectiveMetrics,
  ProfilePost,
  PaginatedResponse,
} from '@/lib/hooks/profile/types';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

async function fetchCollectiveData(slug: string): Promise<Collective> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from('collectives')
    .select(
      'id, name, slug, description, logo_url, cover_image_url, is_public, created_at, follower_count',
    )
    .eq('slug', slug)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  // Ensure the returned data matches the Collective type, handling nulls
  return {
    id: data.id,
    name: data.name ?? '',
    slug: data.slug,
    description: data.description,
    logo_url: data.logo_url,
    cover_image_url: data.cover_image_url,
    is_public: data.is_public ?? false,
    created_at: data.created_at,
    follower_count: data.follower_count ?? 0,
  };
}

export function useCollectiveData(slug: string) {
  return useQuery<Collective, Error>({
    queryKey: ['collective', slug],
    queryFn: () => fetchCollectiveData(slug),
    enabled: Boolean(slug),
  });
}

async function fetchCollectiveMetrics(
  slug: string,
): Promise<CollectiveMetrics> {
  const supabase = createSupabaseBrowserClient();

  const { data: collective } = await supabase
    .from('collectives')
    .select('id, member_count')
    .eq('slug', slug)
    .single();

  if (!collective) {
    throw new Error('Collective not found');
  }

  const { count: postCount } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true })
    .eq('collective_id', collective.id);

  return {
    memberCount: collective.member_count ?? 0,
    postCount: postCount ?? 0,
  };
}

export function useCollectiveMetrics(slug: string) {
  return useQuery<CollectiveMetrics, Error>({
    queryKey: ['collective-metrics', slug],
    queryFn: () => fetchCollectiveMetrics(slug),
    enabled: Boolean(slug),
  });
}

async function fetchCollectiveFollowStatus(
  slug: string,
): Promise<{ isFollowing: boolean }> {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { isFollowing: false };

  const { data: collective } = await supabase
    .from('collectives')
    .select('id')
    .eq('slug', slug)
    .single();
  if (!collective) throw new Error('Collective not found');

  const { data: follow } = await supabase
    .from('follows')
    .select('*')
    .eq('follower_id', user.id)
    .eq('following_id', collective.id)
    .eq('following_type', 'collective')
    .maybeSingle();

  return { isFollowing: Boolean(follow) };
}

export function useCollectiveFollowStatus(slug: string) {
  return useQuery<{ isFollowing: boolean }, Error>({
    queryKey: ['collective-follow-status', slug],
    queryFn: () => fetchCollectiveFollowStatus(slug),
    enabled: Boolean(slug),
  });
}

async function fetchCollectivePosts(
  slug: string,
  pageParam: number = 0,
): Promise<PaginatedResponse<ProfilePost>> {
  const supabase = createSupabaseBrowserClient();
  const limit = 10;
  const offset = pageParam * limit;

  const { data: collective } = await supabase
    .from('collectives')
    .select('id')
    .eq('slug', slug)
    .single();

  if (!collective) {
    throw new Error('Collective not found');
  }

  const { data, error, count } = await supabase
    .from('posts')
    .select(
      `
      id,
      title,
      content,
      subtitle,
      thumbnail_url,
      post_type,
      status,
      is_public,
      published_at,
      created_at,
      updated_at,
      view_count,
      like_count,
      author:users!author_id (
        id,
        username,
        full_name,
        avatar_url
      ),
      video_assets:video_assets!posts_video_id_fkey (
        mux_playback_id
      )
    `,
    )
    .eq('collective_id', collective.id)
    .order('published_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(error.message);
  }

  const posts = data.map((post) => {
    const videoAsset = Array.isArray(post.video_assets)
      ? post.video_assets[0]
      : post.video_assets;
    const thumbnailUrl =
      post.post_type === 'video' && videoAsset?.mux_playback_id
        ? `https://image.mux.com/${videoAsset.mux_playback_id}/thumbnail.jpg`
        : post.thumbnail_url;

    return {
      id: post.id,
      title: post.title,
      content: post.content,
      subtitle: post.subtitle,
      thumbnailUrl,
      postType: post.post_type,
      status: post.status,
      isPublic: post.is_public,
      publishedAt: post.published_at,
      createdAt: post.created_at,
      updatedAt: post.updated_at,
      viewCount: post.view_count,
      likeCount: post.like_count ?? 0,
      author: {
        id: post.author?.id ?? '',
        username: post.author?.username ?? 'unknown',
        fullName: post.author?.full_name ?? null,
        avatarUrl: post.author?.avatar_url ?? null,
      },
    };
  }) as ProfilePost[];

  return {
    data: posts,
    total: count ?? 0,
    limit,
    offset,
    hasMore: (count ?? 0) > offset + limit,
    nextCursor: (pageParam + 1).toString(),
  };
}

export function useCollectivePosts(slug: string) {
  return useInfiniteQuery({
    queryKey: ['collective-posts', slug],
    queryFn: ({ pageParam }) => fetchCollectivePosts(slug, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore
        ? parseInt(lastPage.nextCursor ?? '0')
        : undefined;
    },
    enabled: Boolean(slug),
  });
}
