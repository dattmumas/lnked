import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
    <>
      {/* Dashboard Page Header - Sticky within the scrollable area defined in DashboardShell */}
      {/* The DashboardShell provides p-4 md:p-6. This sticky header will live INSIDE that padding. */}
      {/* top-0 here means top of the scrollable container. */}

      {/* Stats Row - Thin focused metrics */}
      <div className="mb-6">
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
      </div>

      {/* Main content sections in a grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        {/* Individual Newsletter */}
        <Card className="w-full bg-background text-foreground shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Rss className="h-5 w-5" /> My Content
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pt-2 w-full">
              <div className="flex flex-wrap gap-2">
                <Link href="/posts/new">
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" /> Write New Post
                  </Button>
                </Link>
                <Link href="/dashboard/video-management">
                  <Button variant="outline" size="sm">
                    <Video className="h-4 w-4 mr-2" /> Video Management
                  </Button>
                </Link>
                {username && (
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/profile/${username}`}>View Profile</Link>
                  </Button>
                )}
                <Button asChild variant="ghost" size="sm">
                  <Link href="/dashboard/my-newsletter/subscribers">
                    Subscribers
                  </Link>
                </Button>
              </div>
            </div>
            {personalPosts && personalPosts.length > 0 ? (
              <Card className="border-border shadow-sm mt-4">
                <CardContent className="p-0">
                  <div className="divide-y divide-border">
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
                </CardContent>
              </Card>
            ) : (
              <Alert className="mt-4">
                <Info className="h-4 w-4" />
                <AlertTitle>No Personal Posts Yet</AlertTitle>
                <AlertDescription>
                  You haven&apos;t written any personal posts. Click &quot;Write
                  New Post&quot; to get started!
                </AlertDescription>
              </Alert>
            )}
            {personalPosts &&
              personalPosts.length > MAX_RECENT_PERSONAL_POSTS_DISPLAY && (
                <div className="mt-4 text-center">
                  <Button asChild variant="outline" size="sm">
                    <Link href="/dashboard/posts">
                      <List className="h-4 w-4 mr-2" /> View All My Posts
                    </Link>
                  </Button>
                </div>
              )}
          </CardContent>
        </Card>

        {/* Owned Collectives */}
        <Card className="w-full bg-background text-foreground shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" /> My Owned Collectives
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-2 pt-4 w-full">
              <Button asChild size="sm">
                <Link href="/dashboard/collectives/new">
                  <Plus className="h-4 w-4 mr-2" /> Create Collective
                </Link>
              </Button>
            </div>
            {ownedCollectives && ownedCollectives.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full mt-4">
                {ownedCollectives.map((collective: OwnedCollective) => (
                  <Card
                    key={collective.id}
                    className="flex flex-col min-w-[220px] w-full"
                  >
                    <CardHeader>
                      <CardTitle className="font-serif text-lg font-semibold truncate">
                        {collective.name}
                      </CardTitle>
                      <CardDescription className="truncate">
                        {collective.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="mt-auto pt-0">
                      <Button asChild size="sm" className="w-full">
                        <Link href={`/collectives/${collective.slug}`}>
                          View Collective
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Alert className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No Collectives Yet</AlertTitle>
                <AlertDescription>
                  You don&apos;t own any collectives. Click &quot;Create
                  Collective&quot; to start one!
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
