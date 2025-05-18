import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import PostCard from "@/components/app/posts/molecules/PostCard";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import SubscribeButton from "@/components/SubscribeButton"; // Import the new button

export default async function Page({
  params,
}: {
  params: Promise<{ collectiveSlug: string }>;
}) {
  const { collectiveSlug } = await params;
  const supabase = createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser(); // Get user early for like status

  // Fetch collective details by slug
  const { data: collective, error: collectiveError } = await supabase
    .from("collectives")
    .select("id, name, description, owner_id")
    .eq("slug", collectiveSlug)
    .single();

  if (collectiveError || !collective) {
    console.error(
      `Error fetching collective ${collectiveSlug}:`,
      collectiveError
    );
    redirect("/not-found");
  }

  // Fetch posts for this collective using denormalized like/dislike counts
  const { data: postsData, error: postsError } = await supabase
    .from("posts")
    .select(`*, view_count`)
    .eq("collective_id", collective.id)
    .eq("is_public", true)
    .order("created_at", { ascending: false });

  if (postsError) {
    console.error(
      `Error fetching posts for collective ${collective.id}:`,
      postsError
    );
    // Decide how to handle this - e.g., show an error message or empty state
  }

  type RawPost = {
    id: string;
    title: string;
    like_count?: number | null;
    dislike_count?: number | null;
    [key: string]: unknown;
  };

  const posts =
    postsData?.map((p: RawPost) => ({
      ...p,
      like_count: p.like_count ?? 0,
      dislike_count: p.dislike_count ?? 0,
      current_user_has_liked: undefined, // Will be determined client-side
    })) || [];

  // Check if current user is the owner of the collective to show edit/new post links
  const isOwner = user?.id === collective.owner_id;

  return (
    <div className="container mx-auto p-4 md:p-6">
      <header className="mb-8 pb-6 border-b border-primary/10 flex flex-col items-center">
        <h1 className="text-5xl font-extrabold tracking-tight text-center flex items-center mb-4">
          {collective.name}
          <span
            className="ml-2 text-primary text-5xl leading-none align-middle"
            style={{ fontWeight: 900 }}
          >
            .
          </span>
        </h1>
        {collective.description && (
          <div className="bg-card shadow rounded-xl p-6 max-w-2xl w-full text-center mx-auto">
            <p className="text-lg text-muted-foreground">
              {collective.description}
            </p>
          </div>
        )}
        {user?.id !== collective.owner_id && (
          <div className="mt-4">
            <SubscribeButton
              targetEntityType="collective"
              targetEntityId={collective.id}
              targetName={collective.name}
            />
          </div>
        )}
        {isOwner && (
          <div className="mt-4">
            <Button asChild variant="outline">
              <Link href={`/dashboard/${collective.id}/new-post`}>
                Create New Post
              </Link>
            </Button>
          </div>
        )}
      </header>

      <main>
        {posts && posts.length > 0 ? (
          <div className="grid gap-8">
            {posts.map((post: RawPost) => (
              <PostCard
                key={post.id}
                post={post}
                collectiveSlug={collectiveSlug}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-10">
            <h2 className="text-2xl font-semibold mb-2">No posts yet!</h2>
            <p className="text-muted-foreground">
              This collective hasn&apos;t published any posts. Check back later!
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
