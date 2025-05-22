import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/database.types';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import PostReactionButtons from '@/components/app/posts/molecules/PostReactionButtons';
import BookmarkButton from '@/components/app/posts/molecules/BookmarkButton';
import CommentsSection from '@/components/app/posts/organisms/CommentsSection';
import PostViewTracker from '@/components/app/posts/molecules/PostViewTracker';
import { LexicalRenderer } from '@/components/ui/LexicalRenderer';

const formatDate = (dateString: string | null): string => {
  if (!dateString) return 'Date not available';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

function calculateReadingTime(htmlContent: string | null): string {
  if (!htmlContent) return '0 min read';
  const textContent = htmlContent.replace(/<[^>]+>/g, '');
  const words = textContent.trim().split(/\s+/).length;
  const wordsPerMinute = 200;
  const minutes = Math.ceil(words / wordsPerMinute);
  return `${minutes} min read`;
}

type PostViewData = Database['public']['Tables']['posts']['Row'] & {
  author: {
    id: string;
    full_name: string | null;
    username: string | null;
  } | null;
  collective: { id: string; name: string; slug: string } | null;
  likes: { count: number }[] | null;
  view_count: number | null;
};

export default async function PostBySlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: postResult, error } = await supabase
    .from('posts')
    .select(
      `*, author:users!author_id(id, full_name, username), collective:collectives!collective_id(id, name, slug), likes(count)`,
    )
    .eq('slug', slug)
    .single();

  const post = postResult as PostViewData | null;
  if (error || !post) {
    notFound();
  }

  // If someone visits old numeric path and slug mismatches, redirect will be handled there

  const authorName = post!.author?.full_name || 'Anonymous';
  const authorUsername = post!.author?.username || post!.author?.id;
  const readingTime = calculateReadingTime(post!.content);
  const viewCount = post!.view_count || 0;
  const initialLikeCount = post!.likes?.[0]?.count || 0;
  const initialDislikeCount = post!.dislike_count || 0;
  const initialUserReaction = null;
  const initialBookmarked = false;
  const isOwner =
    user?.id === post!.author_id || user?.id === post!.collective?.id;

  const isPublished =
    post!.is_public &&
    post!.published_at &&
    new Date(post!.published_at) <= new Date();
  if (
    !isPublished &&
    user?.id !== post!.author_id &&
    user?.id !== post!.collective?.id
  ) {
    notFound();
  }

  return (
    <div className="container mx-auto max-w-3xl p-4 md:p-6">
      <PostViewTracker postId={post!.id} />
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
          {post!.collective && (
            <>
              <li>
                <span className="mx-1">/</span>
              </li>
              <li>
                <Link
                  href={`/${post!.collective.slug}`}
                  className="hover:underline"
                >
                  {post!.collective.name}
                </Link>
              </li>
            </>
          )}
          <li>
            <span className="mx-1">/</span>
          </li>
          <li className="font-medium line-clamp-1" aria-current="page">
            {post!.title}
          </li>
        </ol>
      </nav>

      <article className="bg-card shadow rounded-xl p-8 max-w-none">
        <header className="mb-8 flex flex-col items-center">
          <h1 className="text-5xl font-extrabold tracking-tight text-center flex items-center mb-4">
            {post!.title}
          </h1>
          <div className="text-base text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 justify-center">
            <span>
              Published on {formatDate(post!.published_at || post!.created_at)}
            </span>
            {post!.author && (
              <span>
                by{' '}
                <Link
                  href={`/@${authorUsername}`}
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
              {viewCount} {viewCount === 1 ? 'view' : 'views'}
            </span>
          </div>
          <div className="mt-4 flex flex-row gap-4 justify-center items-center">
            <PostReactionButtons
              postId={post!.id}
              initialLikeCount={initialLikeCount}
              initialDislikeCount={initialDislikeCount}
              initialUserReaction={initialUserReaction}
              disabled={!user?.id}
            />
            <BookmarkButton
              postId={post!.id}
              initialBookmarked={initialBookmarked}
              disabled={!user?.id}
            />
          </div>
        </header>
        <div className="prose dark:prose-invert lg:prose-xl max-w-none">
          <LexicalRenderer contentJSON={post!.content ?? ''} />
        </div>
      </article>

      <footer className="mt-12 pt-8 border-t border-border">
        <div className="flex justify-between items-center">
          {isOwner && (
            <Button asChild variant="outline">
              <Link href={`/posts/${post!.id}/edit`}>Edit Post</Link>
            </Button>
          )}
        </div>
        <CommentsSection postId={post!.id} currentUserId={user?.id ?? null} />
      </footer>
    </div>
  );
}
