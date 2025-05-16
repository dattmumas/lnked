import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import PostLikeButton from "@/components/PostLikeButton"; // We'll create this component

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
        set() {},
        remove() {},
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
  const { data: post, error: postError } = await supabase
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

  if (postError || !post || !post.author) {
    console.error(
      `Error fetching post ${postId} or author data for collective ${collectiveSlug}:`,
      postError?.message
    );
    notFound();
  }

  // Type assertion for likes, assuming 'likes' is the alias from 'likes(count)'
  const postLikes = post.likes as { count: number }[] | null;
  const initialLikeCount = postLikes?.[0]?.count || 0;

  const isOwner =
    user?.id === collective.owner_id || user?.id === post.author?.id;

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
          <li>
            <span className="mx-1">/</span>
          </li>
          <li>
            <Link
              href={`/collectives/${collective.slug}`}
              className="hover:underline"
            >
              {collective.name}
            </Link>
          </li>
        </ol>
      </nav>

      <article className="prose dark:prose-invert lg:prose-xl max-w-none">
        <header className="mb-8">
          <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl mb-4">
            {post.title}
          </h1>
          <p className="text-lg text-muted-foreground">
            Published on {formatDate(post.published_at || post.created_at)}
            {post.author && ` by ${post.author.full_name || "Anonymous"}`}
          </p>
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
