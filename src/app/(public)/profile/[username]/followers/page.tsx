import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function UserFollowersPage({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<React.ReactElement> {
  const { username } = await params;
  const supabase = await createServerSupabaseClient();

  // Get user by username
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id, username, full_name')
    .eq('username', username)
    .single();

  if (userError !== null || userData === null) {
    notFound();
  }

  // Get followers for this user
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
    .eq('following_id', userData.id)
    .eq('following_type', 'user')
    .order('created_at', { ascending: false });

  if (followersError !== null) {
    console.error('Error fetching followers:', followersError);
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-red-500">Error loading followers</p>
      </div>
    );
  }

  type FollowerData = {
    follower_id: string;
    created_at: string;
    follower: {
      id: string;
      username: string | null;
      full_name: string | null;
      avatar_url: string | null;
    };
  };

  type ProfileData = {
    id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };

  // Get user profile data for the followed users
  const { data: profilesData, error: profilesError } = await supabase
    .from('users')
    .select('id, username, full_name, avatar_url')
    .in(
      'id',
      (followersData ?? []).map((f: FollowerData) => f.follower_id),
    );

  if (profilesError !== null) {
    console.error('Error fetching user profiles:', profilesError);
  }

  // Combine follower data with profile data
  const followers = (followersData ?? []).map((f: FollowerData) => {
    const profile = (profilesData ?? []).find(
      (p: ProfileData) => p.id === f.follower_id,
    );
    return {
      id: f.follower_id,
      username: profile?.username ?? 'unknown',
      full_name: profile?.full_name ?? profile?.username ?? 'Unknown User',
      avatar_url: profile?.avatar_url,
      followed_at: f.created_at,
    };
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">
          {userData.full_name ?? userData.username} Followers
        </h1>
        <p className="text-muted-foreground">
          {followers.length} {followers.length === 1 ? 'follower' : 'followers'}
        </p>
      </div>

      <div className="grid gap-4">
        {followers.map((f) => (
          <div
            key={f.id}
            className="flex items-center justify-between p-4 border rounded-lg"
          >
            <div className="flex items-center gap-4">
              <Avatar>
                <AvatarImage src={f.avatar_url || undefined} />
                <AvatarFallback>
                  {f.full_name !== null && f.full_name !== undefined
                    ? f.full_name.charAt(0)
                    : f.username !== null && f.username !== undefined
                      ? f.username.charAt(0)
                      : '?'}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-medium">{f.full_name}</h3>
                {f.username !== null && f.username !== undefined ? (
                  <p className="text-sm text-muted-foreground">@{f.username}</p>
                ) : null}
              </div>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/profile/${f.username}`}>View Profile</Link>
            </Button>
          </div>
        ))}
      </div>

      {followers.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No followers yet</p>
        </div>
      )}
    </div>
  );
}
