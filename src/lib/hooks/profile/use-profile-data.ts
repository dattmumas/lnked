import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { HttpStatusCode } from '@/lib/constants/errors';
import {
  PAGE_LIMIT_DEFAULT,
  PROFILE_STALE_MS,
  PROFILE_GC_MS,
  METRICS_STALE_MS,
  METRICS_GC_MS,
  FOLLOW_STATUS_STALE_MS,
  FOLLOW_STATUS_GC_MS,
  POSTS_STALE_MS,
  POSTS_GC_MS,
  SOCIAL_FEED_STALE_MS,
  SOCIAL_FEED_GC_MS,
  SOCIAL_FEED_REFRESH_MS,
  SECOND_MS,
  PROFILE_RETRY_LIMIT,
  RETRY_LIMIT_SHORT,
} from '@/lib/constants/profile';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

import {
  Profile,
  ProfileMetrics,
  ProfilePost,
  ActivityFeedItem,
  UserConnection,
  ContentFilters,
  SocialFeedType,
  PaginatedResponse,
  FollowMutationVariables,
  UpdateProfileVariables,
  UseProfileReturn,
  UseProfileMetricsReturn,
  UseFollowStatusReturn,
  UseProfilePostsReturn,
  UseSocialFeedReturn,
  ProfileError,
  NotFoundError,
  PermissionError,
  SocialLinks,
} from './types';

import type { Database } from '@/lib/database.types';
import type { UseMutationResult } from '@tanstack/react-query';



// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------
/** Explicit existence check (avoids strict‑boolean‑expressions noise) */
const exists = (v: unknown): boolean => v !== undefined && v !== '';

type DBUser = Database['public']['Tables']['users']['Row'];
type Json = Database['public']['Tables']['users']['Row']['social_links'];

// Query key factories
export const profileKeys = {
  all: ['profiles'] as const,
  profile: (username: string) => [...profileKeys.all, 'profile', username] as const,
  metrics: (username: string) => [...profileKeys.all, 'metrics', username] as const,
  followStatus: (username: string) => [...profileKeys.all, 'followStatus', username] as const,
  posts: (username: string, filters: ContentFilters) => [...profileKeys.all, 'posts', username, filters] as const,
  socialFeed: (username: string, feedType: SocialFeedType) => [...profileKeys.all, 'socialFeed', username, feedType] as const,
};

// Data fetching functions
async function fetchProfile(username: string): Promise<Profile> {
  const supabase = createSupabaseBrowserClient();
  
  const { data, error } = await supabase
    .from('users')
    .select(`
      id,
      username,
      full_name,
      bio,
      avatar_url,
      cover_image_url,
      social_links,
      is_profile_public,
      show_comments,
      show_followers,
      show_subscriptions,
      tags,
      updated_at
    `)
    .eq('username', username)
    .single();

  if (error !== null && error !== undefined) {
    if (error.code === 'PGRST116') {
      throw new NotFoundError('Profile');
    }
    throw new ProfileError('Failed to fetch profile', error.code, HttpStatusCode.InternalServerError);
  }

  // Validate that username exists since it's required for Profile interface
  if (data.username === null || data.username === undefined || data.username === '') {
    throw new ProfileError('Profile missing username', 'INVALID_PROFILE', HttpStatusCode.UnprocessableEntity);
  }

  return {
    id: data.id,
    username: data.username,
    fullName: data.full_name,
    bio: data.bio,
    avatarUrl: data.avatar_url,
    coverImageUrl: data.cover_image_url,
    socialLinks: data.social_links as SocialLinks | null,
    isProfilePublic: data.is_profile_public ?? true,
    showComments: data.show_comments ?? true,
    showFollowers: data.show_followers ?? true,
    showSubscriptions: data.show_subscriptions ?? true,
    tags: data.tags,
    createdAt: data.updated_at ?? new Date().toISOString(), // Use updated_at as created_at fallback
    updatedAt: data.updated_at,
  };
}

