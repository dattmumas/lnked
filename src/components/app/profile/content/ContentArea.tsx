'use client';

import Image from 'next/image';
import React, { useCallback } from 'react';

import type { Database } from '@/lib/database.types';
import type { ProfilePost } from '@/lib/hooks/profile/types';

type PostType = Database['public']['Enums']['post_type_enum'];

const DEFAULT_VIDEO_TIME = 5;
const DEFAULT_ARTICLE_TIME = 3;

interface ContentAreaProps {
  posts: ProfilePost[];
  isLoading: boolean;
  error: Error | null;
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  className?: string;
}

/**
 * A presentational component that displays a unified feed of content.
 * It is decoupled from data-fetching and context.
 */
export function ContentArea({
  posts,
  isLoading,
  error,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  className = '',
}: ContentAreaProps): React.ReactElement {
  return (
    <section className={`content-area space-y-8 ${className}`}>
      <ContentGrid
        posts={posts}
        loading={isLoading}
        onLoadMore={fetchNextPage}
        hasMore={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        error={error}
      />
    </section>
  );
}

/**
 * A responsive grid that displays a collection of content cards.
 */
function ContentGrid({
  posts,
  loading = false,
  onLoadMore,
  hasMore = false,
  isFetchingNextPage = false,
  error,
}: {
  posts: ProfilePost[];
  loading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isFetchingNextPage?: boolean;
  error?: Error | null;
}): React.ReactElement {
  if (loading) {
    return <ContentGridSkeleton />;
  }

  if (error) {
    return <ContentGridError error={error} />;
  }

  return (
    <div className="content-grid space-y-6">
      {posts.length === 0 ? (
        <EmptyContentState />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <ContentCard key={post.id} post={post} />
            ))}
          </div>

          {(hasMore || isFetchingNextPage) && (
            <div className="text-center py-6">
              <LoadMoreButton
                onClick={onLoadMore || (() => {})}
                loading={isFetchingNextPage}
                hasMore={hasMore}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

/**
 * An individual card representing a piece of content (article or video).
 */
function ContentCard({
  post,
  className = '',
}: {
  post: ProfilePost;
  className?: string;
}): React.ReactElement {
  const getTimeLabel = (type: PostType, time?: number): string => {
    const defaultTime =
      type === 'video' ? DEFAULT_VIDEO_TIME : DEFAULT_ARTICLE_TIME;
    const duration =
      time !== undefined && time !== null && time > 0 ? time : defaultTime;

    switch (type) {
      case 'video':
        return `${duration} min`;
      default:
        return `${duration} min read`;
    }
  };

  const handleCardClick = useCallback((): void => {
    // TODO: Navigate to post detail page
    console.warn('Navigate to post:', post.id);
  }, [post.id]);

  return (
    <button
      type="button"
      className={`
      group
      block
      text-left
      bg-card
      rounded-lg
      border
      overflow-hidden
      transition-all
      hover:shadow-md
      hover:-translate-y-1
      cursor-pointer
      
      ${className}
    `}
      onClick={handleCardClick}
      aria-label={`View post: ${post.title}`}
    >
      <div className="relative aspect-video bg-muted overflow-hidden">
        {post.thumbnailUrl ? (
          <Image
            src={post.thumbnailUrl}
            alt={post.title}
            width={400}
            height={225}
            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-muted to-muted/60" />
        )}
      </div>

      <div className="p-4 space-y-2">
        <h3 className="font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
          {post.title}
        </h3>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {new Date(post.publishedAt ?? post.createdAt).toLocaleDateString(
              'en-US',
              {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              },
            )}
          </span>
          <span>{getTimeLabel(post.postType, post.readTime)}</span>
        </div>
      </div>
    </button>
  );
}

/**
 * A button to load more content in the feed.
 */
function LoadMoreButton({
  onClick,
  loading = false,
  hasMore = false,
}: {
  onClick?: () => void;
  loading?: boolean;
  hasMore?: boolean;
}): React.ReactElement | null {
  if (!hasMore && !loading) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={onClick ?? (() => {})}
      disabled={loading || !hasMore}
      className="px-6 py-2 border rounded-full hover:bg-muted transition-colors disabled:opacity-50"
    >
      {loading ? 'Loading...' : 'Load More'}
    </button>
  );
}

/**
 * A skeleton loader for the content grid.
 */
function ContentGridSkeleton(): React.ReactElement {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={`skeleton-${i}`}
          className="bg-card rounded-lg border overflow-hidden animate-pulse"
        >
          <div className="aspect-video bg-muted" />
          <div className="p-4 space-y-3">
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-3 bg-muted rounded w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * An error message display for when content fails to load.
 */
function ContentGridError({ error }: { error: Error }): React.ReactElement {
  return (
    <div className="text-center py-12">
      <h3 className="text-lg font-semibold text-destructive">
        Error Loading Content
      </h3>
      <p className="text-muted-foreground mt-2">{error.message}</p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium"
      >
        Retry
      </button>
    </div>
  );
}

/**
 * A message to display when there is no content to show.
 */
function EmptyContentState(): React.ReactElement {
  return (
    <div className="text-center py-12">
      <h3 className="text-lg font-semibold">No Content Yet</h3>
      <p className="text-muted-foreground mt-2">
        This author hasn&apos;t published any content.
      </p>
    </div>
  );
}

export default ContentArea;
