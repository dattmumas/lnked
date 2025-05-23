import { createServerSupabaseClient } from '@/lib/supabase/server';
import NewPostForm from './NewPostForm';
import { notFound, redirect } from 'next/navigation';

interface SearchParams {
  collectiveId?: string;
}

export default async function NewPostPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const supabase = await createServerSupabaseClient();
  const resolvedParams = await searchParams;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  let collective: { id: string; name: string; owner_id: string } | null = null;
  if (resolvedParams?.collectiveId) {
    const { data, error: collectiveError } = await supabase
      .from('collectives')
      .select('id, name, owner_id')
      .eq('id', resolvedParams.collectiveId)
      .single();
    if (collectiveError || !data) {
      notFound();
    }
    // Allow owner or member with editor/author/admin role
    if (data.owner_id !== user.id) {
      const { data: membership } = await supabase
        .from('collective_members')
        .select('role')
        .eq('collective_id', data.id)
        .eq('user_id', user.id)
        .maybeSingle<{ role: string }>();
      const allowed =
        membership && ['admin', 'editor', 'author'].includes(membership.role);
      if (!allowed) {
        notFound();
      }
    }
    collective = data;
  }

  const pageTitle = collective
    ? `New Post in ${collective.name}`
    : 'Create New Post';

  return <NewPostForm collective={collective} pageTitle={pageTitle} />;
}
