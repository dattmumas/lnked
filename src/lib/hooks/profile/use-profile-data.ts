import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import type {
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
} from './types';
import {
  ProfileError,
  NotFoundError,
  PermissionError,
} from './types';

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

  if (error) {
    if (error.code === 'PGRST116') {
      throw new NotFoundError('Profile');
    }
    throw new ProfileError('Failed to fetch profile', error.code);
  }

  // Validate that username exists since it's required for Profile interface
  if (!data.username) {
    throw new ProfileError('Profile missing username', 'INVALID_PROFILE');
  }

  return {
    id: data.id,
    username: data.username,
    fullName: data.full_name,
    bio: data.bio,
    avatarUrl: data.avatar_url,
    coverImageUrl: data.cover_image_url,
    socialLinks: data.social_links as any,
    isProfilePublic: data.is_profile_public ?? true,
    showComments: data.show_comments ?? true,
    showFollowers: data.show_followers ?? true,
    showSubscriptions: data.show_subscriptions ?? true,
    tags: data.tags,
    createdAt: data.updated_at || new Date().toISOString(), // Use updated_at as created_at fallback
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

  if (!user) {
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

  const totalViews = posts.reduce((sum, post) => sum + (post.view_count || 0), 0);
  const totalLikes = posts.reduce((sum, post) => sum + (post.like_count || 0), 0);

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
  if (!user) {
    return { isFollowing: false };
  }

  // Get target user ID
  const { data: targetUser } = await supabase
    .from('users')
    .select('id, username')
    .eq('username', username)
    .single();

  if (!targetUser) {
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
  if (!username || username.trim() === '') {
    throw new ProfileError('Username is required to fetch posts', 'MISSING_USERNAME');
  }
  
  const limit = filters.limit || 20;
  const offset = pageParam * limit;

  // First get the user ID by username
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('username', username)
    .single();

  if (userError || !user) {
    if (userError?.code === 'PGRST116') {
      throw new NotFoundError('Profile');
    }
    throw new ProfileError(`Failed to find user with username: ${username}`, userError?.code || 'USER_LOOKUP_FAILED');
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
    .order(filters.sortBy || 'published_at', { ascending: filters.sortOrder === 'asc' })
    .range(offset, offset + limit - 1);

  // Apply filters
  if (filters.type) {
    query = query.eq('post_type', filters.type);
  }
  
  if (filters.search) {
    query = query.textSearch('title', filters.search);
  }

  const { data, error, count } = await query;

  if (error) {
    throw new ProfileError(`Failed to fetch posts: ${error.message}`, error.code);
  }

  const posts: ProfilePost[] = (data || []).map(post => ({
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
    readTime: post.content ? Math.ceil(post.content.length / 1000) : undefined,
    author: {
      id: (post.author as any).id,
      username: (post.author as any).username,
      fullName: (post.author as any).full_name,
      avatarUrl: (post.author as any).avatar_url,
    },
    collective: post.collective ? {
      id: (post.collective as any).id,
      name: (post.collective as any).name,
      slug: (post.collective as any).slug,
    } : null,
  }));

  return {
    data: posts,
    total: count || 0,
    limit,
    offset,
    hasMore: (count || 0) > offset + limit,
    nextCursor: (count || 0) > offset + limit ? (pageParam + 1).toString() : undefined,
  };
}

async function fetchSocialFeed(
  username: string,
  feedType: SocialFeedType,
  pageParam: number = 0
): Promise<PaginatedResponse<ActivityFeedItem | UserConnection>> {
  const supabase = createSupabaseBrowserClient();
  const limit = 20;
  const offset = pageParam * limit;

  // Get user ID
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('username', username)
    .single();

  if (!user) {
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

    if (error) {
      throw new ProfileError('Failed to fetch following', error.code);
    }

    const connections: UserConnection[] = (data || []).map(follow => ({
      id: (follow.following as any).id,
      username: (follow.following as any).username,
      fullName: (follow.following as any).full_name,
      avatarUrl: (follow.following as any).avatar_url,
      bio: (follow.following as any).bio,
      isFollowing: true,
      followedAt: follow.created_at,
    }));

    return {
      data: connections,
      total: count || 0,
      limit,
      offset,
      hasMore: (count || 0) > offset + limit,
      nextCursor: (count || 0) > offset + limit ? (pageParam + 1).toString() : undefined,
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
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error) => {
      // Don't retry on 404s
      if (error instanceof NotFoundError) return false;
      return failureCount < 3;
    },
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useProfileMetrics(username: string): UseProfileMetricsReturn {
  return useQuery({
    queryKey: profileKeys.metrics(username),
    queryFn: () => fetchProfileMetrics(username),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useFollowStatus(username: string): UseFollowStatusReturn {
  return useQuery({
    queryKey: profileKeys.followStatus(username),
    queryFn: () => fetchFollowStatus(username),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
  });
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
      return lastPage.hasMore ? parseInt(lastPage.nextCursor || '0') : undefined;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    enabled: Boolean(username) && username.trim() !== '', // Only run query if username is valid
    retry: (failureCount, error) => {
      // Don't retry on certain errors
      if (error instanceof NotFoundError || error instanceof ProfileError) {
        if (error.message.includes('MISSING_USERNAME') || error.message.includes('USER_LOOKUP_FAILED')) {
          return false;
        }
      }
      return failureCount < 2;
    },
  });

  return {
    data: query.data?.pages?.[0], // For now, return first page
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    isLoading: query.isLoading,
    error: query.error,
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
      return lastPage.hasMore ? parseInt(lastPage.nextCursor || '0') : undefined;
    },
    staleTime: 30 * 1000, // 30 seconds for real-time feel
    gcTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: feedType === 'activity' ? 30 * 1000 : undefined, // Auto-refresh activity feed
  });

  return {
    data: query.data?.pages?.[0], // For now, return first page
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    isLoading: query.isLoading,
    error: query.error,
  };
}

// Mutation hooks
export function useFollowMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ targetUsername, action }: FollowMutationVariables) => {
      const supabase = createSupabaseBrowserClient();
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new PermissionError('Must be authenticated to follow users');
      }

      // Get target user ID
      const { data: targetUser } = await supabase
        .from('users')
        .select('id')
        .eq('username', targetUsername)
        .single();

      if (!targetUser) {
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

        if (error) {
          throw new ProfileError('Failed to follow user', error.code);
        }
      } else {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', targetUser.id)
          .eq('following_type', 'user');

        if (error) {
          throw new ProfileError('Failed to unfollow user', error.code);
        }
      }

      return { success: true };
    },
    onSuccess: (data, variables) => {
      // Update follow status cache
      queryClient.setQueryData(
        profileKeys.followStatus(variables.targetUsername),
        { isFollowing: variables.action === 'follow' }
      );
      
      // Invalidate metrics to refetch counts
      queryClient.invalidateQueries({
        queryKey: profileKeys.metrics(variables.targetUsername),
      });
    },
  });
}

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ username, updates }: UpdateProfileVariables) => {
      const supabase = createSupabaseBrowserClient();
      
      // Get current user and verify permissions
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new PermissionError('Must be authenticated to update profile');
      }

      // Verify ownership
      const { data: profile } = await supabase
        .from('users')
        .select('id')
        .eq('username', username)
        .single();

      if (!profile || profile.id !== user.id) {
        throw new PermissionError('Can only update your own profile');
      }

      // Update profile
      const { data, error } = await supabase
        .from('users')
        .update({
          full_name: updates.fullName,
          bio: updates.bio,
          avatar_url: updates.avatarUrl,
          social_links: updates.socialLinks as any,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        throw new ProfileError('Failed to update profile', error.code);
      }

      return data;
    },
    onSuccess: (data, variables) => {
      // Invalidate profile cache to refetch updated data
      queryClient.invalidateQueries({
        queryKey: profileKeys.profile(variables.username),
      });
    },
  });
} 