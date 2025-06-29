import { CollectiveLayout } from '@/components/app/collectives/layout/CollectiveLayout';
import { loadCollectiveData } from '@/lib/data-loaders/collective-loader';

// Enable ISR with 10-minute revalidation for collective pages
// Collective data changes less frequently than general content
export const revalidate = 600; // 10 minutes

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<React.JSX.Element> {
  const { slug } = await params;

  // Load collective data server-side
  const collectiveData = await loadCollectiveData(slug);

  return (
    <CollectiveLayout collectiveSlug={slug} initialData={collectiveData} />
  );
}
