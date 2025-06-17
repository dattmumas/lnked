import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function Page({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const supabase = await createServerSupabaseClient();

  // First try to find user by username, if not found try by ID (for backward compatibility)
  let profile;
  let profileError;

  if (username) {
    const { data: profileData } = await supabase
      .from('users')
      .select('id, username, full_name')
      .eq('username', username)
      .single();

    if (profileData) {
      profile = profileData;
      profileError = null;
    } else {
      // If username lookup failed, try by ID (backward compatibility)
      const { data: idProfileData, error: idError } = await supabase
        .from('users')
        .select('id, username, full_name')
        .eq('id', username)
        .single();

      profile = idProfileData;
      profileError = idError;
    }
  }

  if (profileError || !profile) {
    console.error('Error fetching user', username, profileError);
    notFound();
  }

  // Fetch followers using the updated table structure
  const { data: followersData, error: followersError } = await supabase
    .from('follows')
    .select(
      `
      follower_id,
      created_at,
      follower:users!follower_id(
        id,
        username,
        full_name,
        avatar_url
      )
    `,
    )
    .eq('following_id', profile.id)
    .eq('following_type', 'user')
    .order('created_at', { ascending: false });

  if (followersError) {
    console.error('Error fetching followers:', followersError);
  }

  const followers = followersData ?? [];

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex items-center gap-4 mb-6">
        <Button asChild variant="outline" size="sm">
          <Link href={`/profile/${profile.username || profile.id}`}>
            ← Back to Profile
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">
          Followers of {profile.full_name ?? 'User'}
        </h1>
      </div>

      {followers.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-muted-foreground text-lg mb-2">
            No followers yet.
          </p>
          <p className="text-sm text-muted-foreground">
            Be the first to follow {profile.full_name ?? 'this user'}!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-muted-foreground mb-4">
            {followers.length} follower{followers.length === 1 ? '' : 's'}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {followers.map((f) =>
              f.follower ? (
                <div
                  key={f.follower.id}
                  className="flex items-center gap-3 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  {f.follower.avatar_url ? (
                    <Image
                      src={f.follower.avatar_url}
                      alt={`${f.follower.full_name ?? 'Follower'} avatar`}
                      width={48}
                      height={48}
                      className="rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                      <span className="text-lg font-semibold">
                        {(f.follower.full_name ??
                          f.follower.username ??
                          'U')[0].toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/profile/${f.follower.username || f.follower.id}`}
                      className="block"
                    >
                      <p className="font-medium truncate hover:underline">
                        {f.follower.full_name ?? 'User'}
                      </p>
                      {f.follower.username && (
                        <p className="text-sm text-muted-foreground truncate">
                          @{f.follower.username}
                        </p>
                      )}
                    </Link>
                  </div>
                </div>
              ) : null,
            )}
          </div>
        </div>
      )}
    </div>
  );
}
