// Tenant-Aware Feed Hook
// Provides tenant-scoped content feed with proper access control

'use client';

import { useQuery } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useMemo } from 'react';

import { useTenant } from '@/providers/TenantProvider';

import type { FeedItem } from '@/types/home/types';

// =============================================================================
// TYPES
// =============================================================================

interface TenantFeedOptions {
  limit?: number;
  status?: 'all' | 'published' | 'draft';
  author_id?: string;
  includeCollectives?: boolean; // Include posts from user's collectives
  includeFollowed?: boolean; // Include posts from followed users
  initialData?: FeedItem[]; // Initial data from server
}

interface TenantFeedPost {
  id: string;
  title: string;
  subtitle?: string;
  content: string;
  author_id: string;
  tenant_id: string;
  collective_id?: string;
  is_public: boolean;
  status: string;
  post_type: 'text' | 'video';
  view_count: number;
  like_count: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
  published_at?: string;
  thumbnail_url?: string | null;
  video?: {
    id: string;
    mux_playback_id: string | null;
    status: string | null;
    duration: number | null;
    is_public: boolean | null;
  } | null;
  author: {
    id: string;
    username: string;
    full_name: string;
    avatar_url?: string;
  };
  tenant: {
    id: string;
    name: string;
    slug: string;
    type: 'personal' | 'collective';
  };
}

interface TenantFeedResponse {
  posts: TenantFeedPost[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
  meta: {
    tenant_id: string;
    user_role: string;
    status_filter: string;
  };
}

export interface UseTenantFeedReturn {
  // Data
  feedItems: FeedItem[];

  // Loading states
  isLoading: boolean;
  isFetching: boolean;

  // Error handling
  error: string | null;

  // Actions
  refetch: () => void;
  loadMore: () => void;

  // Pagination
  hasMore: boolean;
  total: number;

  // Current context
  currentTenant: { id: string; name: string; type: string } | null;
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

export function useTenantFeed(
  options: TenantFeedOptions = {},
): UseTenantFeedReturn {
  const { currentTenant, userTenants } = useTenant();
  const [offset, setOffset] = useState(0);

  const {
    limit = 20,
    status = 'published',
    author_id,
    includeCollectives = true,
    includeFollowed = true,
    initialData,
  } = options;

  // Determine which tenants to fetch from
  const targetTenants = useMemo(() => {
    if (!includeCollectives || !currentTenant) {
      return currentTenant ? [currentTenant.id] : [];
    }

    // Include current tenant + user's collective tenants
    const tenantIds = new Set([currentTenant.id]);

    userTenants
      .filter((t) => t.type !== 'personal') // Only include collectives
      .forEach((t) => tenantIds.add(t.id));

    return Array.from(tenantIds);
  }, [currentTenant, userTenants, includeCollectives]);

  // Fetch posts from current tenant
  const {
    data: currentTenantData,
    isLoading: isLoadingCurrent,
    isFetching: isFetchingCurrent,
    error: currentError,
    refetch: refetchCurrent,
  } = useQuery({
    queryKey: [
      'tenant-feed',
      currentTenant?.id,
      { limit, offset, status, author_id },
    ],
    queryFn: async (): Promise<TenantFeedResponse | null> => {
      if (!currentTenant) return null;

      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
        status,
        ...(author_id && { author_id }),
      });

      const response = await fetch(
        `/api/tenants/${currentTenant.id}/posts?${params}`,
      );

      if (!response.ok) {
        throw new Error('Failed to fetch tenant feed');
      }

      const result = await response.json();

      return result.data;
    },
    enabled: Boolean(currentTenant) && (offset > 0 || !initialData),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    ...(offset === 0 && initialData
      ? {
          initialData: {
            posts: initialData as unknown as TenantFeedPost[],
            pagination: {
              limit,
              offset: 0,
              total: initialData.length,
              hasMore: initialData.length >= limit, // Assume more data if we got a full page
            },
            meta: {
              tenant_id: currentTenant?.id || '',
              user_role: 'member',
              status_filter: status,
            },
          },
        }
      : {}),
  });

