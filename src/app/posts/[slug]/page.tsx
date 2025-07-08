import { headers } from 'next/headers';
import { notFound } from 'next/navigation';

import { fetchPost } from '@/lib/posts';
import { createServerSupabaseClient } from '@/lib/supabase/server';

import PostLoader from './PostLoader';

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<React.ReactElement> {
  const { slug } = await params;
  const headersList = await headers();
  const viewerId = headersList.get('x-user-id') ?? undefined;

  const supabase = await createServerSupabaseClient();

  try {
    const { post, viewer } = await fetchPost(supabase, slug, viewerId);

    return <PostLoader post={post} viewer={viewer} />;
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === '404' || error.message === '403')
    ) {
      notFound();
    }
    // Re-throw other errors
    throw error;
  }
}