async function fetchProfileMetrics(username: string): Promise<ProfileMetrics> {
  const supabase = createSupabaseBrowserClient();
  
  // Get user ID first
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('username', username)
    .single();

  if (user === null || user === undefined) {
    throw new NotFoundError('Profile');
  }

  // Fetch metrics in parallel
  const [followersResult, followingResult, postsResult] = await Promise.all([
    // Follower count
    supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', user.id)
      .eq('following_type', 'user'),
    
    // Following count  
    supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', user.id)
      .eq('following_type', 'user'),
    
    // Post counts by type
    supabase
      .from('posts')
      .select('post_type, view_count, like_count')
      .eq('author_id', user.id)
      .eq('status', 'active')
      .eq('is_public', true)
  ]);

  const followerCount = followersResult.count ?? 0;
  const followingCount = followingResult.count ?? 0;
  
  // Calculate post counts and totals
  const posts = postsResult.data ?? [];
  const postCounts = posts.reduce((acc, post) => {
    const type = post.post_type === 'video' ? 'video' : 'writing'; // text -> writing for UI
    acc[type] += 1;
    acc.total += 1;
    return acc;
  }, { writing: 0, video: 0, total: 0 });

  const totalViews = posts.reduce((sum, post) => sum + (post.view_count ?? 0), 0);
  const totalLikes = posts.reduce((sum, post) => sum + (post.like_count ?? 0), 0);

  return {
    followerCount,
    followingCount,
    postCounts,
    totalViews,
    totalLikes,
  };
}

async function fetchFollowStatus(username: string): Promise<{ isFollowing: boolean }> {
  const supabase = createSupabaseBrowserClient();
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (user === null || user === undefined) {
    return { isFollowing: false };
  }

  // Get target user ID
  const { data: targetUser } = await supabase
    .from('users')
    .select('id, username')
    .eq('username', username)
    .single();

  if (targetUser === null || targetUser === undefined) {
    throw new NotFoundError('Profile');
  }

  // Can't follow yourself - return false immediately
  if (targetUser.id === user.id) {
    return { isFollowing: false };
  }

  // Check if following
  const { data } = await supabase
    .from('follows')
    .select('*')
    .eq('follower_id', user.id)
    .eq('following_id', targetUser.id)
    .eq('following_type', 'user')
    .single();

  return { isFollowing: Boolean(data) };
}

async function fetchProfilePosts(
  username: string,
  filters: ContentFilters,
  pageParam: number = 0
): Promise<PaginatedResponse<ProfilePost>> {
  const supabase = createSupabaseBrowserClient();
  
  // Add validation for username
  if (!exists(username) || username.trim() === '') {
    throw new ProfileError('Username is required to fetch posts', 'MISSING_USERNAME', HttpStatusCode.BadRequest);
  }
  
  const limit = filters.limit ?? PAGE_LIMIT_DEFAULT;
  const offset = pageParam * limit;

  // First get the user ID by username
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('username', username)
    .single();

  if ((userError !== null && userError !== undefined) || user === null || user === undefined) {
    if (userError?.code === 'PGRST116') {
      throw new NotFoundError('Profile');
    }
    throw new ProfileError(`Failed to find user with username: ${username}`, userError?.code || 'USER_LOOKUP_FAILED', HttpStatusCode.InternalServerError);
  }

  let query = supabase
    .from('posts')
    .select(`
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
      collective:collectives!posts_collective_id_fkey (
        id,
        name,
        slug
      )
    `)
    .eq('author_id', user.id)
    .eq('status', 'active')
    .order(filters.sortBy ?? 'published_at', { ascending: filters.sortOrder === 'asc' })
    .range(offset, offset + limit - 1);

  // Apply filters
  if (exists(filters.type)) {
    query = query.eq('post_type', filters.type as NonNullable<typeof filters.type>);
  }
  
  if (exists(filters.search)) {
    query = query.textSearch('title', filters.search as string);
  }

  const { data, error, count } = await query;

  if (error !== null && error !== undefined) {
    throw new ProfileError(`Failed to fetch posts: ${error.message}`, error.code, HttpStatusCode.InternalServerError);
  }

  const posts: ProfilePost[] = (Array.isArray(data) ? data : []).map(post => ({
    id: post.id,
    title: post.title,
    content: post.content,
    subtitle: post.subtitle,
    thumbnailUrl: post.thumbnail_url,
    postType: post.post_type,
    status: post.status,
    isPublic: post.is_public,
    publishedAt: post.published_at,
    createdAt: post.created_at,
    updatedAt: post.updated_at,
    viewCount: post.view_count,
    likeCount: post.like_count,
    readTime: exists(post.content) && typeof post.content === 'string' && post.content.length > 0 ? Math.ceil(post.content.length / SECOND_MS) : undefined,
    author: {
      id: post.author?.id ?? '',
      username: post.author?.username ?? 'unknown',
      fullName: post.author?.full_name ?? '',
      avatarUrl: post.author?.avatar_url ?? '',
    },
    collective: post.collective
      ? {
          id: post.collective.id,
          name: post.collective.name,
          slug: post.collective.slug,
        }
      : undefined,
  }));

  return {
    data: posts,
    total: count ?? 0,
    limit,
    offset,
    hasMore: (count ?? 0) > offset + limit,
    nextCursor: (count ?? 0) > offset + limit ? (pageParam + 1).toString() : undefined,
  };
}

