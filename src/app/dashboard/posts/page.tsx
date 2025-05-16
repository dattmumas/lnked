import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";
import { redirect } from "next/navigation";
import PostListItem from "@/components/app/dashboard/posts/PostListItem";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import Link from "next/link";

// Use a type alias for DashboardPost
export type DashboardPost = Database["public"]["Tables"]["posts"]["Row"] & {
  collective?: { id: string; name: string; slug: string } | null;
  likes?: { count: number }[] | null;
};

export default async function MyPostsPage() {
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
    redirect("/sign-in");
  }

  const userId = session.user.id;

  // Fetch all posts authored by the user (personal and collective)
  const { data: posts, error: postsError } = await supabase
    .from("posts")
    .select(
      `
      *,
      collective:collectives!collective_id(id, name, slug),
      likes(count)
    `
    )
    .eq("author_id", userId)
    .order("created_at", { ascending: false });

  if (postsError) {
    console.error("Error fetching posts:", postsError.message);
    // Optionally render an error state
    return <div className="p-4">Failed to load posts.</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
        <h1 className="text-2xl font-serif font-semibold">My Posts</h1>
        <Button asChild size="sm" className="w-full md:w-auto">
          <Link href="/dashboard/new-personal-post">
            <PlusCircle className="h-4 w-4 mr-2" /> New Post
          </Link>
        </Button>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border bg-card divide-y divide-border">
        {posts && posts.length > 0 ? (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-muted text-muted-foreground">
                <th className="px-4 py-2 text-left font-semibold">Title</th>
                <th className="px-4 py-2 text-left font-semibold">Status</th>
                <th className="px-4 py-2 text-left font-semibold">
                  Publish Date
                </th>
                <th className="px-4 py-2 text-left font-semibold">Likes</th>
                <th className="px-4 py-2 text-left font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(posts as DashboardPost[]).map((post) => (
                <PostListItem key={post.id} post={post} />
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-8 text-center text-muted-foreground">
            No posts found. Click &apos;New Post&apos; to create your first
            post!
          </div>
        )}
      </div>
    </div>
  );
}
