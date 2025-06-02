import { CollectiveLayout } from '@/components/app/collectives/layout/CollectiveLayout';

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return <CollectiveLayout collectiveSlug={slug} />;
}
