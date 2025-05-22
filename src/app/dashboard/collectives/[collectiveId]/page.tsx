import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default async function CollectiveDashboardPage({
  params,
}: {
  params: Promise<{ collectiveId: string }>;
}) {
  const { collectiveId } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user: currentUser },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !currentUser) {
    redirect('/sign-in');
  }
  const { data: collective, error: collectiveError } = await supabase
    .from('collectives')
    .select('id, name, owner_id')
    .eq('id', collectiveId)
    .single();
  if (collectiveError || !collective) {
    redirect('/dashboard/collectives');
  }
  const isOwner = currentUser.id === collective.owner_id;
  return (
    <div className="container mx-auto max-w-2xl p-6">
      <h1 className="text-3xl font-bold mb-4">{collective.name}</h1>
      <div className="flex flex-wrap gap-4 mb-8">
        <Link href={`/posts/new?collectiveId=${collectiveId}`}>
          <Button variant="default">Add Post</Button>
        </Link>
        <Link href={`/dashboard/collectives/${collectiveId}/manage/members`}>
          <Button variant="outline">Members</Button>
        </Link>
        {isOwner && (
          <>
            <Link href={`/dashboard/collectives/${collectiveId}/settings`}>
              <Button variant="outline">Settings</Button>
            </Link>
            <Link href={`/dashboard/collectives/${collectiveId}/subscribers`}>
              <Button variant="outline">Subscribers</Button>
            </Link>
          </>
        )}
      </div>
      <p className="text-muted-foreground">
        Welcome to the {collective.name} dashboard. Use the links above to
        manage posts, members, and settings.
      </p>
    </div>
  );
}