async function fetchSocialFeed(
  username: string,
  feedType: SocialFeedType,
  pageParam: number = 0
): Promise<PaginatedResponse<ActivityFeedItem | UserConnection>> {
  const supabase = createSupabaseBrowserClient();
  const limit = PAGE_LIMIT_DEFAULT;
  const offset = pageParam * limit;

  // Get user ID
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('username', username)
    .single();

  if (user === null || user === undefined) {
    throw new NotFoundError('Profile');
  }

  if (feedType === 'following') {
    // Fetch following list
    const { data, error, count } = await supabase
      .from('follows')
      .select(`
        created_at,
        following:users!following_id (
          id,
          username,
          full_name,
          avatar_url,
          bio
        )
      `)
      .eq('follower_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error !== null && error !== undefined) {
      throw new ProfileError('Failed to fetch following', error.code, HttpStatusCode.InternalServerError);
    }

    const connections: UserConnection[] = (Array.isArray(data) ? data : []).map(follow => ({
      id: ((follow.following as unknown) as DBUser).id,
      username: ((follow.following as unknown) as DBUser).username ?? 'unknown',
      fullName: ((follow.following as unknown) as DBUser).full_name ?? '',
      avatarUrl: ((follow.following as unknown) as DBUser).avatar_url ?? '',
      bio: ((follow.following as unknown) as DBUser).bio ?? '',
      isFollowing: true,
      followedAt: follow.created_at ?? '',
    }));

    return {
      data: connections,
      total: count ?? 0,
      limit,
      offset,
      hasMore: (count ?? 0) > offset + limit,
      nextCursor: (count ?? 0) > offset + limit ? (pageParam + 1).toString() : undefined,
    };
  }

  // For activity and likes, return empty for now (will implement with notifications system)
  return {
    data: [],
    total: 0,
    limit,
    offset,
    hasMore: false,
  };
}

