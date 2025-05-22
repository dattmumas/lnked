import { createServerSupabaseClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Image from 'next/image';

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: collectiveData, error: collectiveError } = await supabase
    .from('collectives')
    .select('id, name')
    .eq('slug', slug)
    .single();

  if (collectiveError || !collectiveData) {
    notFound();
  }

  const { data: followersData, error: followersError } = await supabase
    .from('follows')
    .select(
      'follower_id, follower:users!follower_id(id, full_name, avatar_url)',
    )
    .eq('following_id', collectiveData.id)
    .eq('following_type', 'collective');

  if (followersError) {
    console.error('Error fetching followers:', followersError);
  }

  const followers = followersData ?? [];

  return (
    <div className="container mx-auto p-4 md:p-6">
      <h1 className="text-3xl font-bold mb-4">
        Followers of {collectiveData.name}
      </h1>
      {followers.length === 0 ? (
        <p className="text-muted-foreground">No followers yet.</p>
      ) : (
        <ul className="space-y-4">
          {followers.map((f) =>
            f.follower ? (
              <li key={f.follower.id} className="flex items-center gap-3">
                {f.follower.avatar_url && (
                  <Image
                    src={f.follower.avatar_url}
                    alt={`${f.follower.full_name ?? 'Follower'} avatar`}
                    width={40}
                    height={40}
                    className="rounded-full object-cover"
                  />
                )}
                <span className="font-medium">
                  {f.follower.full_name ?? 'User'}
                </span>
              </li>
            ) : null,
          )}
        </ul>
      )}
    </div>
  );
}
