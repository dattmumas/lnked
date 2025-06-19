import Image from 'next/image';
import { notFound } from 'next/navigation';

import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = createServerSupabaseClient();

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
    .select('follower_id')
    .eq('following_id', collectiveData.id);

  if (followersError) {
    console.error('Error fetching followers:', followersError);
  }

  // Get user data for each follower
  const followers = [];
  if (followersData && followersData.length > 0) {
    const followerIds = followersData.map((f) => f.follower_id);
    const { data: usersData } = await supabase
      .from('users')
      .select('id, full_name, avatar_url')
      .in('id', followerIds);

    if (usersData) {
      followers.push(...usersData.map((user) => ({ follower: user })));
    }
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <h1 className="text-3xl font-bold mb-4">
        Followers of {collectiveData.name}
      </h1>
      {followers.length === 0 ? (
        <p className="text-muted-foreground">No followers yet.</p>
      ) : (
        <ul className="space-y-4">
          {followers
            .filter((f) => f.follower)
            .map((f) => (
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
            ))}
        </ul>
      )}
    </div>
  );
}
