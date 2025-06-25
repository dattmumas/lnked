import { notFound } from 'next/navigation';

import FollowerList from '@/components/app/profile/FollowerList';
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

  // Get followers with their profile data in a single optimized query
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

  // Transform data for the FollowerList component
  const followers = (followersData ?? []).map((f: FollowerData) => ({
    id: f.follower.id,
    username: f.follower.username,
    full_name: f.follower.full_name,
    avatar_url: f.follower.avatar_url,
    followed_at: f.created_at,
  }));

  return (
    <FollowerList
      followers={followers}
      entityName={userData.full_name ?? userData.username ?? 'Unknown User'}
      entityType="user"
    />
  );
}
