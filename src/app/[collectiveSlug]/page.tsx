import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";
import { notFound } from "next/navigation";
import PostCard from "@/components/PostCard"; // Assuming this will be created
import { Button } from "@/components/ui/button";
import Link from "next/link";
import SubscribeButton from "@/components/SubscribeButton"; // Import the new button

// Define an interim type for the expected shape of posts after the complex select
// This helps avoid 'any' and provides some level of type safety.
// This should align with how you process the data in `postsData?.map`
interface FetchedPostEntry {
  id: string;
  title: string;
  content: string | null;
  created_at: string;
  author_id: string;
  is_public: boolean;
  collective_id: string;
  published_at: string | null;
  likes: { count: number }[] | null;
  // user_likes field is removed as we simplify the query
}

interface CollectivePageProps {
  params: {
    collectiveSlug: string;
  };
}

export default async function CollectivePage({ params }: CollectivePageProps) {
  const cookieStore = cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: (name: string, value: string, options: CookieOptions) =>
          cookieStore.set(name, value, options),
        remove: (name: string, options: CookieOptions) =>
          cookieStore.delete(name, options),
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser(); // Get user early for like status

  const { collectiveSlug } = params;

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
    notFound(); // Or redirect to a generic error page or a 404 page
  }

  // Simplified: Fetch posts for this collective with only total like count
  const { data: postsData, error: postsError } = await supabase
    .from("posts")
    .select(
      `
      *,
      likes(count)
    `
    )
    .eq("collective_id", collective.id)
    .eq("is_public", true)
    // .not('published_at', 'is', null) // Consider if only published posts should be shown
    .order("created_at", { ascending: false });

  if (postsError) {
    console.error(
      `Error fetching posts for collective ${collective.id}:`,
      postsError
    );
    // Decide how to handle this - e.g., show an error message or empty state
  }

  const posts =
    postsData?.map((p) => ({
      ...(p as FetchedPostEntry), // Assert p to FetchedPostEntry (ensure FetchedPostEntry matches actual selected fields)
      like_count: p.likes?.[0]?.count || 0,
      // current_user_has_liked will be determined by PostLikeButton client-side
    })) || [];

  // Check if current user is the owner of the collective to show edit/new post links
  const isOwner = user?.id === collective.owner_id;

  return (
    <div className="container mx-auto p-4 md:p-6">
      <header className="mb-8 border-b pb-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2">
              {collective.name}
            </h1>
            {collective.description && (
              <p className="text-lg text-muted-foreground">
                {collective.description}
              </p>
            )}
          </div>
          {user?.id !== collective.owner_id && (
            <SubscribeButton
              targetEntityType="collective"
              targetEntityId={collective.id}
              targetName={collective.name}
            />
          )}
        </div>
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
          <div className="grid gap-6 md:gap-8 lg:gap-10">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post} // Should now align better with PostWithLikes in PostCard
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
