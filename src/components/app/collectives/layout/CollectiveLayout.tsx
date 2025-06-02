'use client';

import React from 'react';
import { CollectiveHero } from '../hero/CollectiveHero';
import { AuthorCarousel } from '../carousel/AuthorCarousel';
import { FeaturedMedia } from '../featured/FeaturedMedia';
import { ArticleList } from '../articles/ArticleList';

interface CollectiveLayoutProps {
  collectiveSlug: string;
}

export function CollectiveLayout({ collectiveSlug }: CollectiveLayoutProps) {
  return (
    <div className="collective-layout grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-6 lg:gap-8 container mx-auto px-4 md:px-6 lg:px-8 py-6">
      {/* Left Column - 40% on desktop */}
      <div className="hero-column space-y-6">
        <CollectiveHero collectiveSlug={collectiveSlug} />
        <FeaturedMedia
          collectiveSlug={collectiveSlug}
          className="hidden lg:block"
        />
      </div>

      {/* Right Column - 60% on desktop */}
      <div className="content-column space-y-6">
        <AuthorCarousel collectiveSlug={collectiveSlug} />
        <ArticleList collectiveSlug={collectiveSlug} />
      </div>

      {/* Mobile Featured Media - Shows below carousel on smaller screens */}
      <div className="mobile-featured lg:hidden col-span-1">
        <FeaturedMedia collectiveSlug={collectiveSlug} />
      </div>
    </div>
  );
}
