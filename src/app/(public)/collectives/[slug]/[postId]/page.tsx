import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';

export default async function LegacyCollectivePostPage({
  params,
}: {
  params: Promise<{ slug: string; postId: string }>;
}) {
  const { postId } = await params;
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('posts')
    .select('slug')
    .eq('id', postId)
    .single<{ slug: string }>();
  if (error || !data?.slug) {
    notFound();
  }
  redirect(`/posts/${data.slug}`);
}
