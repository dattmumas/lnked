import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import StatCard from "@/components/app/dashboard/molecules/stat-card";
import {
  Users,
  FileText,
  Library,
  MailOpen,
  Package,
  Settings,
  Rss,
  PlusCircle,
  AlertTriangle,
  Info,
  List,
} from "lucide-react";
import RecentPostRow from "@/components/app/dashboard/molecules/RecentPostRow";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const MAX_RECENT_PERSONAL_POSTS_DISPLAY = 3;

export default async function DashboardManagementPage() {
  const cookieStore = await cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set() {},
        remove() {},
      },
    }
  );

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
            Dashboard
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

      {/* Main content sections below the sticky header */}
      {/* Add pt-6 or similar to the first section if space-y on parent was removed, or manage spacing per section */}
      <div className="space-y-6">
        {/* Quick Stats */}
        <section>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Subscribers"
              value={123}
              trend={12}
              icon={<Users className="h-5 w-5 text-muted-foreground" />}
            />
            <StatCard
              label="Total Posts"
              value={personalPosts?.length || 0}
              trend={3}
              icon={<FileText className="h-5 w-5 text-muted-foreground" />}
            />
            <StatCard
              label="Collectives"
              value={ownedCollectives?.length || 0}
              icon={<Library className="h-5 w-5 text-muted-foreground" />}
            />
            <StatCard
              label="Avg. Open Rate"
              value="45%"
              trend={-2}
              icon={<MailOpen className="h-5 w-5 text-muted-foreground" />}
            />
          </div>
        </section>

        {/* Individual Newsletter */}
        <section className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
            <h2 className="text-2xl font-serif font-semibold flex items-center">
              <Rss className="h-5 w-5 mr-2 text-primary" /> My Individual
              Newsletter
            </h2>

            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm">
                <Link href="/dashboard/new-personal-post">
                  <PlusCircle className="h-4 w-4 mr-2" /> Write New Post
                </Link>
              </Button>
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
            <Card className="border-border shadow-sm">
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {personalPosts
                    .slice(0, MAX_RECENT_PERSONAL_POSTS_DISPLAY)
                    .map((post) => (
                      <RecentPostRow key={post.id} post={post} />
                    ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Alert>
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
        </section>

        {/* Owned Collectives */}
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-2xl font-serif font-semibold flex items-center">
              <Library className="h-5 w-5 mr-2 text-primary" /> My Owned
              Collectives
            </h2>
            <Button asChild size="sm">
              <Link href="/dashboard/collectives/new">
                <PlusCircle className="h-4 w-4 mr-2" /> Create Collective
              </Link>
            </Button>
          </div>
          {ownedCollectives && ownedCollectives.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {ownedCollectives.map((collective) => (
                <Card key={collective.id} className="flex flex-col">
                  <CardHeader className="flex-grow">
                    <div className="flex items-center gap-3 mb-2">
                      <Package className="h-5 w-5 text-primary" />
                      <CardTitle>{collective.name}</CardTitle>
                    </div>
                    <CardDescription className="truncate h-10">
                      {collective.description || "No description provided."}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="mt-auto pt-0">
                    <Button asChild size="sm" className="w-full mt-2">
                      <Link
                        href={`/dashboard/collectives/${collective.id}/manage/members`}
                      >
                        Manage Collective
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>No Collectives Owned</AlertTitle>
              <AlertDescription>
                You don&apos;t own any collectives yet. Click &quot;Create
                Collective&quot; to start one!
              </AlertDescription>
            </Alert>
          )}
        </section>
      </div>
    </>
  );
}
