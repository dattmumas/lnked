import React from 'react';

import { ArticleList } from '../articles/ArticleList';
import { AuthorCarousel } from '../carousel/AuthorCarousel';
import { FeaturedMedia } from '../featured/FeaturedMedia';
import { CollectiveHero } from '../hero/CollectiveHero';

import type { ArticlePost } from '../articles/ArticleList';
import type { TransformedPost } from '../featured/FeaturedMedia';
import type {
  CollectivePageData,
  CollectivePost,
} from '@/lib/data-loaders/collective-loader';

// 🎓 Import Shared Types: Use the exported interfaces from components
// for better maintainability.
interface CollectiveLayoutProps {
  collectiveSlug: string;
  initialData?: CollectivePageData;
}

/**
 * Transforms a CollectivePost from the data loader into an ArticlePost
 * suitable for the ArticleList component.
 */
const transformToArticlePost = (post: CollectivePost): ArticlePost => ({
  id: post.id,
  title: post.title,
  subtitle: post.subtitle,
  published_at: post.published_at,
  post_type: post.post_type,
  like_count: post.like_count,
  view_count: post.view_count,
  author:
    post.author_profile?.full_name || post.author_profile?.username || null,
});

/**
 * Transforms a CollectivePost from the data loader into a TransformedPost
 * suitable for the FeaturedMedia component.
 */
const transformToFeaturedPost = (post: CollectivePost): TransformedPost => ({
  id: post.id,
  title: post.title,
  subtitle: post.subtitle,
  thumbnail_url: post.thumbnail_url,
  post_type: post.post_type,
  published_at: post.published_at,
  author:
    post.author_profile?.full_name || post.author_profile?.username || null,
});

export function CollectiveLayout({
  collectiveSlug,
  initialData,
}: CollectiveLayoutProps): React.ReactElement {
  // 🎓 SSR Data Flow: Server fetches data → passes to layout → distributes to components
  // This eliminates client-side loading states and improves performance

  // Transform server data to component-specific formats
  const transformedFeaturedPosts = initialData?.featuredPosts
    ? initialData.featuredPosts.map(transformToFeaturedPost)
    : undefined;

  const transformedRecentPosts = initialData?.recentPosts
    ? initialData.recentPosts.map(transformToArticlePost)
    : undefined;

  return (
    <div className="collective-layout grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-6 lg:gap-8 container mx-auto px-4 md:px-6 lg:px-8 py-6">
      {/* Left Column - 40% on desktop */}
      <div className="hero-column space-y-6">
        {/* 🎓 SSR: CollectiveHero gets server data, renders immediately */}
        <CollectiveHero
          collectiveSlug={collectiveSlug}
          initialData={initialData?.collective ?? null}
        />

        {/* 🎓 SSR: FeaturedMedia gets featured posts from server */}
        <FeaturedMedia
          collectiveSlug={collectiveSlug}
          initialFeaturedPosts={transformedFeaturedPosts}
          className="hidden lg:block"
        />
      </div>

      {/* Right Column - 60% on desktop */}
      <div className="main-content-column space-y-6">
        {/* 🎓 SSR: FeaturedMedia for mobile (different position in grid) */}
        <FeaturedMedia
          collectiveSlug={collectiveSlug}
          initialFeaturedPosts={transformedFeaturedPosts}
          className="lg:hidden"
        />

        {/* 🎓 SSR: AuthorCarousel gets member data from server */}
        <AuthorCarousel collectiveSlug={collectiveSlug} />

        {/* 🎓 SSR: ArticleList gets recent posts from server */}
        <ArticleList
          collectiveSlug={collectiveSlug}
          initialPosts={transformedRecentPosts}
        />
      </div>
    </div>
  );
}
