import { createServerSupabaseClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Image from 'next/image';

export default async function Page({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('id, full_name')
    .eq('id', userId)
    .single();

  if (profileError || !profile) {
    notFound();
  }

  const { data: followersData, error: followersError } = await supabase
    .from('follows')
    .select(
      'follower_id, follower:users!follower_id(id, full_name, avatar_url)',
    )
    .eq('following_id', userId)
    .eq('following_type', 'user');

  if (followersError) {
    console.error('Error fetching followers:', followersError);
  }

  const followers = followersData ?? [];

  return (
    <div className="container mx-auto p-4 md:p-6">
      <h1 className="text-3xl font-bold mb-4">
        Followers of {profile.full_name ?? 'User'}
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
