import { createServerSupabaseClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import ProfileFeed from '@/components/app/profile/ProfileFeed';
import type { MicroPost } from '@/components/app/profile/MicrothreadPanel';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import SubscribeButton from '@/components/app/newsletters/molecules/SubscribeButton';
import FollowCollectiveButton from '@/components/FollowCollectiveButton';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import type { Database } from '@/lib/database.types';

export default async function Page({
  params,
}: {
  params: Promise<{ collectiveSlug: string }>;
}) {
  const { collectiveSlug } = await params;
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser(); // Get user early for like status

  // Fetch collective details by slug
  const { data: collectiveData, error: collectiveError } = await supabase
    .from('collectives')
    .select(
      'id, name, description, owner_id, tags, logo_url, owner:users!owner_id(full_name)',
    )
    .eq('slug', collectiveSlug)
    .single();

  const collective = collectiveData as
    | (Database['public']['Tables']['collectives']['Row'] & {
        owner: { full_name: string | null } | null;
      })
    | null;

  if (collectiveError || !collective) {
    console.error(
      `Error fetching collective ${collectiveSlug}:`,
      collectiveError,
    );
    notFound();
  }

  // Count members in the collective
  const { count: memberCount } = await supabase
    .from('collective_members')
    .select('*', { count: 'exact', head: true })
    .eq('collective_id', collective.id);

  const { count: followerCount } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('following_id', collective.id)
    .eq('following_type', 'collective');

  let initialIsFollowing = false;
  if (user && user.id !== collective.owner_id) {
    const { count, error: followError } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', user.id)
      .eq('following_id', collective.id)
      .eq('following_type', 'collective');
    if (followError) {
      console.error('Error checking follow status:', followError.message);
    } else if (count !== null && count > 0) {
      initialIsFollowing = true;
    }
  }

  // Fetch posts for this collective using denormalized like/dislike counts
  const { data: postsData, error: postsError } = await supabase
    .from('posts')
    .select(`*, view_count`)
    .eq('collective_id', collective.id)
    .eq('is_public', true)
    .order('pinned_at', { ascending: false })
    .order('created_at', { ascending: false });

  if (postsError) {
    console.error(
      `Error fetching posts for collective ${collective.id}:`,
      postsError,
    );
    // Decide how to handle this - e.g., show an error message or empty state
  }

  const posts =
    postsData?.map((p) => ({
      ...p,
      like_count: p.like_count ?? 0,
      dislike_count: p.dislike_count ?? 0,
      current_user_has_liked: undefined, // Will be determined client-side
      collective_slug: collectiveSlug,
    })) || [];

  const microPosts: MicroPost[] = [
    { id: 'm1', content: 'Welcome to our new readers!' },
    { id: 'm2', content: 'Recording a podcast episode today.' },
    { id: 'm3', content: 'Check out our latest article below.' },
  ];

  // Check if current user is the owner of the collective to show edit/new post links
  const isOwner = user?.id === collective.owner_id;

  return (
    <div className="container mx-auto p-4 md:p-6">
      <header className="mb-8 pb-6 border-b border-primary/10 flex flex-col items-center">
        <div className="flex flex-col items-center gap-2 mb-4">
          {collective.logo_url ? (
            <Image
              src={collective.logo_url}
              alt={`${collective.name} logo`}
              width={96}
              height={96}
              className="rounded-full object-cover"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
              <span className="text-3xl">🤝</span>
            </div>
          )}
          <h1 className="text-5xl font-extrabold tracking-tight text-center flex items-center">
            {collective.name}
            <span
              className="ml-2 text-primary text-5xl leading-none align-middle"
              style={{ fontWeight: 900 }}
            >
              .
            </span>
          </h1>
          <p className="text-sm text-muted-foreground">
            {collective.owner?.full_name
              ? `Owned by ${collective.owner.full_name} – `
              : ''}
            <Link
              href={`/${collectiveSlug}/followers`}
              className="hover:underline"
            >
              {followerCount ?? 0} follower
              {(followerCount ?? 0) === 1 ? '' : 's'}
            </Link>{' '}
            – {memberCount ?? 0} member{(memberCount ?? 0) === 1 ? '' : 's'}
          </p>
          {collective.tags && collective.tags.length > 0 && (
            <div className="flex flex-wrap justify-center gap-1 mt-1">
              {collective.tags.map((tag: string) => (
                <Badge key={tag} variant="secondary">
                  #{tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
        {collective.description && (
          <div className="bg-card shadow rounded-xl p-6 max-w-2xl w-full text-center mx-auto">
            <p className="text-lg text-muted-foreground">
              {collective.description}
            </p>
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
        {user?.id !== collective.owner_id && (
          <div className="mt-4 flex gap-2">
            <FollowCollectiveButton
              targetCollectiveId={collective.id}
              targetCollectiveName={collective.name}
              initialIsFollowing={initialIsFollowing}
              currentUserId={user?.id}
            />
            <SubscribeButton
              targetEntityType="collective"
              targetEntityId={collective.id}
              targetName={collective.name}
            />
          </div>
        )}
        {isOwner && (
          <div className="mt-4 flex gap-2">
            <Button asChild variant="outline">
              <Link href={`/posts/new?collectiveId=${collective.id}`}>
                Create New Post
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/dashboard/collectives/${collective.id}/settings`}>
                Edit Collective
              </Link>
            </Button>
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
              This collective hasn&apos;t published any posts. Check back later!
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
