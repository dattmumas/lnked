import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import PostLikeButton from "@/components/PostLikeButton";
import PostViewTracker from "@/components/app/posts/PostViewTracker";

interface PostPageProps {
  params: {
    collectiveSlug: string;
    postId: string; // Assuming postId is a UUID string
  };
}

// Helper function to format dates, can be moved to a utils file
const formatDate = (dateString: string | null): string => {
  if (!dateString) return "Date not available";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

// Re-declare or import if moved to utils
function calculateReadingTime(htmlContent: string | null): string {
  if (!htmlContent) return "0 min read";
  const textContent = htmlContent.replace(/<[^>]+>/g, "");
  const words = textContent.trim().split(/\s+/).length;
  const wordsPerMinute = 200;
  const minutes = Math.ceil(words / wordsPerMinute);
  return `${minutes} min read`;
}

// Define the expected shape of the post data, including new fields
// Assuming view_count is part of Tables["posts"]["Row"] from database.types.ts
export type CollectivePostViewData =
  Database["public"]["Tables"]["posts"]["Row"] & {
    author: { id: string; full_name: string | null } | null;
    collective: { id: string; name: string; slug: string } | null; // Added for clarity
    likes: { count: number }[] | null;
    view_count: number | null; // Add view_count as optional to align with DB schema (can be null or number)
  };

export default async function PostPage({ params }: PostPageProps) {
  const cookieStore = await cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            (cookieStore as any).set(name, value, options);
          } catch {}
        },
        remove(name: string, options: CookieOptions) {
          try {
            (cookieStore as any).set(name, "", { ...options, maxAge: 0 });
          } catch {}
        },
      },
    }
  );

  const { collectiveSlug, postId } = await params;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 1. Fetch collective data by slug
  const { data: collective, error: collectiveError } = await supabase
    .from("collectives")
    .select("id, name, slug, owner_id")
    .eq("slug", collectiveSlug)
    .single();

  if (collectiveError || !collective) {
    console.error(
      `Error fetching collective ${collectiveSlug} for post ${postId}:`,
      collectiveError
    );
    notFound();
  }

  // Fetch the specific post data
  const { data: postResult, error: postError } = await supabase
    .from("posts")
    .select(
      `
      *,
      author:users!author_id(id, full_name),
      collective:collectives!collective_id(id, name, slug),
      likes(count)
    `
    )
    .eq("id", postId)
    .eq("collective_id", collective.id)
    .single();

  const post = postResult as CollectivePostViewData | null;
  if (postError || !post || !post.author) {
    console.error(
      `Error fetching post ${postId} or author data for collective ${collectiveSlug}:`,
      postError?.message
    );
    notFound();
  }

  const authorName = post.author?.full_name || "Anonymous";
  const readingTime = calculateReadingTime(post.content);
  const viewCount = post.view_count || 0;
  const initialLikeCount = post.likes?.[0]?.count || 0;
  const isOwner =
    user?.id === collective.owner_id || user?.id === post.author?.id;

  // Determine if post is truly public and published for display
  // This logic might need refinement based on how "scheduled" posts are handled vs "drafts" affecting public visibility.
  // For now, if it has a past published_at and is_public, it's visible.
  const isActuallyPublished =
    post.is_public &&
    post.published_at &&
    new Date(post.published_at) <= new Date();

  if (
    !isActuallyPublished &&
    user?.id !== post.author_id &&
    user?.id !== collective.owner_id
  ) {
    // If post is not published (e.g. draft or future scheduled) and current user is not author/owner, deny access
    // This is a basic check; more granular (e.g. subscriber access for paywalled content) would be more complex
    console.warn(
      `Access denied for post ${postId} by user ${user?.id}. Post not published or user lacks permission.`
    );
    notFound(); // Or redirect to a specific "access denied" page / collective page
  }

  return (
    <div className="container mx-auto max-w-3xl p-4 md:p-6">
      <PostViewTracker postId={post.id} />
      <nav
        aria-label="Breadcrumb"
        className="mb-6 text-sm text-muted-foreground"
      >
        <ol className="flex space-x-2 flex-wrap">
          <li>
            <Link href="/" className="hover:underline">
              Home
            </Link>
          </li>
          <li>
            <span className="mx-1">/</span>
          </li>
          <li>
            <Link href={`/${collective.slug}`} className="hover:underline">
              {collective.name}
            </Link>
          </li>
          <li>
            <span className="mx-1">/</span>
          </li>
          <li className="font-medium line-clamp-1" aria-current="page">
            {post.title}
          </li>
        </ol>
      </nav>

      <article className="prose dark:prose-invert lg:prose-xl">
        <header className="mb-8">
          <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl mb-4 font-serif">
            {post.title}
          </h1>
          <div className="text-sm text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>
              Published on {formatDate(post.published_at || post.created_at)}
            </span>
            {post.author && (
              <span>
                by{" "}
                <Link
                  href={`/newsletters/${post.author.id}`}
                  className="hover:underline text-primary"
                >
                  {authorName}
                </Link>
              </span>
            )}
            <span>·</span>
            <span>{readingTime}</span>
            <span>·</span>
            <span>
              {viewCount} {viewCount === 1 ? "view" : "views"}
            </span>
          </div>
        </header>

        {/* Render post content here. For Markdown, you'd use a library like react-markdown */}
        {/* For now, just rendering as pre-wrap to show structure */}
        <div className="whitespace-pre-wrap break-words">{post.content}</div>
      </article>

      <footer className="mt-12 pt-8 border-t">
        <div className="flex justify-between items-center">
          <PostLikeButton
            postId={post.id}
            collectiveSlug={collective.slug}
            initialLikes={initialLikeCount}
            authorId={post.author.id}
          />
          {isOwner && (
            <Button asChild variant="outline">
              <Link href={`/dashboard/posts/${post.id}/edit`}>Edit Post</Link>{" "}
              {/* TODO: Edit post page */}
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}
