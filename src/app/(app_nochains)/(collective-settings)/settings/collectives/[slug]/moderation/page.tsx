import { Suspense } from 'react';

import { createServerSupabaseClient } from '@/lib/supabase/server';

import { ModerationDashboardClient } from './ModerationDashboardClient';

function ModerationSkeleton() {
  return <div>Loading posts for moderation...</div>;
}

export default async function ModerationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Content Moderation</h1>
      <p className="text-muted-foreground mb-6">
        Review and moderate posts submitted to your collective.
      </p>
      <Suspense fallback={<ModerationSkeleton />}>
        <ModerationDataFetcher slug={slug} />
      </Suspense>
    </div>
  );
}

async function ModerationDataFetcher({ slug }: { slug: string }) {
  const supabase = await createServerSupabaseClient();

  const { data: collective } = await supabase
    .from('collectives')
    .select('id')
    .eq('slug', slug)
    .single();

  if (!collective) {
    return <div>Collective not found.</div>;
  }

  const { data: pendingPosts, error } = await supabase
    .from('post_collectives')
    .select(
      `
      post:posts!inner(id, title, created_at, author:users!author_id(full_name))
    `,
    )
    .eq('collective_id', collective.id)
    .eq('status', 'pending_approval');

  if (error) {
    console.error('Error fetching pending posts:', error);
    return <div>Failed to load posts for moderation.</div>;
  }

  const formattedPosts =
    pendingPosts?.map(({ post }) => ({
      id: post.id,
      title: post.title,
      submitted_at: post.created_at,
      author_name: post.author?.full_name || 'Unknown',
    })) || [];

  return (
    <ModerationDashboardClient
      initialPosts={formattedPosts}
      collectiveId={collective.id}
    />
  );
}
