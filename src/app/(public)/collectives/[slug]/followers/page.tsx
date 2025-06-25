import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function CollectiveFollowersPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<React.ReactElement> {
  const { slug } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: collectiveData, error: collectiveError } = await supabase
    .from('collectives')
    .select('id, name')
    .eq('slug', slug)
    .single();

  if (collectiveError !== null || collectiveData === null) {
    notFound();
  }

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
    .eq('following_id', collectiveData.id)
    .eq('following_type', 'collective')
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

  const followers = (followersData ?? []).map((f: FollowerData) => ({
    id: f.follower.id,
    username: f.follower.username,
    full_name: f.follower.full_name,
    avatar_url: f.follower.avatar_url,
    followed_at: f.created_at,
  }));

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">
          {collectiveData.name} Followers
        </h1>
        <p className="text-muted-foreground">
          {followers.length} {followers.length === 1 ? 'follower' : 'followers'}
        </p>
      </div>

      <div className="grid gap-4">
        {followers.map((user) => (
          <div
            key={user.id}
            className="flex items-center justify-between p-4 border rounded-lg"
          >
            <div className="flex items-center gap-4">
              <Avatar>
                <AvatarImage src={user.avatar_url || undefined} />
                <AvatarFallback>
                  {user.full_name !== null && user.full_name !== undefined
                    ? user.full_name.charAt(0)
                    : user.username !== null && user.username !== undefined
                      ? user.username.charAt(0)
                      : '?'}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-medium">
                  {user.full_name !== null && user.full_name !== undefined
                    ? user.full_name
                    : (user.username ?? 'Unknown User')}
                </h3>
                {user.username !== null && user.username !== undefined ? (
                  <p className="text-sm text-muted-foreground">
                    @{user.username}
                  </p>
                ) : null}
              </div>
            </div>
            {user.username !== null && user.username !== undefined ? (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/profile/${user.username}`}>View Profile</Link>
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled>
                No Profile
              </Button>
            )}
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
