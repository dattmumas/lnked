import { createServerSupabaseClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import ProfileFeed from '@/components/app/profile/ProfileFeed';
import type { MicroPost } from '@/components/app/profile/MicrothreadPanel';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import SubscribeButton from '@/components/app/newsletters/molecules/SubscribeButton';
import type { Database } from '@/lib/database.types';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';

type PostRow = Database['public']['Tables']['posts']['Row'];

export default async function Page({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const supabase = await createServerSupabaseClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('id, full_name, bio, avatar_url, tags')
    .eq('id', userId)
    .single();

  if (profileError || !profile) {
    console.error('Error fetching user', userId, profileError);
    notFound();
  }

  const { count: followerCount } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('following_id', userId);

  const { count: subscriberCount } = await supabase
    .from('subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('target_entity_type', 'user')
    .eq('target_entity_id', userId)
    .eq('status', 'active');

  const { data: postsData, error: postsError } = (await supabase.rpc(
    'get_user_feed',
    { p_user_id: userId },
  )) as { data: PostRow[] | null; error: unknown };

  if (postsError && typeof postsError === 'object' && 'message' in postsError) {
    console.error(
      'Error fetching posts for user',
      userId,
      (postsError as { message: string }).message,
    );
  }

  const posts =
    postsData?.map((p) => ({
      ...p,
      like_count: p.like_count ?? 0,
      dislike_count: p.dislike_count ?? 0,
      status: p.status ?? 'draft',
      tsv: p.tsv ?? null,
      view_count: p.view_count ?? 0,
      published_at: p.published_at ?? null,
      current_user_has_liked: undefined,
    })) ?? [];

  const microPosts: MicroPost[] = [
    { id: 'u1', content: 'Thanks for checking out my work!' },
    { id: 'u2', content: 'New article coming soon.' },
    { id: 'u3', content: 'Follow me for updates!' },
  ];

  const isOwner = authUser?.id === userId;

  return (
    <div className="container mx-auto p-4 md:p-6">
      <header className="mb-8 pb-6 border-b border-primary/10 flex flex-col items-center">
        <div className="flex flex-col items-center gap-2 mb-4">
          {profile.avatar_url && (
            <Image
              src={profile.avatar_url}
              alt={`${profile.full_name ?? 'User'} avatar`}
              width={96}
              height={96}
              className="rounded-full object-cover"
            />
          )}
          <h1 className="text-5xl font-extrabold tracking-tight text-center">
            {profile.full_name ?? 'User'}
          </h1>
          <p className="text-sm text-muted-foreground">
            <Link
              href={`/users/${profile.id}/followers`}
              className="hover:underline"
            >
              {followerCount ?? 0} follower
              {(followerCount ?? 0) === 1 ? '' : 's'}
            </Link>{' '}
            – {subscriberCount ?? 0} subscriber
            {(subscriberCount ?? 0) === 1 ? '' : 's'}
          </p>
          {profile.tags && profile.tags.length > 0 && (
            <div className="flex flex-wrap justify-center gap-1 mt-1">
              {profile.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  #{tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
        {profile.bio && (
          <div className="bg-card shadow rounded-xl p-6 max-w-2xl w-full text-center mx-auto">
            <p className="text-lg text-muted-foreground">{profile.bio}</p>
          </div>
        )}
        <div className="mt-4 w-full max-w-md">
          <form action="" className="flex items-center gap-2">
            <input
              type="search"
              name="q"
              placeholder="Search this profile..."
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm"
            />
            <Button type="submit" size="sm" variant="outline">
              Search
            </Button>
          </form>
        </div>
        {isOwner ? (
          <div className="mt-4">
            <Button asChild variant="outline">
              <Link href="/dashboard/profile/edit">Edit Profile</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-4">
            <SubscribeButton
              targetEntityType="user"
              targetEntityId={profile.id}
              targetName={profile.full_name ?? ''}
            />
          </div>
        )}
      </header>

      <main>
        {posts && posts.length > 0 ? (
          <ProfileFeed posts={posts} microPosts={microPosts} />
        ) : (
          <div className="text-center py-10">
            <h2 className="text-2xl font-semibold mb-2">No posts yet!</h2>
            <p className="text-muted-foreground">
              This user hasn&apos;t published any posts. Check back later!
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
