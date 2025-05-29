import { createServerSupabaseClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import ProfileFeed from '@/components/app/profile/ProfileFeed';
import type { MicroPost } from '@/components/app/profile/MicrothreadPanel';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import SubscribeButton from '@/components/app/newsletters/molecules/SubscribeButton';
import FollowButton from '@/components/FollowButton';
import type { Database } from '@/lib/database.types';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { getSubscriptionStatus } from '@/app/actions/subscriptionActions';

type PostRow = Database['public']['Tables']['posts']['Row'];

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { username } = await params;
  const { q } = await searchParams;
  const supabase = await createServerSupabaseClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  // First try to find user by username, if not found try by ID (for backward compatibility)
  let profile;
  let profileError;

  if (username) {
    const { data: profileData } = await supabase
      .from('users')
      .select('id, username, full_name, bio, avatar_url, tags')
      .eq('username', username)
      .single();

    if (profileData) {
      profile = profileData;
      profileError = null;
    } else {
      // If username lookup failed, try by ID (backward compatibility)
      const { data: idProfileData, error: idError } = await supabase
        .from('users')
        .select('id, username, full_name, bio, avatar_url, tags')
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

  // Get follower and subscriber counts using optimized queries
  const [
    { count: followerCount },
    { count: subscriberCount },
    { data: followData },
  ] = await Promise.all([
    // Get follower count using the updated table structure
    supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', profile.id)
      .eq('following_type', 'user'),
    // Get subscriber count
    supabase
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('target_entity_type', 'user')
      .eq('target_entity_id', profile.id)
      .eq('status', 'active'),
    // Check if current user is following this profile (only if authenticated)
    authUser
      ? supabase
          .from('follows')
          .select('*')
          .eq('follower_id', authUser.id)
          .eq('following_id', profile.id)
          .eq('following_type', 'user')
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const isFollowing = Boolean(followData);

  let postsQuery = supabase
    .from('posts')
    .select('*')
    .eq('author_id', profile.id)
    .order('published_at', { ascending: false });

  const { data: featuredData } = await supabase
    .from('featured_posts')
    .select('post_id')
    .eq('owner_id', profile.id)
    .eq('owner_type', 'user')
    .maybeSingle();

  let pinnedPost: PostRow | null = null;
  if (featuredData?.post_id) {
    const { data } = await supabase
      .from('posts')
      .select('*')
      .eq('id', featuredData.post_id)
      .maybeSingle<PostRow>();
    if (data) pinnedPost = data;
    postsQuery = postsQuery.neq('id', featuredData.post_id);
  }

  const isOwner = authUser?.id === profile.id;
  const subscriptionStatus = await getSubscriptionStatus('user', profile.id);
  const isSubscribed = subscriptionStatus?.isSubscribed;

  if (isOwner) {
    // Owners can see all their posts
  } else if (isSubscribed) {
    postsQuery = postsQuery.not('published_at', 'is', null);
  } else {
    postsQuery = postsQuery
      .eq('is_public', true)
      .not('published_at', 'is', null);
  }

  if (q && q.trim().length > 0) {
    postsQuery = postsQuery.textSearch('tsv', q, {
      type: 'websearch',
    });
  }

  const { data: postsData, error: postsError } = (await postsQuery) as {
    data: PostRow[] | null;
    error: unknown;
  };

  if (postsError && typeof postsError === 'object' && 'message' in postsError) {
    console.error(
      'Error fetching posts for user',
      username,
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

  const pinned = pinnedPost && {
    ...pinnedPost,
    like_count: pinnedPost.like_count ?? 0,
    dislike_count: pinnedPost.dislike_count ?? 0,
    status: pinnedPost.status ?? 'draft',
    tsv: pinnedPost.tsv ?? null,
    view_count: pinnedPost.view_count ?? 0,
    published_at: pinnedPost.published_at ?? null,
    current_user_has_liked: undefined,
  };

  const microPosts: MicroPost[] = [
    { id: 'u1', content: 'Thanks for checking out my work!' },
    { id: 'u2', content: 'New article coming soon.' },
    { id: 'u3', content: 'Follow me for updates!' },
  ];

  type SubscriptionTier = Database['public']['Tables']['prices']['Row'];
  let tiers: SubscriptionTier[] = [];
  const defaultPriceId = process.env.NEXT_PUBLIC_STRIPE_DEFAULT_PRICE_ID;
  if (defaultPriceId) {
    const { data: price } = (await supabase
      .from('prices')
      .select('id, unit_amount, currency, interval, description')
      .eq('id', defaultPriceId)
      .maybeSingle()) as { data: SubscriptionTier | null };
    if (price) tiers = [price];
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <header className="mb-8 pb-6 border-b border-accent/10 flex flex-col items-center">
        <div className="flex flex-col items-center gap-2 mb-4">
          {profile.avatar_url && (
            <Image
              src={profile.avatar_url}
              alt={`${profile.full_name ?? 'User'} avatar`}
              width={160}
              height={160}
              className="rounded-full object-cover"
            />
          )}
          <h1 className="text-5xl font-extrabold tracking-tight text-center">
            {profile.full_name ?? 'User'}
          </h1>
          <p className="text-sm text-muted-foreground">
            <Link
              href={`/profile/${profile.username || profile.id}/followers`}
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
          <div className="mt-4 space-y-4">
            {/* Follow Section - Free notifications */}
            <div className="text-center">
              <FollowButton
                targetUserId={profile.id}
                targetUserName={profile.full_name ?? 'User'}
                initialIsFollowing={isFollowing}
                currentUserId={authUser?.id}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Get notified when {profile.full_name ?? 'this user'} publishes
                new posts
              </p>
            </div>

            {/* Subscribe Section - Paid access */}
            <div className="text-center">
              <SubscribeButton
                targetEntityType="user"
                targetEntityId={profile.id}
                targetName={profile.full_name ?? ''}
                tiers={tiers}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Access exclusive content and support{' '}
                {profile.full_name ?? 'this creator'}
              </p>
            </div>
          </div>
        )}
      </header>

      <main>
        {posts && posts.length > 0 ? (
          <ProfileFeed
            posts={posts}
            pinnedPost={pinned ?? undefined}
            microPosts={microPosts}
          />
        ) : (
          <div className="text-center py-10">
            {q ? (
              <>
                <h2 className="text-2xl font-semibold mb-2">
                  No posts found for your search.
                </h2>
                <p className="text-muted-foreground">
                  Try a different search term.
                </p>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-semibold mb-2">No posts yet!</h2>
                <p className="text-muted-foreground">
                  This user hasn&apos;t published any posts. Check back later!
                </p>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
