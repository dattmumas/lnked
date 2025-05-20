import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import StatCard from "@/components/app/dashboard/organisms/StatCard";
import {
  Users2,
  FileText,
  BookOpen,
  Mail,
  Settings,
  Rss,
  Plus,
  AlertCircle,
  Info,
  List,
} from "lucide-react";
import RecentPostRow from "@/components/app/dashboard/organisms/RecentPostRow";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { redirect } from "next/navigation";

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
  description: string;
};

export const dynamic = "force-dynamic";

export default async function DashboardManagementPage() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { session },
    error: authErrorSession,
  } = await supabase.auth.getSession();

  if (authErrorSession || !session || !session.user) {
    redirect("/sign-in"); // Protect the dashboard route
  }

  const currentUser = session.user;

  const userId = session.user.id;

  // 1. Fetch user's OWNED collectives
  const { data: ownedCollectives, error: ownedCollectivesError } =
    await supabase
      .from("collectives")
      .select("id, name, slug, description")
      .eq("owner_id", userId)
      .order("name", { ascending: true });
  if (ownedCollectivesError)
    console.error(
      "Error fetching owned collectives:",
      ownedCollectivesError.message
    );

  // 2. Fetch user's OWN individual posts (collective_id is NULL)
  const { data: personalPosts, error: personalPostsError } = await supabase
    .from("posts")
    .select("id, title, published_at, created_at, is_public, collective_id") // Add collective_id to ensure it's null
    .eq("author_id", userId)
    .is("collective_id", null)
    .order("created_at", { ascending: false });
  if (personalPostsError)
    console.error("Error fetching personal posts:", personalPostsError.message);

  return (
    <>
      {/* Dashboard Page Header - Sticky within the scrollable area defined in DashboardShell */}
      {/* The DashboardShell provides p-4 md:p-6. This sticky header will live INSIDE that padding. */}
      {/* top-0 here means top of the scrollable container. */}
      <div className="sticky top-0 z-30 bg-background py-4 border-b border-border mb-6 flex flex-col md:flex-row items-center justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold font-serif tracking-tight text-foreground">
            Management Dashboard
          </h1>
        </div>
        <div className="flex items-center gap-3 mt-4 md:mt-0">
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/profile/edit">
              <Settings className="h-4 w-4 mr-2" /> Edit Profile
            </Link>
          </Button>
        </div>
      </div>

      {/* Main content sections in a grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        {/* Quick Stats - full width */}
        <Card className="md:col-span-2 w-full bg-background text-foreground shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users2 className="h-5 w-5" /> Quick Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 pt-2 w-full">
              <StatCard
                title="Subscribers"
                value={123}
                trend={12}
                icon={<Users2 className="h-5 w-5 text-muted-foreground" />}
              />
              <StatCard
                title="Total Posts"
                value={personalPosts?.length || 0}
                trend={3}
                icon={<FileText className="h-5 w-5 text-muted-foreground" />}
              />
              <StatCard
                title="Collectives"
                value={ownedCollectives?.length || 0}
                icon={<BookOpen className="h-5 w-5 text-muted-foreground" />}
              />
              <StatCard
                title="Avg. Open Rate"
                value="45%"
                trend={-2}
                icon={<Mail className="h-5 w-5 text-muted-foreground" />}
              />
            </div>
          </CardContent>
        </Card>

        {/* Individual Newsletter */}
        <Card className="w-full bg-background text-foreground shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Rss className="h-5 w-5" /> My Individual Newsletter
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
                <Button asChild variant="outline" size="sm">
                  <Link href={`/newsletters/${currentUser.id}`}>
                    View Newsletter
                  </Link>
                </Button>
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
                          status={post.is_public ? "published" : "draft"}
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
                        <Link href={`/${collective.slug}`}>
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
