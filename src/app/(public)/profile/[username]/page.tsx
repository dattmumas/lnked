import { createServerSupabaseClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import {
  ProfileLayout,
  ProfileContentGrid,
  ProfileHeroContainer,
  SocialSidebarContainer,
  ContentAreaContainer,
} from '@/components/app/profile/layout/ProfileLayout';
import { ProfileHero } from '@/components/app/profile/hero/ProfileHero';
import { SocialSidebar } from '@/components/app/profile/social/SocialSidebar';
import { ContentArea } from '@/components/app/profile/content/ContentArea';
import type { MicroPost } from '@/components/app/profile/MicrothreadPanel';
import type { Database } from '@/lib/database.types';

type PostRow = Database['public']['Tables']['posts']['Row'];

// Enable ISR with 5-minute revalidation for profile pages
// Profile data may change more frequently than collective data
export const revalidate = 300; // 5 minutes

export default async function ProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { username } = await params;
  const { q } = await searchParams;
  const supabase = await createServerSupabaseClient();

  // Server-side user verification for basic access control
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  // Basic profile existence check
  let profile;
  if (username) {
    const { data: profileData } = await supabase
      .from('users')
      .select('id, username, full_name, bio, avatar_url, tags')
      .eq('username', username)
      .single();

    if (profileData) {
      profile = profileData;
    } else {
      // If username lookup failed, try by ID (backward compatibility)
      const { data: idProfileData, error: idError } = await supabase
        .from('users')
        .select('id, username, full_name, bio, avatar_url, tags')
        .eq('id', username)
        .single();

      profile = idProfileData;
      if (idError || !profile) {
        notFound();
      }
    }
  }

  if (!profile) {
    notFound();
  }

  // Get follower and subscriber counts using optimized queries
  const [
    { count: _followerCount },
    { count: _subscriberCount },
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

  const _isFollowing = Boolean(followData);

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
  // TODO: Fix subscription status check for user profiles
  // const subscriptionStatus = await getSubscriptionStatus('user', profile.id);
  // const isSubscribed = subscriptionStatus?.isSubscribed;
  const isSubscribed = false; // Temporarily disabled

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

  const _posts =
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

  const _pinned = pinnedPost && {
    ...pinnedPost,
    like_count: pinnedPost.like_count ?? 0,
    dislike_count: pinnedPost.dislike_count ?? 0,
    status: pinnedPost.status ?? 'draft',
    tsv: pinnedPost.tsv ?? null,
    view_count: pinnedPost.view_count ?? 0,
    published_at: pinnedPost.published_at ?? null,
    current_user_has_liked: undefined,
  };

  const _microPosts: MicroPost[] = [
    { id: 'u1', content: 'Thanks for checking out my work!' },
    { id: 'u2', content: 'New article coming soon.' },
    { id: 'u3', content: 'Follow me for updates!' },
  ];

  type SubscriptionTier = Database['public']['Tables']['prices']['Row'];
  let _tiers: SubscriptionTier[] = [];
  const defaultPriceId = process.env.NEXT_PUBLIC_STRIPE_DEFAULT_PRICE_ID;
  if (defaultPriceId) {
    const { data: price } = (await supabase
      .from('prices')
      .select('id, unit_amount, currency, interval, description')
      .eq('id', defaultPriceId)
      .maybeSingle()) as { data: SubscriptionTier | null };
    if (price) _tiers = [price];
  }

  return (
    <ProfileLayout username={profile.username || username}>
      <ProfileContentGrid>
        {/* Profile Hero Section - 65% width on desktop */}
        <ProfileHeroContainer>
          <ProfileHero />
        </ProfileHeroContainer>

        {/* Social Sidebar - 35% width on desktop */}
        <SocialSidebarContainer>
          <SocialSidebar />
        </SocialSidebarContainer>

        {/* Content Area - Full width below hero and sidebar */}
        <ContentAreaContainer>
          <ContentArea />
        </ContentAreaContainer>
      </ProfileContentGrid>
    </ProfileLayout>
  );
}
