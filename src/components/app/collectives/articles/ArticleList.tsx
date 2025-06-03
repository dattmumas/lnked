'use client';

import React, { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useInfiniteQuery } from '@tanstack/react-query';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { useCollectiveData } from '@/hooks/collectives/useCollectiveData';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, Filter } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ArticleListProps {
  collectiveSlug: string;
}

interface ArticlePost {
  id: string;
  title: string;
  subtitle: string | null;
  author: string | null;
  published_at: string | null;
  post_type: 'text' | 'video';
  like_count: number;
  view_count: number | null;
}

type FilterType = 'all' | 'text' | 'video';

const POSTS_PER_PAGE = 10;

export function ArticleList({ collectiveSlug }: ArticleListProps) {
  const { data: collective } = useCollectiveData(collectiveSlug);
  const [filter, setFilter] = useState<FilterType>('all');

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteQuery({
      queryKey: ['collective-posts', collective?.id, filter],
      queryFn: async ({ pageParam }: { pageParam: number }) => {
        if (!collective?.id) return { posts: [], hasMore: false };

        const supabase = createSupabaseBrowserClient();
        const from = pageParam * POSTS_PER_PAGE;
        const to = from + POSTS_PER_PAGE - 1;

        let query = supabase
          .from('posts')
          .select(
            `
            id, title, subtitle, author, published_at, post_type,
            like_count, view_count
          `,
          )
          .eq('collective_id', collective.id)
          .not('published_at', 'is', null)
          .eq('is_public', true);

        // Apply filter
        if (filter !== 'all') {
          query = query.eq('post_type', filter);
        }

        const { data: posts, error } = await query
          .order('published_at', { ascending: false })
          .range(from, to);

        if (error) throw error;

        return {
          posts: posts || [],
          hasMore: posts ? posts.length === POSTS_PER_PAGE : false,
        };
      },
      initialPageParam: 0,
      getNextPageParam: (
        lastPage: { posts: ArticlePost[]; hasMore: boolean },
        pages: Array<{ posts: ArticlePost[]; hasMore: boolean }>,
      ) => {
        return lastPage.hasMore ? pages.length : undefined;
      },
      enabled: !!collective?.id,
    });

  const allPosts = useMemo(() => {
    return data?.pages.flatMap((page) => page.posts) || [];
  }, [data?.pages]);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) {
    return (
      <div className="article-list-container">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Latest Posts</h2>
          <div className="w-32 h-10 bg-muted rounded animate-pulse"></div>
        </div>

        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
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

        <Select
          value={filter}
          onValueChange={(value: FilterType) => setFilter(value)}
        >
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
}>(({ post, collectiveSlug }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    return date.toLocaleDateString();
  };

  const getReadingTime = (title: string, subtitle: string | null) => {
    const wordCount = (title + ' ' + (subtitle || '')).split(' ').length;
    const readingTime = Math.max(1, Math.ceil(wordCount / 200)); // ~200 words per minute
    return `${readingTime} min read`;
  };

  return (
    <Link href={`/posts/${post.id}`} className="group block">
      <div className="article-row rounded-lg border bg-card p-4 hover:bg-muted/30 transition-colors group-hover:shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            {/* Title */}
            <h3 className="text-lg font-semibold leading-tight line-clamp-2 group-hover:text-accent transition-colors">
              {post.title}
            </h3>

            {/* Subtitle */}
            {post.subtitle && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                {post.subtitle}
              </p>
            )}

            {/* Metadata */}
            <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
              {post.author && (
                <>
                  <span className="font-medium">{post.author}</span>
                  <span>•</span>
                </>
              )}

              {post.published_at && (
                <>
                  <span>{formatDate(post.published_at)}</span>
                  <span>•</span>
                </>
              )}

              <span>{getReadingTime(post.title, post.subtitle)}</span>

              {post.post_type === 'video' && (
                <>
                  <span>•</span>
                  <Badge variant="secondary" className="text-xs">
                    Video
                  </Badge>
                </>
              )}

              {post.view_count && post.view_count > 0 && (
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
