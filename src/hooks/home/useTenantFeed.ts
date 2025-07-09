// Tenant-Aware Feed Hook (Unified Version)
// Fetches a personalized feed via the new /api/feed/unified endpoint
// Provides infinite-scroll pagination using TanStack React Query.

'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { useCallback, useMemo, useEffect, useRef } from 'react';

import { useTenantStore } from '@/stores/tenant-store';
import { shallow } from 'zustand/shallow';

import type { FeedItem } from '@/types/home/types';

// =============================================================================
// TYPES
// =============================================================================

interface TenantFeedOptions {
  /** Number of items to request per page (default 20) */
  limit?: number;
  /** Initial SSR-fetched items to hydrate the first page */
  initialData?: FeedItem[];
  /** (Legacy) Include collective posts – kept for compatibility */
  includeCollectives?: boolean;
  /** (Legacy) Include followed authors' posts – kept for compatibility */
  includeFollowed?: boolean;
  /** (Legacy) Status filter */
  status?: 'all' | 'published' | 'draft';
  /** (Legacy) Author filter */
  author_id?: string;
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

  // Current tenant context (may be null while loading)
  currentTenant: {
    id: string;
    name: string;
    type: 'personal' | 'collective';
  } | null;
}

// =============================================================================
// HELPER – Transform raw post record into UI-friendly FeedItem
// =============================================================================

type RawPost = Record<string, unknown>;

function transformPostToFeedItem(post: RawPost): FeedItem {
  // Safe helpers to read unknown record keys
  const getString = (key: string): string | undefined => {
    const val = post[key];
    return typeof val === 'string' && val.trim() !== '' ? val : undefined;
  };

  const getNumber = (key: string): number | undefined => {
    const val = post[key];
    return typeof val === 'number' ? val : undefined;
  };

  // Author details
  const authorName =
    getString('author_full_name') ?? getString('author_name') ?? 'Unknown';
  const authorUsername = getString('author_username') ?? 'unknown';
  const avatarUrl = getString('author_avatar_url');

  // Video metadata (optional)
  const isVideo = getString('post_type') === 'video';

  const videoAssetId = getString('video_asset_id');
  const videoDuration = getNumber('video_duration');
  const videoPlaybackId = getString('video_playback_id');
  const videoStatus = getString('video_status');

  const videoMeta =
    isVideo && videoAssetId
      ? {
          ...(videoDuration !== undefined
            ? { duration: videoDuration.toString() }
            : {}),
          metadata: {
            ...(videoPlaybackId ? { playbackId: videoPlaybackId } : {}),
            status: videoStatus ?? 'preparing',
            videoAssetId,
          },
        }
      : {};

  // Collective details (optional)
  const collectiveName = getString('collective_name');
  const collectiveSlug = getString('collective_slug');

  const collectiveMeta = collectiveName
    ? {
        collective: {
          name: collectiveName,
          slug: collectiveSlug ?? collectiveName.toLowerCase(),
        },
      }
    : {};

  // Tenant context (always available in the unified view)
  const tenantId = getString('tenant_id');
  const tenantName = getString('tenant_name');
  const tenantType = getString('tenant_type') as
    | 'personal'
    | 'collective'
    | undefined;

  const tenantMeta =
    tenantId && tenantName && tenantType
      ? {
          tenant: {
            id: tenantId,
            name: tenantName,
            type: tenantType,
          },
        }
      : {};

  return {
    id: getString('id') ?? '',
    type: isVideo ? 'video' : 'post',
    title: getString('title') ?? '',
    content: getString('content') ?? '',
    author: {
      name: authorName,
      username: authorUsername,
      ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
    },
    published_at: getString('published_at') ?? getString('created_at') ?? '',
    stats: {
      likes: getNumber('like_count') ?? 0,
      dislikes: getNumber('dislike_count') ?? 0,
      views: getNumber('view_count') ?? 0,
    },
    thumbnail_url: getString('thumbnail_url') ?? null,
    ...videoMeta,
    ...collectiveMeta,
    ...tenantMeta,
  } as FeedItem;
}

