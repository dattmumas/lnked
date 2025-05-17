import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import PostLikeButton from "@/components/PostLikeButton";
import PostViewTracker from "@/components/app/posts/PostViewTracker";
import { formatDate } from "@/lib/utils";

interface IndividualPostPageProps {
  params: {
    postId: string; // Assuming postId is a UUID string
  };
}

function calculateReadingTime(htmlContent: string | null): string {
  if (!htmlContent) return "0 min read";
  const textContent = htmlContent.replace(/<[^>]+>/g, "");
  const words = textContent.trim().split(/\s+/).length;
  const wordsPerMinute = 200;
  const minutes = Math.ceil(words / wordsPerMinute);
  return `${minutes} min read`;
}

// Define the expected shape of items in postsData
type PostWithAuthorViews = Database["public"]["Tables"]["posts"]["Row"] & {
  author:
    | Database["public"]["Tables"]["users"]["Row"]
    | { id: string; full_name: string | null }
    | null;
  view_count: number | null;
};

export default async function IndividualPostViewPage({
  params,
}: IndividualPostPageProps) {
  const { postId } = await params;
  const cookieStore = await cookies();

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: (name: string, value: string, options: CookieOptions) => {
          try {
            cookieStore.set(name, value, options);
          } catch {}
        },
        remove: (name: string, options: CookieOptions) => {
          try {
            cookieStore.set(name, "", { ...options, maxAge: 0 });
          } catch {}
        },
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
      view_count
    `
    )
    .eq("id", postId)
    .single();

  const typedPost = postResult as PostWithAuthorViews | null;

  if (postError || !typedPost) {
    console.error(`Error fetching post ${postId}:`, postError?.message);
    notFound();
  }

  if (!typedPost.author) {
    // Check if author object exists after join
    console.error(`Author data missing for post ${postId}`);
    notFound();
  }

  // Access control: Only show if public and published, or if current user is the author
  const isPublic = typedPost.is_public;
  const isPublished =
    !typedPost.published_at || new Date(typedPost.published_at) <= new Date();
  const isAuthor = currentUser?.id === typedPost.author_id;
  if (!(isPublic && isPublished) && !isAuthor) {
    notFound();
  }

  const authorName = typedPost.author?.full_name || "Anonymous";
  const readingTime = calculateReadingTime(typedPost.content);
  const viewCount = typedPost.view_count || 0;

  const initialLikeCount = typedPost.like_count || 0;
  const isOwner = currentUser?.id === typedPost.author?.id;

  return (
    <div className="container mx-auto max-w-3xl p-4 md:p-6">
      <PostViewTracker postId={typedPost.id} />
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
            <Link href="#">Posts</Link>
          </li>
          <li>
            <span className="mx-1">/</span>
          </li>
          <li>
            <span className="font-medium line-clamp-1">{typedPost.title}</span>
          </li>
        </ol>
      </nav>

      <article className="prose dark:prose-invert lg:prose-xl max-w-none">
        <header className="mb-8">
          <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl mb-4">
            {typedPost.title}
          </h1>
          <div className="text-base text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>
              Published on{" "}
              {formatDate(typedPost.published_at || typedPost.created_at)}
            </span>
            {typedPost.author && (
              <span>
                by{" "}
                <Link
                  href={`/newsletters/${typedPost.author.id}`}
                  className="hover:underline"
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

        <div className="prose dark:prose-invert lg:prose-xl max-w-none">
          <div dangerouslySetInnerHTML={{ __html: typedPost.content || "" }} />
        </div>
      </article>

      <footer className="mt-12 pt-8 border-t">
        <div className="flex justify-between items-center">
          <PostLikeButton
            postId={typedPost.id}
            collectiveSlug={null}
            initialLikes={initialLikeCount}
            authorId={typedPost.author_id}
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
