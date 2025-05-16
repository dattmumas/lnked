import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
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
  CardFooter,
} from "@/components/ui/card";

// Helper to format date (can be moved to utils)
const formatDate = (dateString: string | null): string => {
  if (!dateString) return "Date not available";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export default async function DashboardManagementPage() {
  const cookieStore = cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set(name, value, options);
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.delete(name, options);
        },
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
    <div className="container mx-auto p-4 md:p-6 space-y-10">
      <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <h1 className="text-3xl font-bold">Management Dashboard</h1>
        <Button asChild variant="outline">
          <Link href="/dashboard/profile/edit">Edit Profile</Link>
        </Button>
      </header>

      {/* Section for Individual Newsletter Management */}
      <section>
        <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-2">
          <h2 className="text-2xl font-semibold">My Individual Newsletter</h2>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="secondary">
              <Link href="/dashboard/new-personal-post">Write New Post</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/newsletters/${currentUser.id}`}>
                View My Public Newsletter
              </Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/dashboard/my-newsletter/subscribers">
                View Subscribers
              </Link>
            </Button>
          </div>
        </div>
        {personalPosts && personalPosts.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {personalPosts.map((post) => (
              <Card key={post.id}>
                <CardHeader>
                  <CardTitle className="truncate">{post.title}</CardTitle>
                  <CardDescription>
                    Status: {post.published_at ? "Published" : "Draft"} (
                    {post.is_public ? "Public" : "Private"})
                    <br />
                    Created: {formatDate(post.created_at)}
                    {post.published_at &&
                      `, Published: ${formatDate(post.published_at)}`}
                  </CardDescription>
                </CardHeader>
                <CardFooter className="flex justify-end space-x-2">
                  {/* TODO: <Link href={`/posts/${post.id}`}>View</Link> */}
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/dashboard/posts/${post.id}/edit`}>Edit</Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">
            You haven&apos;t written any personal posts yet.
          </p>
        )}
      </section>

      {/* Section for Owned Collectives Management */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold">My Owned Collectives</h2>
          <Button asChild>
            <Link href="/dashboard/collectives/new">Create New Collective</Link>
          </Button>
        </div>
        {ownedCollectives && ownedCollectives.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {ownedCollectives.map((collective) => (
              <Card key={collective.id}>
                <CardHeader>
                  <CardTitle>{collective.name}</CardTitle>
                  <CardDescription className="truncate h-10">
                    {collective.description || "No description provided."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col space-y-2 mt-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/collectives/${collective.slug}`}>
                      View Public Page
                    </Link>
                  </Button>
                  <Button asChild size="sm">
                    <Link href={`/dashboard/${collective.id}/new-post`}>
                      Add Post to Collective
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start pl-3"
                  >
                    <Link
                      href={`/dashboard/collectives/${collective.id}/subscribers`}
                    >
                      View Subscribers
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start pl-3"
                  >
                    <Link
                      href={`/dashboard/collectives/${collective.id}/manage/members`}
                    >
                      Manage Members
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start pl-3"
                  >
                    <Link
                      href={`/dashboard/collectives/${collective.id}/settings`}
                    >
                      Collective Settings
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">
            You don&apos;t own any collectives yet.
          </p>
        )}
      </section>
    </div>
  );
}