  // Fetch posts from collective tenants (if enabled)
  const {
    data: collectiveData,
    isLoading: isLoadingCollectives,
    isFetching: isFetchingCollectives,
    error: collectiveError,
    refetch: refetchCollectives,
  } = useQuery({
    queryKey: [
      'collective-feed',
      targetTenants,
      { limit: 10, status: 'published' },
    ],
    queryFn: async (): Promise<TenantFeedPost[]> => {
      if (!includeCollectives || targetTenants.length <= 1) return [];

      // Fetch from collective tenants (excluding personal tenant)
      const collectiveTenants = targetTenants.filter(
        (id) => id !== currentTenant?.id,
      );

      if (collectiveTenants.length === 0) return [];

      // Use batch endpoint to minimize parallel network requests
      const response = await fetch('/api/feed/collective-batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tenantIds: collectiveTenants, limit: 5 }),
      });

      if (!response.ok) {
        console.warn('Failed to fetch batch collective posts');
        return [];
      }

      const result = (await response.json()) as { posts?: TenantFeedPost[] };
      return result.posts ?? [];
    },
    enabled: Boolean(includeCollectives && targetTenants.length > 1),
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
  });

  // Fetch posts from followed users (if enabled)
  const {
    data: followedData,
    isLoading: isLoadingFollowed,
    isFetching: isFetchingFollowed,
    error: followedError,
    refetch: refetchFollowed,
  } = useQuery({
    queryKey: ['followed-feed', { limit: 15, offset: 0 }],
    queryFn: async (): Promise<TenantFeedPost[]> => {
      if (!includeFollowed) return [];

      const params = new URLSearchParams({
        limit: '15',
        offset: '0',
      });

      const response = await fetch(`/api/feed/followed?${params}`);

      if (!response.ok) {
        if (response.status === 401) {
          // User not authenticated, return empty array instead of throwing
          return [];
        }
        throw new Error('Failed to fetch followed users feed');
      }

      const result = await response.json();
      return result.data?.posts ?? [];
    },
    enabled: Boolean(includeFollowed),
    staleTime: 1000 * 60 * 5, // 5 minutes (more frequent updates for followed content)
    gcTime: 1000 * 60 * 30, // 30 minutes
  });

  // Combine and transform posts
  const feedItems = useMemo((): FeedItem[] => {
    // If we're on the first page and have initial data, use it directly
    // Initial data is already transformed to FeedItem format by the server
    if (offset === 0 && initialData && initialData.length > 0) {
      return initialData;
    }

    // Use currentTenantData.posts directly instead of allPosts state
    const tenantPosts = currentTenantData?.posts || [];
    const collectivePosts = collectiveData || [];
    const followedPosts = followedData || [];

    // Combine all post types and deduplicate by post ID
    const allPosts = [...tenantPosts, ...collectivePosts, ...followedPosts];

    // Deduplicate posts by ID (keep the first occurrence)
    const uniquePostsMap = new Map<string, TenantFeedPost>();
    allPosts.forEach((post) => {
      if (!uniquePostsMap.has(post.id)) {
        uniquePostsMap.set(post.id, post);
      }
    });

    // Convert map back to array and sort by published date
    const allCombinedPosts = Array.from(uniquePostsMap.values()).sort(
      (a, b) =>
        new Date(b.published_at || b.created_at).getTime() -
        new Date(a.published_at || a.created_at).getTime(),
    );

    // Transform to FeedItem format
    return allCombinedPosts.map((post): FeedItem => {
      const feedItem: FeedItem = {
        id: post.id,
        type: post.post_type === 'video' ? 'video' : 'post',
        title: post.title,
        content: post.content,
        author: {
          name:
            post.author?.full_name ?? post.author?.username ?? 'Unknown Author',
          username: post.author?.username ?? 'unknown',
          ...(post.author?.avatar_url
            ? { avatar_url: post.author.avatar_url }
            : {}),
        },
        published_at: post.published_at || post.created_at,
        stats: {
          likes: post.like_count,
          dislikes: 0, // TODO: Add dislike support
          comments: post.comment_count,
          views: post.view_count,
        },
        thumbnail_url: post.thumbnail_url ?? null,
        // Add video metadata for video posts
        ...(post.post_type === 'video' && post.video
          ? {
              ...(post.video.duration !== null &&
              post.video.duration !== undefined
                ? { duration: post.video.duration.toString() }
                : {}),
              metadata: {
                ...(post.video.mux_playback_id
                  ? { playbackId: post.video.mux_playback_id }
                  : {}),
                status: post.video.status || 'preparing',
                videoAssetId: post.video.id,
              },
            }
          : {}),
        ...(post.tenant.type === 'collective'
          ? {
              collective: {
                name: post.tenant.name,
                slug: post.tenant.slug,
              },
            }
          : {}),
        // Add tenant information
        tenant: {
          id: post.tenant.id,
          name: post.tenant.name,
          type: post.tenant.type,
        },
      };

      return feedItem;
    });
  }, [currentTenantData, collectiveData, followedData, initialData, offset]);

  // Loading and error states
  const isLoading =
    isLoadingCurrent || isLoadingCollectives || isLoadingFollowed;
  const isFetching =
    isFetchingCurrent || isFetchingCollectives || isFetchingFollowed;
  const error =
    currentError?.message ||
    collectiveError?.message ||
    followedError?.message ||
    null;

  // Pagination
  const hasMore = currentTenantData?.pagination?.hasMore || false;
  const total = currentTenantData?.pagination?.total || 0;

  // Actions
  const refetch = useCallback(() => {
    refetchCurrent();
    if (includeCollectives) {
      refetchCollectives();
    }
    if (includeFollowed) {
      refetchFollowed();
    }
  }, [
    refetchCurrent,
    refetchCollectives,
    refetchFollowed,
    includeCollectives,
    includeFollowed,
  ]);

  const loadMore = useCallback(() => {
    if (hasMore && !isFetching) {
      setOffset((prev) => prev + limit);
    }
  }, [hasMore, isFetching, limit]);

  // Reset offset when tenant changes
  useEffect(() => {
    setOffset(0);
  }, [currentTenant?.id]);

  return {
    // Data
    feedItems,

    // Loading states
    isLoading,
    isFetching,

    // Error handling
    error,

    // Actions
    refetch,
    loadMore,

    // Pagination
    hasMore,
    total,

    // Current context
    currentTenant: currentTenant
      ? {
          id: currentTenant.id,
          name: currentTenant.name,
          type: currentTenant.is_personal ? 'personal' : 'collective',
        }
      : null,
  };
}
