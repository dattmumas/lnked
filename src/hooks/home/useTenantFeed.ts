// Tenant-Aware Feed Hook (Unified Version)
// Fetches a personalized feed via the new /api/feed/unified endpoint
// Provides infinite-scroll pagination using TanStack React Query.

'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import { useTenantStore } from '@/stores/tenant-store';

import type { FeedItem } from '@/types/home/types';

// =============================================================================
// QUERY KEY FACTORY
// =============================================================================

export const getTenantFeedQueryKey = (
  feedScope: 'global' | 'tenant',
  tenantId: string | undefined,
  limit: number,
): (string | number | undefined)[] => [
  'unified-feed',
  feedScope,
  feedScope === 'tenant' ? tenantId : 'global',
  limit,
];

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
// RUNTIME TYPE GUARD
// =============================================================================

type FeedPage = { items: FeedItem[]; nextCursor: number | null };

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

      const base = '/actions/feedActions';
      params.set('scope', tenantId ? 'tenant' : 'global');
      const url = `${base}?${params.toString()}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch feed: ${response.statusText}`);
      }

      const json = await response.json();
      const feedItems = Array.isArray(json.items)
        ? (json.items as FeedItem[])
        : [];

      // Compute next offset: if we received fewer than limit, no more pages
      const nextOffset =
        feedItems.length === limit ? pageParam + limit : undefined;

      return {
        items: feedItems,
        nextCursor: nextOffset ? nextOffset : null,
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
    queryKey: getTenantFeedQueryKey(feedScope, currentTenant?.id, limit),
    queryFn: ({ pageParam = 0 }) => fetchFeedPage({ pageParam }),
    getNextPageParam: (lastPage) => {
      // If we got fewer items than requested, no more pages
      if (!lastPage || lastPage.items.length < limit) return undefined;
      // Return the next offset
      return lastPage.nextCursor ? lastPage.nextCursor : undefined;
    },
    enabled: Boolean(currentTenant), // Only run when we have a tenant context
    initialPageParam: 0,
    refetchOnMount: false, // Don't automatically refetch on mount
    refetchOnWindowFocus: false,
    ...(initialData && feedScope === 'global' // Only use initial data for global scope
      ? {
          initialData: {
            pages: [
              {
                items: initialData,
                nextCursor:
                  initialData.length === limit ? initialData.length : null,
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
