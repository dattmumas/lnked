import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Button } from '@/components/primitives/Button';
import { Card } from '@/components/primitives/Card';
import StatsRow from '@/components/app/dashboard/organisms/StatsRow';
import {
  BookOpen,
  Rss,
  Plus,
  AlertCircle,
  Info,
  List,
  Video,
} from 'lucide-react';
import RecentPostRow from '@/components/app/dashboard/organisms/RecentPostRow';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { redirect } from 'next/navigation';
import Link from 'next/link';

const MAX_RECENT_PERSONAL_POSTS_DISPLAY = 3;

type PersonalPost = {
  id: string;
  title: string;
  published_at: string | null;
  created_at: string;
  is_public: boolean;
  collective_id: string | null;
};

type OwnedCollective = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
};

type DashboardStats = {
  subscriber_count: number;
  follower_count: number;
  total_views: number;
  total_likes: number;
  published_this_month: number;
  total_posts: number;
  collective_count: number;
};

type DashboardContent = {
  profile: {
    username: string | null;
    full_name?: string | null;
    avatar_url?: string | null;
  } | null;
  recent_posts: PersonalPost[];
  owned_collectives: OwnedCollective[];
};

export const dynamic = 'force-dynamic';

export default async function DashboardManagementPage() {
  const supabase = await createServerSupabaseClient();

  // Get session to retrieve user reliably
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    redirect('/sign-in?redirect=/dashboard');
  }

  const userId = session.user.id;

  // OPTIMIZATION: Use parallel queries instead of serial
  // Reduced from 7 serial queries to 2 parallel RPC calls
  // Fall back to individual queries if RPC functions are not available
  let dashboardStats, dashboardContent;

  try {
    const [dashboardStatsResult, dashboardContentResult] = await Promise.all([
      supabase
        .rpc('get_user_dashboard_stats', { user_id_param: userId })
        .single()
        .then(
          (res) => res as { data: DashboardStats | null; error: Error | null },
        ),

      supabase
        .rpc('get_user_dashboard_content', {
          user_id_param: userId,
          posts_limit: MAX_RECENT_PERSONAL_POSTS_DISPLAY,
        })
        .single()
        .then(
          (res) =>
            res as { data: DashboardContent | null; error: Error | null },
        ),
    ]);

    // Handle potential errors from RPC calls
    if (dashboardStatsResult.error) {
      console.log(
        'Dashboard stats RPC not available, falling back to individual queries:',
        dashboardStatsResult.error,
      );
      throw new Error(
        'RPC function not available, falling back to individual queries',
      );
    }

    if (dashboardContentResult.error) {
      console.log(
        'Dashboard content RPC not available, falling back to individual queries:',
        dashboardContentResult.error,
      );
      throw new Error(
        'RPC function not available, falling back to individual queries',
      );
    }

    // Parse RPC results - dashboardStats is now a direct object from table return
    dashboardStats = dashboardStatsResult.data || {
      subscriber_count: 0,
      follower_count: 0,
      total_views: 0,
      total_likes: 0,
      published_this_month: 0,
      total_posts: 0,
      collective_count: 0,
    };

    // Parse content result - this returns JSON so we need to parse it
    const dashboardContentData = dashboardContentResult.data;
    dashboardContent = dashboardContentData || {
      profile: { username: null },
      recent_posts: [],
      owned_collectives: [],
    };
  } catch (error) {
    console.log('Falling back to individual queries:', error);

    // FALLBACK: Use individual queries if RPC functions are not available
    const [
      subscriberCountResult,
      followerCountResult,
      profileResult,
      postsResult,
      collectivesResult,
    ] = await Promise.all([
      supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('target_entity_type', 'user')
        .eq('target_entity_id', userId)
        .eq('status', 'active'),

      supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', userId)
        .eq('following_type', 'user'),

      supabase
        .from('users')
        .select('username, full_name, avatar_url')
        .eq('id', userId)
        .single(),

      supabase
        .from('posts')
        .select('id, title, published_at, created_at, is_public, collective_id')
        .eq('author_id', userId)
        .is('collective_id', null)
        .order('created_at', { ascending: false })
        .limit(MAX_RECENT_PERSONAL_POSTS_DISPLAY),

      supabase
        .from('collectives')
        .select('id, name, slug, description')
        .eq('owner_id', userId)
        .order('name', { ascending: true }),
    ]);

    // Build stats from individual query results
    dashboardStats = {
      subscriber_count: subscriberCountResult.count || 0,
      follower_count: followerCountResult.count || 0,
      total_views: 0, // TODO: Add post view aggregation
      total_likes: 0, // TODO: Add post like aggregation
      published_this_month: 0, // TODO: Add monthly post count
      total_posts: 0, // TODO: Add total post count
      collective_count: collectivesResult.data?.length || 0,
    };

    // Build content from individual query results
    dashboardContent = {
      profile: profileResult.data || { username: null },
      recent_posts: postsResult.data || [],
      owned_collectives: collectivesResult.data || [],
    };
  }

  const {
    profile,
    recent_posts: personalPosts,
    owned_collectives: ownedCollectives,
  } = dashboardContent;
  const username = profile?.username;

  return (
    <div className="pattern-stack gap-section">
      {/* Enhanced Stats Row with design system integration */}
      <StatsRow
        subscriberCount={dashboardStats.subscriber_count}
        followerCount={dashboardStats.follower_count}
        totalPosts={dashboardStats.total_posts}
        collectiveCount={dashboardStats.collective_count}
        totalViews={dashboardStats.total_views}
        totalLikes={dashboardStats.total_likes}
        monthlyRevenue={0} // TODO: Implement when payment system is ready
        pendingPayout={0} // TODO: Implement when payout system is ready
        openRate="0%" // TODO: Implement when email tracking is ready
        publishedThisMonth={dashboardStats.published_this_month}
      />

      {/* Enhanced main content sections with improved grid */}
      <div className="content-grid-dashboard">
        {/* Individual Newsletter - Enhanced with design tokens */}
        <Card size="lg" className="pattern-card micro-interaction">
          <div className="pattern-stack">
            {/* Enhanced header with better typography */}
            <div className="flex items-center gap-component">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-surface-elevated-2 border border-border-subtle">
                <Rss className="h-5 w-5 text-content-accent" />
              </div>
              <div>
                <h2 className="text-content-primary font-semibold text-lg tracking-tight">
                  My Content
                </h2>
                <p className="text-content-secondary text-sm">
                  Personal posts and articles
                </p>
              </div>
            </div>

            {/* Enhanced action buttons with improved spacing */}
            <div className="flex flex-wrap gap-component">
              <Button
                variant="default"
                size="sm"
                leftIcon={<Plus className="h-4 w-4" />}
                className="micro-interaction btn-scale"
                asChild
              >
                <Link href="/posts/new">Write New Post</Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Video className="h-4 w-4" />}
                className="micro-interaction nav-hover"
                asChild
              >
                <Link href="/videos">Video Management</Link>
              </Button>
              {username && (
                <Button
                  variant="outline"
                  size="sm"
                  className="micro-interaction nav-hover"
                  asChild
                >
                  <Link href={`/profile/${username}`}>View Profile</Link>
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="micro-interaction nav-hover"
                asChild
              >
                <Link href="/dashboard/my-newsletter/subscribers">
                  Subscribers
                </Link>
              </Button>
            </div>

            {/* Enhanced posts display */}
            {personalPosts && personalPosts.length > 0 ? (
              <Card
                size="md"
                className="pattern-card border border-border-subtle"
              >
                <div className="divide-y divide-border-subtle">
                  {personalPosts
                    .slice(0, MAX_RECENT_PERSONAL_POSTS_DISPLAY)
                    .map((post: PersonalPost) => (
                      <RecentPostRow
                        key={post.id}
                        id={post.id}
                        title={post.title}
                        status={post.is_public ? 'published' : 'draft'}
                        date={post.published_at || post.created_at}
                      />
                    ))}
                </div>
              </Card>
            ) : (
              <Alert className="pattern-card border-border-subtle bg-surface-elevated-1">
                <Info className="h-4 w-4 text-content-accent" />
                <AlertTitle className="text-content-primary">
                  No Personal Posts Yet
                </AlertTitle>
                <AlertDescription className="text-content-secondary">
                  You haven&apos;t written any personal posts. Click &quot;Write
                  New Post&quot; to get started!
                </AlertDescription>
              </Alert>
            )}

            {/* Enhanced view all button */}
            {personalPosts &&
              personalPosts.length > MAX_RECENT_PERSONAL_POSTS_DISPLAY && (
                <div className="text-center">
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<List className="h-4 w-4" />}
                    className="micro-interaction nav-hover"
                    asChild
                  >
                    <Link href="/dashboard/posts">View All My Posts</Link>
                  </Button>
                </div>
              )}
          </div>
        </Card>

        {/* Owned Collectives - Enhanced with design tokens */}
        <Card size="lg" className="pattern-card micro-interaction">
          <div className="pattern-stack">
            {/* Enhanced header with better typography */}
            <div className="flex items-center gap-component">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-surface-elevated-2 border border-border-subtle">
                <BookOpen className="h-5 w-5 text-content-accent" />
              </div>
              <div>
                <h2 className="text-content-primary font-semibold text-lg tracking-tight">
                  My Owned Collectives
                </h2>
                <p className="text-content-secondary text-sm">
                  Communities you manage
                </p>
              </div>
            </div>

            {/* Enhanced create button */}
            <Button
              variant="default"
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              className="micro-interaction btn-scale w-fit"
              asChild
            >
              <Link href="/dashboard/collectives/new">Create Collective</Link>
            </Button>

            {/* Enhanced collectives display */}
            {ownedCollectives && ownedCollectives.length > 0 ? (
              <div className="dashboard-grid dashboard-grid-secondary">
                {ownedCollectives.map((collective: OwnedCollective) => (
                  <Card
                    key={collective.id}
                    size="md"
                    className="pattern-card micro-interaction card-lift flex flex-col"
                  >
                    <div className="pattern-stack flex-1">
                      <div>
                        <h3 className="font-serif text-lg font-semibold text-content-primary truncate">
                          {collective.name}
                        </h3>
                        <p className="text-content-secondary text-sm truncate mt-1">
                          {collective.description}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        className="w-full micro-interaction btn-scale mt-auto"
                        asChild
                      >
                        <Link href={`/collectives/${collective.slug}`}>
                          View Collective
                        </Link>
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Alert className="pattern-card border-border-subtle bg-surface-elevated-1">
                <AlertCircle className="h-4 w-4 text-content-accent" />
                <AlertTitle className="text-content-primary">
                  No Collectives Yet
                </AlertTitle>
                <AlertDescription className="text-content-secondary">
                  You don&apos;t own any collectives. Click &quot;Create
                  Collective&quot; to start one!
                </AlertDescription>
              </Alert>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
