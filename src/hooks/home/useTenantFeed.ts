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
  view_count: number;
  like_count: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
  published_at?: string;
  thumbnail_url?: string | null;
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
  const [allPosts, setAllPosts] = useState<TenantFeedPost[]>([]);

  const {
    limit = 20,
    status = 'published',
    author_id,
    includeCollectives = true,
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
    enabled: Boolean(currentTenant),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
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

  // Accumulate paginated results for current tenant
  useEffect(() => {
    if (!currentTenantData?.posts) return;

    setAllPosts((prev) => {
      // If this is the first page (offset === 0), replace entirely
      if (offset === 0) return currentTenantData.posts;

      // Otherwise append unique posts to preserve earlier pages
      const existingIds = new Set(prev.map((p) => p.id));
      const newUnique = currentTenantData.posts.filter(
        (p) => !existingIds.has(p.id),
      );
      return [...prev, ...newUnique];
    });
  }, [currentTenantData?.posts, offset]);

  // Combine and transform posts
  const feedItems = useMemo((): FeedItem[] => {
    const collectivePosts = collectiveData || [];

    // Combine accumulated tenant posts with collective posts and sort
    const allCombinedPosts = [...allPosts, ...collectivePosts].sort(
      (a, b) =>
        new Date(b.published_at || b.created_at).getTime() -
        new Date(a.published_at || a.created_at).getTime(),
    );

    // Transform to FeedItem format
    return allCombinedPosts.map(
      (post): FeedItem => ({
        id: post.id,
        type: 'post', // TODO: Detect video posts
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
      }),
    );
  }, [allPosts, collectiveData]);

  // Loading and error states
  const isLoading = isLoadingCurrent || isLoadingCollectives;
  const isFetching = isFetchingCurrent || isFetchingCollectives;
  const error = currentError?.message || collectiveError?.message || null;

  // Pagination
  const hasMore = currentTenantData?.pagination?.hasMore || false;
  const total = currentTenantData?.pagination?.total || 0;

  // Actions
  const refetch = useCallback(() => {
    refetchCurrent();
    if (includeCollectives) {
      refetchCollectives();
    }
  }, [refetchCurrent, refetchCollectives, includeCollectives]);

  const loadMore = useCallback(() => {
    if (hasMore && !isFetching) {
      setOffset((prev) => prev + limit);
    }
  }, [hasMore, isFetching, limit]);

  // Reset offset when tenant changes
  useEffect(() => {
    setOffset(0);
    setAllPosts([]);
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
