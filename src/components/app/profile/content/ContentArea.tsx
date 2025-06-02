'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useProfileContext, useProfilePosts } from '@/lib/hooks/profile';
import type { ContentAreaProps } from '@/lib/hooks/profile/types';
import type { Database } from '@/lib/database.types';

type PostType = Database['public']['Enums']['post_type_enum'];

/**
 * Content Area Component - Full-width content section below hero and sidebar
 *
 * Features:
 * - Segmented control tabs: Writing, Video, Audio
 * - Sticky tab bar on scroll
 * - Responsive masonry/3-column grid
 * - Infinite scroll content loading
 * - Content type filtering
 */
export function ContentArea({ className = '' }: ContentAreaProps) {
  const { metrics, profile } = useProfileContext();
  const [activeType, setActiveType] = useState<PostType>('text');
  const [isSticky, setIsSticky] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);

  // Fetch posts with filtering - add safety check for username
  const {
    data: postsResponse,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useProfilePosts(profile?.username || '', {
    type: activeType,
    limit: 12,
  });

  // Don't render if we don't have a valid username
  if (!profile?.username) {
    return (
      <div className="content-area-error text-center py-12 space-y-4">
        <div className="text-6xl">⚠️</div>
        <div className="content">
          <h3 className="title text-lg font-medium text-foreground">
            Error Loading Profile
          </h3>
          <p className="description text-muted-foreground mt-2">
            Profile username is missing. Please try refreshing the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  // Determine default tab based on content counts
  React.useEffect(() => {
    const { writing, video } = metrics.postCounts;

    // Default to the content type with the most items
    if (video > writing) {
      setActiveType('video');
    } else {
      setActiveType('text');
    }
  }, [metrics.postCounts]);

  // Sticky tab behavior
  useEffect(() => {
    const handleScroll = () => {
      if (!tabsRef.current) return;

      const tabsRect = tabsRef.current.getBoundingClientRect();
      const shouldBeSticky = tabsRect.top <= 80; // Account for header height

      setIsSticky(shouldBeSticky);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const posts = postsResponse?.data || [];

  return (
    <section
      ref={contentRef}
      className={`
        content-area
        space-y-6
        
        ${className}
      `}
    >
      {/* Content Tabs */}
      <div
        ref={tabsRef}
        className={`
          content-tabs-container
          transition-all
          duration-200
          
          ${
            isSticky
              ? 'sticky top-20 z-40 bg-background/80 backdrop-blur-sm border-b border-border py-3'
              : ''
          }
        `}
      >
        <ContentTabs
          activeType={activeType}
          onTypeChange={setActiveType}
          counts={metrics.postCounts}
        />
      </div>

      {/* Content Grid */}
      <div className="content-grid-container">
        <ContentGrid
          posts={posts}
          loading={isLoading}
          onLoadMore={fetchNextPage}
          hasMore={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          error={error}
          activeType={activeType}
        />
      </div>
    </section>
  );
}

/**
 * Content Tabs Component - Segmented control for content types
 */
function ContentTabs({
  activeType,
  onTypeChange,
  counts,
  className = '',
}: {
  activeType: PostType;
  onTypeChange: (type: PostType) => void;
  counts: { writing: number; video: number; total: number };
  className?: string;
}) {
  const tabs: {
    key: PostType;
    label: string;
    count: number;
    icon: string;
  }[] = [
    { key: 'text', label: 'Writing', count: counts.writing, icon: '📝' },
    { key: 'video', label: 'Video', count: counts.video, icon: '🎥' },
  ];

  return (
    <nav
      className={`
      content-tabs
      flex 
      gap-1
      bg-muted/30
      rounded-lg
      p-1
      w-fit
      
      /* Responsive */
      max-md:w-full
      max-md:overflow-x-auto
      max-md:scrollbar-hide
      
      ${className}
    `}
    >
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onTypeChange(tab.key)}
          className={`
            content-tab
            flex
            items-center
            gap-2
            px-4
            py-2
            rounded-md
            text-sm
            font-medium
            transition-all
            whitespace-nowrap
            flex-shrink-0
            
            ${
              activeType === tab.key
                ? 'bg-background text-foreground shadow-sm border border-border'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
            }
          `}
        >
          <span className="icon text-base">{tab.icon}</span>
          <span className="label">{tab.label}</span>
          <span className="count text-xs bg-muted/50 text-muted-foreground px-1.5 py-0.5 rounded">
            {tab.count}
          </span>
        </button>
      ))}
    </nav>
  );
}

/**
 * Content Grid Component - Responsive masonry grid for content cards
 */
function ContentGrid({
  posts,
  loading = false,
  onLoadMore,
  hasMore = false,
  isFetchingNextPage = false,
  error,
  activeType,
}: {
  posts: any[];
  loading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isFetchingNextPage?: boolean;
  error?: Error | null;
  activeType: PostType;
}) {
  if (loading) {
    return <ContentGridSkeleton />;
  }

  if (error) {
    return <ContentGridError error={error} />;
  }

  return (
    <div className="content-grid space-y-6">
      {posts.length === 0 ? (
        <EmptyContentState type={activeType} />
      ) : (
        <>
          <div
            className="
            grid
            grid-cols-3
            gap-6
            
            /* Responsive grid */
            max-lg:grid-cols-2
            max-md:grid-cols-1
          "
          >
            {posts.map((post) => (
              <ContentCard key={post.id} post={post} />
            ))}
          </div>

          {/* Load More Section */}
          {(hasMore || isFetchingNextPage) && (
            <div className="load-more-section">
              <LoadMoreButton
                onClick={onLoadMore}
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
 * Content Grid Skeleton Component
 */
function ContentGridSkeleton() {
  return (
    <div
      className="
      grid
      grid-cols-3
      gap-6
      max-lg:grid-cols-2
      max-md:grid-cols-1
    "
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="content-card-skeleton bg-card rounded-lg border overflow-hidden animate-pulse"
        >
          <div className="aspect-video bg-muted" />
          <div className="p-4 space-y-3">
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-3 bg-muted rounded w-3/4" />
            <div className="flex justify-between">
              <div className="h-3 bg-muted rounded w-16" />
              <div className="h-3 bg-muted rounded w-12" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Content Grid Error Component
 */
function ContentGridError({ error }: { error: Error }) {
  return (
    <div className="content-grid-error text-center py-12 space-y-4">
      <div className="text-6xl">⚠️</div>
      <div className="content">
        <h3 className="title text-lg font-medium text-foreground">
          Error Loading Content
        </h3>
        <p className="description text-muted-foreground mt-2">
          {error.message ||
            'There was an error loading the content. Please try again.'}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Retry
        </button>
      </div>
    </div>
  );
}

/**
 * Enhanced Content Card Component - Now with real data
 */
function ContentCard({
  post,
  className = '',
}: {
  post: any; // Will be properly typed once we have the ProfilePost type working
  className?: string;
}) {
  const getContentTypeLabel = (type: PostType) => {
    switch (type) {
      case 'video':
        return 'Watch';
      default:
        return 'Read';
    }
  };

  const getTimeLabel = (type: PostType, time?: number) => {
    const defaultTime = type === 'video' ? 5 : 3;
    const duration = time || defaultTime;

    switch (type) {
      case 'video':
        return `${duration} min`;
      default:
        return `${duration} min read`;
    }
  };

  const handleCardClick = () => {
    // TODO: Navigate to post detail page
    console.log('Navigate to post:', post.id);
  };

  return (
    <article
      className={`
      content-card
      bg-card
      rounded-lg
      border
      overflow-hidden
      transition-all
      hover:shadow-md
      hover:-translate-y-1
      group
      cursor-pointer
      
      ${className}
    `}
      onClick={handleCardClick}
    >
      {/* Thumbnail/Preview */}
      <div className="thumbnail aspect-video bg-muted relative overflow-hidden">
        {post.thumbnailUrl ? (
          <img
            src={post.thumbnailUrl}
            alt={post.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
            <span className="text-4xl">
              {post.postType === 'video' ? '🎥' : '📝'}
            </span>
          </div>
        )}

        {/* Hover Overlay */}
        <div
          className="
          absolute 
          inset-0 
          bg-black/50 
          flex 
          items-center 
          justify-center 
          opacity-0 
          group-hover:opacity-100 
          transition-opacity
        "
        >
          <span
            className="
            text-white 
            text-sm 
            font-medium 
            bg-black/70 
            px-3 
            py-1 
            rounded-full
          "
          >
            {getContentTypeLabel(post.postType)}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="content p-4 space-y-3">
        {/* Title */}
        <h3
          className="
          title 
          font-semibold 
          text-foreground 
          leading-tight
          line-clamp-2
          group-hover:text-primary
          transition-colors
        "
        >
          {post.title}
        </h3>

        {/* Subtitle */}
        {post.subtitle && (
          <p
            className="
            subtitle 
            text-sm 
            text-muted-foreground 
            leading-relaxed
            line-clamp-2
          "
          >
            {post.subtitle}
          </p>
        )}

        {/* Meta */}
        <div className="meta flex items-center justify-between text-xs text-muted-foreground">
          <div className="meta-left flex items-center gap-3">
            <span className="publish-date">
              {post.publishedAt
                ? new Date(post.publishedAt).toLocaleDateString()
                : new Date(post.createdAt).toLocaleDateString()}
            </span>
            <span className="read-time">
              {getTimeLabel(post.postType, post.readTime)}
            </span>
          </div>

          <div className="meta-right flex items-center gap-3">
            <span className="views flex items-center gap-1">
              👁️ {post.viewCount || 0}
            </span>
            <span className="likes flex items-center gap-1">
              ❤️ {post.likeCount || 0}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

/**
 * Enhanced Load More Button Component
 */
function LoadMoreButton({
  onClick,
  loading = false,
  hasMore = false,
}: {
  onClick?: () => void;
  loading?: boolean;
  hasMore?: boolean;
}) {
  if (!hasMore && !loading) {
    return null;
  }

  return (
    <div className="load-more-container text-center py-6">
      <button
        onClick={onClick}
        disabled={loading || !hasMore}
        className="
          load-more-button 
          px-6 
          py-3 
          text-sm 
          text-muted-foreground 
          hover:text-foreground 
          border 
          border-border 
          rounded-lg
          hover:bg-muted/50
          transition-all
          disabled:opacity-50
          disabled:cursor-not-allowed
        "
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
            Loading...
          </span>
        ) : (
          'Load More Content'
        )}
      </button>
    </div>
  );
}

/**
 * Empty Content State Component
 */
function EmptyContentState({ type }: { type: PostType }) {
  const getEmptyState = (type: PostType) => {
    switch (type) {
      case 'video':
        return {
          icon: '🎥',
          title: 'No Videos Yet',
          description: 'Videos will appear here when published.',
        };
      default:
        return {
          icon: '📝',
          title: 'No Writing Yet',
          description: 'Written content will appear here when published.',
        };
    }
  };

  const state = getEmptyState(type);

  return (
    <div className="empty-content-state text-center py-12 space-y-4">
      <div className="icon text-6xl">{state.icon}</div>
      <div className="content">
        <h3 className="title text-lg font-medium text-foreground">
          {state.title}
        </h3>
        <p className="description text-muted-foreground mt-2">
          {state.description}
        </p>
      </div>
    </div>
  );
}

export default ContentArea;
