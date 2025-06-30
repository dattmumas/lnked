'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { ChevronRight, Filter } from 'lucide-react';
import Link from 'next/link';
import React, { useState, useCallback, useMemo } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCollectiveData } from '@/hooks/collectives/useCollectiveData';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

interface ArticleListProps {
  collectiveSlug: string;
  initialPosts?: ArticlePost[] | undefined;
}

// 🎓 Shared Types: Export for use in SSR data transformation
export interface ArticlePost {
  id: string;
  title: string | null;
  subtitle: string | null;
  published_at: string | null;
  post_type: string | null;
  like_count: number | null;
  view_count: number | null;
  author: string | null;
}

type FilterType = 'all' | 'text' | 'video';

// Constants
const POSTS_PER_PAGE = 10;
const SKELETON_POSTS_COUNT = 5;
const MILLISECONDS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const DAYS_PER_WEEK = 7;
const WORDS_PER_MINUTE = 200;

export function ArticleList({
  collectiveSlug,
  initialPosts,
}: ArticleListProps): React.ReactElement {
  const { data: collective } = useCollectiveData(collectiveSlug);
  const [filter, setFilter] = useState<FilterType>('all');

  // 🎓 SSR Query Configuration: Split into two configurations based on initial data
  // This avoids TypeScript issues with conditional initialData
  const queryConfig = initialPosts
    ? {
        // Configuration when we have SSR data
        queryKey: ['collective-posts', collective?.id, filter],
        queryFn: async ({ pageParam }: { pageParam: number }) => {
          // Same query function but only runs for subsequent pages
          if (
            collective?.id === undefined ||
            collective?.id === null ||
            collective.id.length === 0
          )
            return { posts: [], hasMore: false };

          const supabase = createSupabaseBrowserClient();
          const from = pageParam * POSTS_PER_PAGE;
          const to = from + POSTS_PER_PAGE - 1;

          let query = supabase
            .from('posts')
            .select(
              `
          id, title, subtitle, published_at, post_type,
          like_count, view_count,
          author_profile:users!author_id(id, username, full_name, avatar_url)
        `,
            )
            .eq('collective_id', collective.id)
            .not('published_at', 'is', null)
            .eq('is_public', true);

          if (filter !== 'all') {
            query = query.eq('post_type', filter);
          }

          const { data: posts, error } = await query
            .order('published_at', { ascending: false })
            .range(from, to);

          if (error) throw error;

          const transformedPosts: ArticlePost[] = (posts ?? []).map((post) => ({
            ...post,
            author:
              post.author_profile?.full_name ||
              post.author_profile?.username ||
              null,
          }));

          return {
            posts: transformedPosts,
            hasMore:
              posts !== undefined &&
              posts !== null &&
              posts.length === POSTS_PER_PAGE,
          };
        },
        initialData: {
          pages: [
            {
              posts: initialPosts,
              hasMore: initialPosts.length === POSTS_PER_PAGE,
            },
          ],
          pageParams: [0],
        },
        enabled: collective?.id !== undefined && collective?.id !== null,
        initialPageParam: 0,
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 15,
      }
    : {
        // Configuration when we need to fetch from client
        queryKey: ['collective-posts', collective?.id, filter],
        queryFn: async ({ pageParam }: { pageParam: number }) => {
          if (
            collective?.id === undefined ||
            collective?.id === null ||
            collective.id.length === 0
          )
            return { posts: [], hasMore: false };

          const supabase = createSupabaseBrowserClient();
          const from = pageParam * POSTS_PER_PAGE;
          const to = from + POSTS_PER_PAGE - 1;

          let query = supabase
            .from('posts')
            .select(
              `
          id, title, subtitle, published_at, post_type,
          like_count, view_count,
          author_profile:users!author_id(id, username, full_name, avatar_url)
        `,
            )
            .eq('collective_id', collective.id)
            .not('published_at', 'is', null)
            .eq('is_public', true);

          if (filter !== 'all') {
            query = query.eq('post_type', filter);
          }

          const { data: posts, error } = await query
            .order('published_at', { ascending: false })
            .range(from, to);

          if (error) throw error;

          const transformedPosts: ArticlePost[] = (posts ?? []).map((post) => ({
            ...post,
            author:
              post.author_profile?.full_name ||
              post.author_profile?.username ||
              null,
          }));

          return {
            posts: transformedPosts,
            hasMore:
              posts !== undefined &&
              posts !== null &&
              posts.length === POSTS_PER_PAGE,
          };
        },
        enabled: collective?.id !== undefined && collective?.id !== null,
        initialPageParam: 0,
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 15,
      };

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery({
      ...queryConfig,
      getNextPageParam: (
        lastPage: { posts: ArticlePost[]; hasMore: boolean },
        pages: Array<{ posts: ArticlePost[]; hasMore: boolean }>,
      ) => {
        return lastPage.hasMore ? pages.length : undefined;
      },
    });

  const allPosts = useMemo(() => {
    return data?.pages.flatMap((page) => page.posts) ?? [];
  }, [data?.pages]);

  const handleLoadMore = useCallback((): void => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleFilterChange = useCallback((value: string): void => {
    setFilter(value as FilterType);
  }, []);

  // 🎓 SSR Loading State: Only show loading if we have no initial data
  // With SSR, we get immediate data, so loading states are rare
  if (isLoading && !initialPosts) {
    return (
      <div className="article-list-container">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Latest Posts</h2>
          <div className="w-32 h-10 bg-muted rounded animate-pulse"></div>
        </div>

        <div className="space-y-4">
          {Array.from({ length: SKELETON_POSTS_COUNT }).map((_, i) => (
            <div key={i} className="article-row animate-pulse">
              <div className="rounded-lg border bg-card p-4">
                <div className="space-y-2">
                  <div className="h-6 bg-muted rounded w-3/4"></div>
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                  <div className="h-3 bg-muted rounded w-1/3"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="article-list-container">
      {/* Header with filter */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Latest Posts</h2>

        <Select value={filter} onValueChange={handleFilterChange}>
          <SelectTrigger className="w-32">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="text">Articles</SelectItem>
            <SelectItem value="video">Videos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Posts list */}
      {allPosts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No posts found for the selected filter
        </div>
      ) : (
        <div className="space-y-4">
          {allPosts.map((post) => (
            <ArticleRow
              key={post.id}
              post={post}
              collectiveSlug={collectiveSlug}
            />
          ))}

          {/* Load more button */}
          {hasNextPage && (
            <div className="text-center pt-6">
              <Button
                onClick={handleLoadMore}
                disabled={isFetchingNextPage}
                variant="outline"
              >
                {isFetchingNextPage ? 'Loading...' : 'Load More Posts'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Memoized article row component for performance
const ArticleRow = React.memo<{
  post: ArticlePost;
  collectiveSlug: string;
}>(({ post }) => {
  const formatDate = useCallback((dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor(
      (now.getTime() - date.getTime()) /
        (MILLISECONDS_PER_SECOND *
          SECONDS_PER_MINUTE *
          MINUTES_PER_HOUR *
          HOURS_PER_DAY),
    );

    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < DAYS_PER_WEEK) return `${diffInDays} days ago`;
    return date.toLocaleDateString();
  }, []);

  const getReadingTime = useCallback(
    (title: string, subtitle: string | null): string => {
      const wordCount =
        `${title} ${subtitle !== undefined && subtitle !== null && subtitle.length > 0 ? subtitle : ''}`.split(
          ' ',
        ).length;
      const readingTime = Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE));
      return `${readingTime} min read`;
    },
    [],
  );

  return (
    <Link href={`/posts/${post.id}`} className="group block">
      <div className="article-row rounded-lg border bg-card p-4 hover:bg-muted/30 transition-colors group-hover:shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            {/* Title */}
            <h3 className="text-lg font-semibold leading-tight line-clamp-2 group-hover:text-accent transition-colors">
              {post.title || 'Untitled'}
            </h3>

            {/* Subtitle */}
            {post.subtitle !== undefined &&
              post.subtitle !== null &&
              post.subtitle.length > 0 && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                  {post.subtitle}
                </p>
              )}

            {/* Metadata */}
            <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
              {post.author !== undefined &&
                post.author !== null &&
                post.author.length > 0 && (
                  <>
                    <span className="font-medium">{post.author}</span>
                    <span>•</span>
                  </>
                )}

              {post.published_at !== undefined &&
                post.published_at !== null &&
                post.published_at.length > 0 && (
                  <>
                    <span>{formatDate(post.published_at)}</span>
                    <span>•</span>
                  </>
                )}

              <span>{getReadingTime(post.title || '', post.subtitle)}</span>

              {post.post_type === 'video' && (
                <>
                  <span>•</span>
                  <Badge variant="secondary" className="text-xs">
                    Video
                  </Badge>
                </>
              )}

              {post.view_count !== undefined &&
                post.view_count !== null &&
                post.view_count > 0 && (
                  <>
                    <span>•</span>
                    <span>{post.view_count} views</span>
                  </>
                )}
            </div>
          </div>

          {/* Arrow icon */}
          <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-accent transition-colors flex-shrink-0 ml-4 mt-1" />
        </div>
      </div>
    </Link>
  );
});

ArticleRow.displayName = 'ArticleRow';
