import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function LegacyPostIdPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('posts')
    .select('slug')
    .eq('id', postId)
    .single<{ slug: string }>();
  if (error || !data?.slug) {
    redirect('/');
  }
  redirect(`/posts/${data.slug}`);
}
