// Tenant-Aware Feed Hook (Unified Version)
// Fetches a personalized feed via the new /api/feed/unified endpoint
// Provides infinite-scroll pagination using TanStack React Query.

'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import { useTenant } from '@/providers/TenantProvider';

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
      comments: getNumber('comment_count') ?? 0,
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
  const { currentTenant } = useTenant();
  const { limit = 20, initialData } = options;

  // ---------------------------------------------------------------------------
  // React Query – Infinite unified feed
  // ---------------------------------------------------------------------------

  const fetchFeedPage = useCallback(
    async ({ pageParam = 0 }: { pageParam?: number }): Promise<FeedPage> => {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: pageParam.toString(),
      });

      const res = await fetch(`/api/feed/unified?${params.toString()}`);
      if (!res.ok) {
        if (res.status === 401) {
          const empty: FeedItem[] = [];
          return { items: empty, nextCursor: null };
        }
        throw new Error('Failed to fetch feed');
      }

      const json = (await res.json()) as {
        items?: RawPost[];
        nextCursor: string | null;
      };

      const rawItems = Array.isArray(json.items) ? json.items : [];
      const feedItems = rawItems.map((p) => transformPostToFeedItem(p));

      // Compute next offset: if we received fewer than limit, no more pages
      const nextOffset =
        feedItems.length === limit ? pageParam + limit : undefined;
      return { items: feedItems, nextCursor: nextOffset?.toString() ?? null };
    },
    [limit],
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
    queryKey: ['unified-feed', limit],
    queryFn: ({ pageParam = 0 }) => fetchFeedPage({ pageParam }),
    getNextPageParam: (_last, pages) => pages.length * limit,
    enabled: Boolean(currentTenant),
    initialPageParam: 0,
    ...(initialData
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
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });

  const feedItems = useMemo<FeedItem[]>(() => {
    if (!data || !('pages' in data) || !Array.isArray(data.pages)) {
      return [];
    }

    return data.pages.filter(isFeedPage).flatMap((p) => p.items);
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
          type: currentTenant.is_personal ? 'personal' : 'collective',
        }
      : null,
  };
}
