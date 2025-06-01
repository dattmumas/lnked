import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Button } from '@/components/primitives/Button';
import Link from 'next/link';
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

export const dynamic = 'force-dynamic';

export default async function DashboardManagementPage() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { session },
    error: authErrorSession,
  } = await supabase.auth.getSession();

  if (authErrorSession || !session || !session.user) {
    redirect('/sign-in'); // Protect the dashboard route
  }

  const userId = session.user.id;

  const { data: profile } = await supabase
    .from('users')
    .select('username')
    .eq('id', userId)
    .maybeSingle();
  const username = profile?.username;

  // 1. Fetch user's OWNED collectives
  const { data: ownedCollectives, error: ownedCollectivesError } =
    await supabase
      .from('collectives')
      .select('id, name, slug, description')
      .eq('owner_id', userId)
      .order('name', { ascending: true });
  if (ownedCollectivesError)
    console.error(
      'Error fetching owned collectives:',
      ownedCollectivesError.message,
    );

  // 2. Fetch user's OWN individual posts (collective_id is NULL)
  const { data: personalPosts, error: personalPostsError } = await supabase
    .from('posts')
    .select('id, title, published_at, created_at, is_public, collective_id') // Add collective_id to ensure it's null
    .eq('author_id', userId)
    .is('collective_id', null)
    .order('created_at', { ascending: false });
  if (personalPostsError)
    console.error('Error fetching personal posts:', personalPostsError.message);

  // 3. Fetch dashboard statistics
  const [
    { count: subscriberCount },
    { count: followerCount },
    { data: viewsData },
    { data: likesData },
  ] = await Promise.all([
    // Get subscriber count for the user
    supabase
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('target_entity_type', 'user')
      .eq('target_entity_id', userId)
      .eq('status', 'active'),
    // Get follower count for the user
    supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', userId)
      .eq('following_type', 'user'),
    // Get total views for user's posts
    supabase.from('posts').select('view_count').eq('author_id', userId),
    // Get total likes for user's posts
    supabase.from('posts').select('like_count').eq('author_id', userId),
  ]);

  // Calculate aggregated stats
  const totalViews =
    viewsData?.reduce((sum, post) => sum + (post.view_count || 0), 0) || 0;
  const totalLikes =
    likesData?.reduce((sum, post) => sum + (post.like_count || 0), 0) || 0;

  // Calculate posts published this month
  const currentMonth = new Date();
  const startOfMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1,
  );
  const publishedThisMonth =
    personalPosts?.filter(
      (post) =>
        post.published_at && new Date(post.published_at) >= startOfMonth,
    ).length || 0;

  return (
    <div className="pattern-stack gap-section">
      {/* Enhanced Stats Row with design system integration */}
      <StatsRow
        subscriberCount={subscriberCount || 0}
        followerCount={followerCount || 0}
        totalPosts={personalPosts?.length || 0}
        collectiveCount={ownedCollectives?.length || 0}
        totalViews={totalViews}
        totalLikes={totalLikes}
        monthlyRevenue={0} // TODO: Implement when payment system is ready
        pendingPayout={0} // TODO: Implement when payout system is ready
        openRate="0%" // TODO: Implement when email tracking is ready
        publishedThisMonth={publishedThisMonth}
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
                <Link href="/dashboard/video-management">Video Management</Link>
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