// React Query hooks
export function useProfile(username: string): UseProfileReturn {
  const query = useQuery({
    queryKey: profileKeys.profile(username),
    queryFn: () => fetchProfile(username),
    staleTime: PROFILE_STALE_MS,
    gcTime: PROFILE_GC_MS,
    retry: (failureCount, error) => {
      // Don't retry on 404s
      if (error instanceof NotFoundError) return false;
      return failureCount < PROFILE_RETRY_LIMIT;
    },
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error ?? undefined,
    refetch: () => {
      query.refetch().catch((error) => {
        console.error('Failed to refetch profile:', error);
      });
    },
  };
}

export function useProfileMetrics(username: string): UseProfileMetricsReturn {
  const query = useQuery({
    queryKey: profileKeys.metrics(username),
    queryFn: () => fetchProfileMetrics(username),
    staleTime: METRICS_STALE_MS,
    gcTime: METRICS_GC_MS,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error ?? undefined,
  };
}

export function useFollowStatus(username: string): UseFollowStatusReturn {
  const query = useQuery({
    queryKey: profileKeys.followStatus(username),
    queryFn: () => fetchFollowStatus(username),
    staleTime: FOLLOW_STATUS_STALE_MS,
    gcTime: FOLLOW_STATUS_GC_MS,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error ?? undefined,
  };
}

export function useProfilePosts(
  username: string,
  filters: ContentFilters = {}
): UseProfilePostsReturn {
  const query = useInfiniteQuery({
    queryKey: profileKeys.posts(username, filters),
    queryFn: ({ pageParam = 0 }) => fetchProfilePosts(username, filters, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? parseInt(lastPage.nextCursor ?? '0') : undefined;
    },
    staleTime: POSTS_STALE_MS,
    gcTime: POSTS_GC_MS,
    enabled: exists(username),
    retry: (failureCount, error) => {
      // Don't retry on certain errors
      if (error instanceof NotFoundError || error instanceof ProfileError) {
        if (exists(error.message) && (error.message.includes('MISSING_USERNAME') || error.message.includes('USER_LOOKUP_FAILED'))) {
          return false;
        }
      }
      return failureCount < RETRY_LIMIT_SHORT;
    },
  });

  return {
    data: query.data?.pages?.[0], // For now, return first page
    fetchNextPage: () => {
      query.fetchNextPage().catch((error) => {
        console.error('Failed to fetch next page:', error);
      });
    },
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    isLoading: query.isLoading,
    error: query.error ?? undefined,
  };
}

export function useSocialFeed(
  username: string,
  feedType: SocialFeedType
): UseSocialFeedReturn {
  const query = useInfiniteQuery({
    queryKey: profileKeys.socialFeed(username, feedType),
    queryFn: ({ pageParam = 0 }) => fetchSocialFeed(username, feedType, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? parseInt(lastPage.nextCursor ?? '0') : undefined;
    },
    staleTime: SOCIAL_FEED_STALE_MS,
    gcTime: SOCIAL_FEED_GC_MS,
    refetchInterval: feedType === 'activity' ? SOCIAL_FEED_REFRESH_MS : undefined,
  });

  return {
    data: query.data?.pages?.[0], // For now, return first page
    fetchNextPage: () => {
      query.fetchNextPage().catch((error) => {
        console.error('Failed to fetch next page:', error);
      });
    },
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    isLoading: query.isLoading,
    error: query.error ?? undefined,
  };
}

// Mutation hooks
export function useFollowMutation(): UseMutationResult<
  { success: boolean },
  unknown,
  FollowMutationVariables,
  unknown
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ targetUsername, action }: FollowMutationVariables) => {
      const supabase = createSupabaseBrowserClient();
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (user === null || user === undefined) {
        throw new PermissionError('Must be authenticated to follow users');
      }

      // Get target user ID
      const { data: targetUser } = await supabase
        .from('users')
        .select('id')
        .eq('username', targetUsername)
        .single();

      if (targetUser === null || targetUser === undefined) {
        throw new NotFoundError('User');
      }

      if (action === 'follow') {
        const { error } = await supabase
          .from('follows')
          .insert({
            follower_id: user.id,
            following_id: targetUser.id,
            following_type: 'user',
          });

        if (error !== null && error !== undefined) {
          throw new ProfileError('Failed to follow user', error.code, HttpStatusCode.InternalServerError);
        }
      } else {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', targetUser.id)
          .eq('following_type', 'user');

        if (error !== null && error !== undefined) {
          throw new ProfileError('Failed to unfollow user', error.code, HttpStatusCode.InternalServerError);
        }
      }

      return { success: true };
    },
    onSuccess: (data, variables) => {
      // Update follow‑status cache when mutation succeeds
      if (data?.success) {
        queryClient.setQueryData(
          profileKeys.followStatus(variables.targetUsername),
          { isFollowing: variables.action === 'follow' }
        );
      }

      // Invalidate metrics so follower counts refresh
      queryClient.invalidateQueries({
        queryKey: profileKeys.metrics(variables.targetUsername),
      }).catch((error) => {
        console.error('Failed to invalidate metrics cache:', error);
      });
    },
  });
}

export function useUpdateProfileMutation(): UseMutationResult<
  Database['public']['Tables']['users']['Row'],
  unknown,
  UpdateProfileVariables,
  unknown
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ username, updates }: UpdateProfileVariables) => {
      const supabase = createSupabaseBrowserClient();
      
      // Get current user and verify permissions
      const { data: { user } } = await supabase.auth.getUser();
      if (user === null || user === undefined) {
        throw new PermissionError('Must be authenticated to update profile');
      }

      // Verify ownership
      const { data: profile } = await supabase
        .from('users')
        .select('id')
        .eq('username', username)
        .single();

      if (profile === null || profile === undefined || profile.id !== user.id) {
        throw new PermissionError('Can only update your own profile');
      }

      // Update profile
      const { data, error } = await supabase
        .from('users')
        .update({
          full_name: updates.fullName,
          bio: updates.bio,
          avatar_url: updates.avatarUrl,
          social_links: updates.socialLinks as Json,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error !== null && error !== undefined) {
        throw new ProfileError('Failed to update profile', error.code, HttpStatusCode.InternalServerError);
      }

      return data;
    },
    onSuccess: (data, variables) => {
      // Invalidate profile cache to refetch updated data
      queryClient.invalidateQueries({
        queryKey: profileKeys.profile(variables.username),
      }).catch((error) => {
        console.error('Failed to invalidate profile cache:', error);
      });
    },
  });
}