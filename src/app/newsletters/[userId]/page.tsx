import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";
import { notFound } from "next/navigation";
import PostCard from "@/components/app/posts/molecules/PostCard";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import SubscribeButton from "@/components/app/newsletters/molecules/SubscribeButton";
import FollowButton from "@/components/FollowButton";
// We'll need a subscribe button component here eventually

// Define the expected shape of items in postsData
export type PostWithLikesData = Database["public"]["Tables"]["posts"]["Row"] & {
  likes: { count: number }[] | null;
};

export default async function IndividualNewsletterPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const supabase = await createServerSupabaseClient();

  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  // 1. Fetch author details
  const { data: author, error: authorError } = await supabase
    .from("users")
    .select("id, full_name, role") // Add any other public user details you want to display
    .eq("id", userId)
    .single();

  if (authorError || !author) {
    console.error(`Error fetching author ${userId}:`, authorError);
    notFound();
  }

  // 2. Fetch posts for this author (individual newsletter posts where collective_id IS NULL)
  //    and include like count for each post.
  //    RLS policies on 'posts' will handle public/subscriber access.
  let postsQuery = supabase
    .from("posts")
    .select(
      `
      *,
      likes(count)
    `
    )
    .eq("author_id", author.id)
    .is("collective_id", null) // individual newsletter posts only
    .order("published_at", { ascending: false });

  // If the visiting user is NOT the owner, only show public + published posts
  if (!currentUser || currentUser.id !== author.id) {
    postsQuery = postsQuery
      .eq("is_public", true)
      .not("published_at", "is", null);
  }

  const { data: postsData, error: postsError } = await postsQuery;

  if (postsError) {
    console.error(`Error fetching posts for author ${author.id}:`, postsError);
    // Handle error, maybe show a message but still render author info
  }

  const posts =
    (postsData as PostWithLikesData[] | null)?.map((p) => ({
      ...p, // p is now of type PostWithLikesData
      like_count: p.likes?.[0]?.count || 0,
      // No need to spread postRow and likeInfo separately if p is already correctly typed
    })) || [];

  let initialIsFollowing = false;
  if (currentUser && author && currentUser.id !== author.id) {
    // Corrected select for head count query
    const { count, error: followError } = await supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", currentUser.id)
      .eq("following_id", author.id);

    if (followError) {
      console.error("Error checking follow status:", followError.message);
    } else if (count !== null && count > 0) {
      // Check count directly
      initialIsFollowing = true;
    }
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <header className="mb-8 border-b pb-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2">
              {author.full_name || "Anonymous Author"}&apos;s Newsletter
            </h1>
            {/* Add author bio or other info here */}
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            {currentUser?.id !== author.id && (
              <SubscribeButton
                targetEntityType="user"
                targetEntityId={author.id}
                targetName={author.full_name || "this newsletter"}
              />
            )}
            {currentUser?.id !== author.id && (
              <FollowButton
                targetUserId={author.id}
                targetUserName={author.full_name || "this author"}
                initialIsFollowing={initialIsFollowing}
                currentUserId={currentUser?.id}
              />
            )}
          </div>
        </div>
        {currentUser?.id === author.id && (
          <div className="mt-4">
            <Button asChild variant="outline">
              <Link href="/posts/new">Write New Post</Link>
            </Button>
          </div>
        )}
      </header>

      <main>
        {posts && posts.length > 0 ? (
          <div className="grid gap-6 md:gap-8 lg:gap-10">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                collectiveSlug={null} // No collective userId for individual posts, or pass author's userId if needed by PostCard
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-10">
            <h2 className="text-2xl font-semibold mb-2">No posts yet!</h2>
            <p className="text-muted-foreground">
              {author.full_name || "This author"} hasn&apos;t published any
              posts to their newsletter yet.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
