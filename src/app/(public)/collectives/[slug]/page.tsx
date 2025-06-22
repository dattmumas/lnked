import { CollectiveLayout } from '@/components/app/collectives/layout/CollectiveLayout';

// Enable ISR with 10-minute revalidation for collective pages
// Collective data changes less frequently than general content
export const revalidate = 600; // 10 minutes

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<React.JSX.Element> {
  const { slug } = await params;

  return <CollectiveLayout collectiveSlug={slug} />;
}
