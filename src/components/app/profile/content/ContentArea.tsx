'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  useProfileContext,
  useProfilePosts,
  useProfileMetrics,
} from '@/lib/hooks/profile';
import type { ContentAreaProps, ProfilePost } from '@/lib/hooks/profile/types';
import type { Database } from '@/lib/database.types';
import { ProfileVideosSection } from './ProfileVideosSection';

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
  const { profile, isOwner } = useProfileContext();
  const [activeType, setActiveType] = useState<PostType>('text');
  const [isSticky, setIsSticky] = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLElement>(null);

  // Fetch posts data
  const {
    data: postsResponse,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useProfilePosts(profile?.username || '', { type: activeType });

  // Get content metrics
  const metricsQuery = useProfileMetrics(profile?.username || '');
  const metrics = metricsQuery.data || {
    followerCount: 0,
    followingCount: 0,
    postCounts: { writing: 0, video: 0, total: 0 },
    totalViews: 0,
    totalLikes: 0,
  };

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

  // Early return after hooks
  if (!profile) {
    return (
      <div className="content-area-loading text-center py-12">
        <p className="text-muted-foreground">Loading content...</p>
      </div>
    );
  }

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
        {activeType === 'video' ? (
          // Show videos when Videos tab is selected
          profile?.id && (
            <ProfileVideosSection
              userId={profile.id}
              isOwner={isOwner}
              className=""
              limit={12}
              showHeader={false}
            />
          )
        ) : (
          // Show posts when Articles tab is selected
          <ContentGrid
            posts={posts}
            loading={isLoading}
            onLoadMore={fetchNextPage}
            hasMore={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            error={error}
            activeType={activeType}
          />
        )}
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
  }[] = [
    { key: 'text', label: 'Articles', count: counts.writing },
    { key: 'video', label: 'Videos', count: counts.video },
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
  posts: ProfilePost[];
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
          <div className="p-3 space-y-2">
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
  post: ProfilePost;
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
    console.info('Navigate to post:', post.id);
  };

  return (
    <div
      className={`
      group 
      block 
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
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`View post: ${post.title}`}
    >
      {/* Thumbnail/Preview */}
      <div className="relative aspect-video bg-muted overflow-hidden">
        {post.thumbnailUrl ? (
          <img
            src={post.thumbnailUrl}
            alt={post.title}
            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-muted to-muted/60 flex items-center justify-center">
            <div className="h-12 w-12 text-muted-foreground/40">
              {post.postType === 'video' ? (
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18 3v2h-2V3H8v2H6V3H4v18h2v-2h2v2h8v-2h2v2h2V3h-2zM8 17H6v-2h2v2zm0-4H6v-2h2v2zm0-4H6V7h2v2zm10 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                </svg>
              )}
            </div>
          </div>
        )}

        {/* Play button overlay for videos */}
        {post.postType === 'video' && (
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
            <div className="bg-white/90 backdrop-blur-sm rounded-full p-3 transform scale-90 group-hover:scale-100 transition-transform duration-200">
              <div className="h-6 w-6 text-black fill-black ml-0.5">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          </div>
        )}

        {/* Duration badge for videos */}
        {post.postType === 'video' && post.readTime && (
          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
            {post.readTime} min
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3 space-y-2">
        {/* Title */}
        <h3 className="font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">
          {post.title}
        </h3>

        {/* Subtitle/Description */}
        {post.subtitle && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {post.subtitle}
          </p>
        )}

        {/* Meta */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div>
            {post.publishedAt
              ? new Date(post.publishedAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              : new Date(post.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
          </div>
          <div>{getTimeLabel(post.postType, post.readTime)}</div>
        </div>
      </div>
    </div>
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
          title: 'No Videos Yet',
          description: 'Videos will appear here when published.',
        };
      default:
        return {
          title: 'No Articles Yet',
          description: 'Articles will appear here when published.',
        };
    }
  };

  const state = getEmptyState(type);

  return (
    <div className="empty-content-state text-center py-12 space-y-4">
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
