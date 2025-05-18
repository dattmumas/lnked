import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import PostListItem from "@/components/app/dashboard/posts/PostListItem";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import Link from "next/link";

// Use a type alias for DashboardPost
export type DashboardPost = Database["public"]["Tables"]["posts"]["Row"] & {
  collective?: { id: string; name: string; slug: string } | null;
  post_reactions?: { count: number; type?: string }[] | null;
  likeCount?: number;
};

// Type for collectives user can post to
type PublishingTargetCollective = Pick<
  Database["public"]["Tables"]["collectives"]["Row"],
  "id" | "name" | "slug"
>;

export default async function MyPostsPage() {
  const supabase = createServerSupabaseClient();

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
      post_reactions:post_reactions!post_id(count)
    `
    )
    .eq("author_id", userId)
    .order("created_at", { ascending: false });

  // Fetch collectives the user owns
  const { data: ownedCollectives, error: ownedError } = await supabase
    .from("collectives")
    .select("id, name, slug")
    .eq("owner_id", userId)
    .order("name", { ascending: true });

  // Fetch collectives the user is a member of (editor or author roles might be relevant for posting)
  const { data: memberCollectivesData, error: memberError } = await supabase
    .from("collective_members")
    .select("role, collective:collectives!inner(id, name, slug)")
    .eq("user_id", userId)
    .in("role", [
      "admin",
      "editor",
      "author",
    ] as Enums<"collective_member_role">[])
    .order("collective(name)", { ascending: true });

  if (postsError || ownedError || memberError) {
    console.error("Error fetching data for My Posts page:", {
      postsError,
      ownedError,
      memberError,
    });
    return <div className="p-4">Failed to load page data.</div>;
  }

  const publishingCollectives: PublishingTargetCollective[] = [];
  const addedCollectiveIds = new Set<string>();

  if (ownedCollectives) {
    ownedCollectives.forEach((c) => {
      if (!addedCollectiveIds.has(c.id)) {
        publishingCollectives.push(c as PublishingTargetCollective);
        addedCollectiveIds.add(c.id);
      }
    });
  }
  if (memberCollectivesData) {
    memberCollectivesData.forEach((membership) => {
      if (
        membership.collective &&
        !addedCollectiveIds.has(membership.collective.id)
      ) {
        publishingCollectives.push(
          membership.collective as PublishingTargetCollective
        );
        addedCollectiveIds.add(membership.collective.id);
      }
    });
  }

  // Map posts to include likeCount (count only 'like' reactions)
  const postsWithLikeCount = (posts as DashboardPost[]).map((post) => ({
    ...post,
    likeCount: Array.isArray(post.post_reactions)
      ? post.post_reactions.filter((r) => r.type === "like").length
      : 0,
  }));

  const renderNewPostButton = () => {
    return (
      <Button asChild size="sm" className="w-full md:w-auto">
        <Link href="/dashboard/new-personal-post">
          <PlusCircle className="h-4 w-4 mr-2" /> New Post
        </Link>
      </Button>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
        <h1 className="text-2xl font-serif font-semibold">My Posts</h1>
        {renderNewPostButton()}
      </div>
      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        {postsWithLikeCount && postsWithLikeCount.length > 0 ? (
          <table className="min-w-full text-sm divide-y divide-border">
            <thead>
              <tr className="bg-muted/50 text-muted-foreground">
                <th className="px-4 py-3 text-left font-semibold whitespace-nowrap">
                  Title
                </th>
                <th className="px-4 py-3 text-left font-semibold whitespace-nowrap">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-semibold whitespace-nowrap">
                  Publish Date
                </th>
                <th className="px-4 py-3 text-left font-semibold whitespace-nowrap">
                  Likes
                </th>
                <th className="px-4 py-3 text-left font-semibold whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {postsWithLikeCount.map((post) => (
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
