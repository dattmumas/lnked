import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import PostLikeButton from "@/components/PostLikeButton";

interface IndividualPostPageProps {
  params: {
    postId: string; // Assuming postId is a UUID string
  };
}

const formatDate = (dateString: string | null): string => {
  if (!dateString) return "Date not available";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

// Define the expected shape of items in postsData
type PostWithAuthorAndLikes = Database["public"]["Tables"]["posts"]["Row"] & {
  author:
    | Database["public"]["Tables"]["users"]["Row"]
    | { id: string; full_name: string | null }
    | null; // Be more specific about author structure from join
  likes: { count: number }[] | null;
};

export default async function IndividualPostViewPage({
  params,
}: IndividualPostPageProps) {
  const { postId } = params;
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
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  // Fetch the specific post data, including author's full_name and like count
  // RLS policy `select_posts` should handle public vs. subscriber access logic.
  const { data: postResult, error: postError } = await supabase
    .from("posts")
    .select(
      `
      *,
      author:users!author_id(id, full_name),
      likes(count)
    `
    )
    .eq("id", postId)
    // Ensure it IS an individual post for this route, or that this route can handle both.
    // For a dedicated /posts/[postId] route, we might expect collective_id to be null OR just fetch any post by ID.
    // Let's assume this page is for ANY post, and collective context is secondary or handled by breadcrumbs if present.
    // If it must be an individual post, add: .is('collective_id', null)
    .single();

  const typedPost = postResult as PostWithAuthorAndLikes | null;

  if (postError || !typedPost) {
    console.error(`Error fetching post ${postId}:`, postError?.message);
    notFound();
  }

  if (!typedPost.author) {
    // Check if author object exists after join
    console.error(`Author data missing for post ${postId}`);
    // Handle as appropriate, e.g. show 'Unknown Author' or notFound()
  }

  const initialLikeCount = typedPost.likes?.[0]?.count || 0;
  const isOwner = currentUser?.id === typedPost.author?.id;

  return (
    <div className="container mx-auto max-w-3xl p-4 md:p-6">
      <nav
        aria-label="Breadcrumb"
        className="mb-6 text-sm text-muted-foreground"
      >
        <ol className="flex space-x-2">
          <li>
            <Link href="/" className="hover:underline">
              Home
            </Link>
          </li>
          {/* Optional: If post IS part of a collective, add collective breadcrumb */}
          {/* This would require fetching collective data if post.collective_id exists */}
          {/* For now, keeping it simple for a generic /posts/[postId] page */}
          <li>
            <span className="mx-1">/</span>
          </li>
          <li>
            <span className="font-medium">{typedPost.title}</span>
          </li>
        </ol>
      </nav>

      <article className="prose dark:prose-invert lg:prose-xl max-w-none">
        <header className="mb-8">
          <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl mb-4">
            {typedPost.title}
          </h1>
          <p className="text-lg text-muted-foreground">
            Published on{" "}
            {formatDate(typedPost.published_at || typedPost.created_at)}
            {typedPost.author &&
              ` by ${typedPost.author.full_name || "Anonymous"}`}
          </p>
        </header>

        <div className="whitespace-pre-wrap break-words">
          {typedPost.content}
        </div>
      </article>

      <footer className="mt-12 pt-8 border-t">
        <div className="flex justify-between items-center">
          <PostLikeButton
            postId={typedPost.id}
            collectiveSlug={null} // No collective context for this page by default
            initialLikes={initialLikeCount}
            authorId={typedPost.author_id} // Pass authorId for like action revalidation
          />
          {isOwner && (
            <Button asChild variant="outline">
              <Link href={`/dashboard/posts/${typedPost.id}/edit`}>
                Edit Post
              </Link>
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}
