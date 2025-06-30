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

// 🎓 Data Transformation: Convert server data to component-specific formats
// This demonstrates how SSR data flows through the component hierarchy

// Transform CollectivePost to TransformedPost (for FeaturedMedia)
function transformToFeaturedPost(post: CollectivePost): TransformedPost {
  return {
    id: post.id,
    title: post.title,
    subtitle: post.subtitle,
    thumbnail_url: post.thumbnail_url,
    post_type: post.post_type,
    published_at: post.published_at,
    author:
      post.author_profile?.full_name || post.author_profile?.username || null,
  };
}

// Transform CollectivePost to ArticlePost (for ArticleList)
function transformToArticlePost(post: CollectivePost): ArticlePost {
  return {
    id: post.id,
    title: post.title,
    subtitle: post.subtitle,
    published_at: post.published_at,
    post_type: post.post_type,
    like_count: post.like_count,
    view_count: post.view_count,
    author:
      post.author_profile?.full_name || post.author_profile?.username || null,
  };
}

interface CollectiveLayoutProps {
  collectiveSlug: string;
  initialData?: CollectivePageData;
}

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
      <div className="content-column space-y-6">
        {/* 🎓 Future Enhancement: AuthorCarousel can get server data */}
        <AuthorCarousel collectiveSlug={collectiveSlug} />

        {/* 🎓 SSR: ArticleList gets recent posts from server */}
        <ArticleList
          collectiveSlug={collectiveSlug}
          initialPosts={transformedRecentPosts}
        />
      </div>

      {/* Mobile Featured Media - Shows below carousel on smaller screens */}
      <div className="mobile-featured lg:hidden col-span-1">
        {/* 🎓 SSR: Same featured posts data for mobile */}
        <FeaturedMedia
          collectiveSlug={collectiveSlug}
          initialFeaturedPosts={transformedFeaturedPosts}
        />
      </div>
    </div>
  );
}
