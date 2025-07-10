'use client';

import { CollectiveHero } from '@/components/app/collectives/layout/CollectiveHero';
import { ContentArea } from '@/components/app/profile/content/ContentArea';
import { useCollectivePosts } from '@/hooks/useCollectiveData';

export function CollectivePageClient({ slug }: { slug: string }) {
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useCollectivePosts(slug);

  const posts = data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <div className="container mx-auto max-w-5xl p-4 md:p-6 lg:p-8">
      <CollectiveHero />
      <div className="mt-8">
        <ContentArea
          posts={posts}
          isLoading={isLoading}
          error={error}
          fetchNextPage={fetchNextPage}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
        />
      </div>
    </div>
  );
}