// =============================================================================
// RUNTIME TYPE GUARD
// =============================================================================

type FeedPage = { items: FeedItem[]; nextCursor: string | null };

const isFeedPage = (value: unknown): value is FeedPage =>
  typeof value === 'object' && value !== null && 'items' in value;

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

export function useTenantFeed(
  options: TenantFeedOptions = {},
): UseTenantFeedReturn {
  const currentTenant = useTenantStore((state) => state.currentTenant);
  const feedScope = useTenantStore((state) => state.feedScope);
  const { limit = 20, initialData } = options;

  // ---------------------------------------------------------------------------
  // React Query – Infinite unified feed
  // ---------------------------------------------------------------------------

  const fetchFeedPage = useCallback(
    async ({ pageParam = 0 }: { pageParam?: number }): Promise<FeedPage> => {
      const tenantId =
        feedScope === 'tenant' && currentTenant?.id ? currentTenant.id : null;

      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(pageParam),
      });

      if (tenantId) {
        params.set('tenantId', tenantId);
      }

      const url = `/api/feed/unified?${params.toString()}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch feed: ${response.statusText}`);
      }

      const json = await response.json();
      const rawItems = Array.isArray(json.items) ? json.items : [];
      const feedItems = rawItems.map((p: RawPost) =>
        transformPostToFeedItem(p),
      );

      // Compute next offset: if we received fewer than limit, no more pages
      const nextOffset =
        feedItems.length === limit ? pageParam + limit : undefined;

      return {
        items: feedItems,
        nextCursor: nextOffset ? String(nextOffset) : null,
      };
    },
    [feedScope, currentTenant, limit],
  );

  const {
    data,
    isLoading,
    isFetching,
    error: queryError,
    fetchNextPage,
    hasNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: [
      'unified-feed',
      feedScope,
      feedScope === 'tenant' ? currentTenant?.id : 'global',
      limit,
    ],
    queryFn: ({ pageParam = 0 }) => fetchFeedPage({ pageParam }),
    getNextPageParam: (lastPage) => {
      // If we got fewer items than requested, no more pages
      if (!lastPage || lastPage.items.length < limit) return undefined;
      // Return the next offset
      return lastPage.nextCursor ? Number(lastPage.nextCursor) : undefined;
    },
    enabled: !!currentTenant?.id, // Only run when we have a valid tenant ID
    initialPageParam: 0,
    refetchOnMount: false, // Don't automatically refetch on mount
    refetchOnWindowFocus: false,
    ...(initialData && feedScope === 'global' // Only use initial data for global scope
      ? {
          initialData: {
            pages: [
              {
                items: initialData,
                nextCursor: (() => {
                  if (!initialData || initialData.length === 0) return null;
                  const last = initialData[initialData.length - 1];
                  return last ? last.published_at : null;
                })(),
              },
            ],
            pageParams: [0],
          },
        }
      : {}),
    staleTime: 1000 * 60 * 2, // 2 minutes - allow some caching but not too much
    gcTime: 1000 * 60 * 30, // 30 minutes
  });

  const feedItems = useMemo<FeedItem[]>(() => {
    if (!data || !('pages' in data) || !Array.isArray(data.pages)) {
      return [];
    }

    const items = data.pages.filter(isFeedPage).flatMap((p) => p.items);
    return items;
  }, [data]);

  // Actions -------------------------------------------------------------------

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetching) void fetchNextPage();
  }, [hasNextPage, isFetching, fetchNextPage]);

  // ---------------------------------------------------------------------------

  return {
    // Data
    feedItems,

    // Loading states
    isLoading,
    isFetching,

    // Error
    error: queryError ? queryError.message : null,

    // Actions
    refetch,
    loadMore,

    // Pagination meta
    hasMore: hasNextPage ?? false,
    total: feedItems.length,

    // Tenant context
    currentTenant: currentTenant
      ? {
          id: currentTenant.id,
          name: currentTenant.name,
          type: currentTenant.type,
        }
      : null,
  };
}
