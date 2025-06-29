import React from 'react';

import { ArticleList } from '../articles/ArticleList';
import { AuthorCarousel } from '../carousel/AuthorCarousel';
import { FeaturedMedia } from '../featured/FeaturedMedia';
import { CollectiveHero } from '../hero/CollectiveHero';

import type { CollectivePageData } from '@/lib/data-loaders/collective-loader';

interface CollectiveLayoutProps {
  collectiveSlug: string;
  initialData?: CollectivePageData;
}

export function CollectiveLayout({
  collectiveSlug,
  initialData,
}: CollectiveLayoutProps): React.ReactElement {
  // TODO: Pass initial data to sub-components once they support it
  // For now, the data loading infrastructure is in place

  return (
    <div className="collective-layout grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-6 lg:gap-8 container mx-auto px-4 md:px-6 lg:px-8 py-6">
      {/* Left Column - 40% on desktop */}
      <div className="hero-column space-y-6">
        <CollectiveHero
          collectiveSlug={collectiveSlug}
          initialData={initialData?.collective ?? null}
        />
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
