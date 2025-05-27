import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/database.types';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import PostReactionButtons from '@/components/app/posts/molecules/PostReactionButtons';
import BookmarkButton from '@/components/app/posts/molecules/BookmarkButton';
import CommentsSection from '@/components/app/posts/organisms/CommentsSection';
import PostViewTracker from '@/components/app/posts/molecules/PostViewTracker';
import { ReadOnlyLexicalViewer } from '@/components/ui/ReadOnlyLexicalViewer';
import { ChevronLeft, Edit, Share2, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { calculateReadingTime, formatDate } from '@/lib/utils';
import type { SupabaseClient } from '@supabase/supabase-js';

const formatPostDate = (dateString: string | null): string => {
  if (!dateString) return 'Date not available';
  return formatDate(dateString);
};

async function getPostBySlugOrId(
  supabase: SupabaseClient<Database>,
  slugOrId: string,
  userId?: string,
) {
  try {
    // Try by ID first (UUID format)
    const isUUID =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        slugOrId,
      );

    if (isUUID) {
      const { data: postData, error: postError } = await supabase
        .from('posts')
        .select(
          `
          *, 
          author:users!author_id(id, full_name, username, avatar_url, bio), 
          collective:collectives!collective_id(id, name, slug)
        `,
        )
        .eq('id', slugOrId)
        .maybeSingle();

      if (postError) {
        console.error('Database error fetching post:', postError);
        return { data: null, error: postError.message };
      }

      if (!postData) {
        return { data: null, error: 'Post not found' };
      }

      let reactionData = null;
      let bookmarkData = null;

      // If we have a user, fetch their specific reaction and bookmark data
      if (userId) {
        // Fetch user reaction
        const { data: userReaction } = await supabase
          .from('post_reactions')
          .select('type')
          .eq('post_id', slugOrId)
          .eq('user_id', userId)
          .maybeSingle();

        // Fetch user bookmark
        const { data: userBookmark } = await supabase
          .from('post_bookmarks')
          .select('post_id')
          .eq('post_id', slugOrId)
          .eq('user_id', userId)
          .maybeSingle();

        reactionData = userReaction;
        bookmarkData = userBookmark;
      }

      // Return consistent structure for all cases
      return {
        data: {
          ...postData,
          user_reaction: reactionData
            ? { reaction_type: reactionData.type }
            : null,
          user_bookmark: bookmarkData ? { id: bookmarkData.post_id } : null,
          likes: null, // We'll use the like_count field from posts table
        },
        error: null,
      };
    }

    // If not a UUID, try as a regular ID anyway (fallback)
    const { data: postData, error: postError } = await supabase
      .from('posts')
      .select(
        `
        *, 
        author:users!author_id(id, full_name, username, avatar_url, bio), 
        collective:collectives!collective_id(id, name, slug)
      `,
      )
      .eq('id', slugOrId)
      .maybeSingle();

    if (postError) {
      console.error('Database error fetching post by fallback ID:', postError);
      return { data: null, error: postError.message };
    }

    if (!postData) {
      return { data: null, error: 'Post not found' };
    }

    let reactionData = null;
    let bookmarkData = null;

    // If we have a user, fetch their specific reaction and bookmark data
    if (userId) {
      // Fetch user reaction
      const { data: userReaction } = await supabase
        .from('post_reactions')
        .select('type')
        .eq('post_id', slugOrId)
        .eq('user_id', userId)
        .maybeSingle();

      // Fetch user bookmark
      const { data: userBookmark } = await supabase
        .from('post_bookmarks')
        .select('post_id')
        .eq('post_id', slugOrId)
        .eq('user_id', userId)
        .maybeSingle();

      reactionData = userReaction;
      bookmarkData = userBookmark;
    }

    return {
      data: {
        ...postData,
        user_reaction: reactionData
          ? { reaction_type: reactionData.type }
          : null,
        user_bookmark: bookmarkData ? { id: bookmarkData.post_id } : null,
        likes: null, // We'll use the like_count field from posts table
      },
      error: null,
    };
  } catch (error) {
    console.error('Unexpected error in getPostBySlugOrId:', error);
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export default async function PostBySlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: slugOrId } = await params;
  const supabase = await createServerSupabaseClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: postResult, error } = await getPostBySlugOrId(
      supabase,
      slugOrId,
      user?.id,
    );

    if (error || !postResult) {
      console.error('Post not found:', error);
      notFound();
    }

    const post = postResult;

    // Check if user has permission to view this post
    const isOwner =
      user?.id === post.author_id || user?.id === post.collective?.id;
    const isPublished =
      post.is_public &&
      post.published_at &&
      new Date(post.published_at) <= new Date();

    if (!isPublished && !isOwner) {
      notFound();
    }

    // Safe fallbacks for data
    const authorName = post.author?.full_name || 'Anonymous';
    const authorUsername =
      post.author?.username || post.author?.id || 'unknown';
    const authorInitials =
      authorName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'A';

    const readingTime = calculateReadingTime(post.content);
    const viewCount = post.view_count || 0;
    const initialLikeCount = post.like_count || 0;
    const initialDislikeCount = post.dislike_count || 0;
    const initialUserReaction =
      post.user_reaction?.reaction_type === 'like' ||
      post.user_reaction?.reaction_type === 'dislike'
        ? post.user_reaction.reaction_type
        : null;
    const initialBookmarked = !!post.user_bookmark?.id;

    return (
      <>
        <PostViewTracker postId={post.id} />

        {/* Header Bar */}
        <div className="sticky top-16 z-40 bg-background/80 backdrop-blur-sm border-b">
          <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
            <Button variant="ghost" size="sm" asChild className="gap-2">
              <Link href="/">
                <ChevronLeft className="h-4 w-4" />
                Back
              </Link>
            </Button>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon">
                <Share2 className="h-4 w-4" />
              </Button>
              <BookmarkButton
                postSlug={post.id}
                initialBookmarked={initialBookmarked}
                disabled={!user?.id}
              />
              {isOwner && (
                <Button variant="ghost" size="icon" asChild>
                  <Link href={`/posts/${post.id}/edit`}>
                    <Edit className="h-4 w-4" />
                  </Link>
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>Report</DropdownMenuItem>
                  <DropdownMenuItem>Copy link</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <article className="min-h-screen bg-background">
          <div className="max-w-4xl mx-auto px-6 py-12">
            {/* Title Section */}
            <header className="mb-12">
              <h1 className="text-5xl font-bold leading-tight mb-6 text-foreground">
                {post.title || 'Untitled Post'}
              </h1>

              {/* Subtitle */}
              {post.subtitle && (
                <p className="text-2xl text-muted-foreground mb-8 leading-relaxed">
                  {post.subtitle}
                </p>
              )}

              {/* Author Info */}
              <div className="flex items-center gap-4 mb-8">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={post.author?.avatar_url || undefined} />
                  <AvatarFallback>{authorInitials}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/profile/${authorUsername}`}
                      className="font-medium text-foreground hover:underline"
                    >
                      {authorName}
                    </Link>
                    {post.collective && (
                      <>
                        <span className="text-muted-foreground">in</span>
                        <Link
                          href={`/collectives/${post.collective.slug}`}
                          className="font-medium text-foreground hover:underline"
                        >
                          {post.collective.name}
                        </Link>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span>
                      {formatPostDate(post.published_at || post.created_at)}
                    </span>
                    <span>·</span>
                    <span>{readingTime}</span>
                    <span>·</span>
                    <span>{viewCount.toLocaleString()} views</span>
                  </div>
                </div>
                {user?.id && user.id !== post.author_id && (
                  <Button variant="outline" size="sm">
                    Follow
                  </Button>
                )}
              </div>

              {/* Reaction Bar */}
              <div className="border-y py-4">
                <PostReactionButtons
                  postSlug={post.id}
                  initialLikeCount={initialLikeCount}
                  initialDislikeCount={initialDislikeCount}
                  initialUserReaction={initialUserReaction}
                  disabled={!user?.id}
                />
              </div>
            </header>

            {/* Post Content */}
            <div
              className="prose prose-lg dark:prose-invert max-w-none
              prose-headings:font-bold prose-headings:tracking-tight
              prose-h1:text-4xl prose-h1:mb-8 prose-h1:mt-12
              prose-h2:text-3xl prose-h2:mb-6 prose-h2:mt-10
              prose-h3:text-2xl prose-h3:mb-4 prose-h3:mt-8
              prose-p:text-xl prose-p:leading-relaxed prose-p:mb-6 prose-p:text-foreground/90
              prose-li:text-xl prose-li:leading-relaxed prose-li:marker:text-muted-foreground
              prose-blockquote:border-l-4 prose-blockquote:border-muted-foreground/30 
              prose-blockquote:pl-6 prose-blockquote:italic prose-blockquote:text-xl
              prose-code:text-base prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
              prose-pre:bg-muted prose-pre:text-base
              prose-img:rounded-lg prose-img:shadow-lg
              prose-a:text-primary prose-a:no-underline hover:prose-a:underline
            "
            >
              <ReadOnlyLexicalViewer contentJSON={post.content ?? ''} />
            </div>

            {/* Post Footer */}
            <footer className="mt-16 pt-8 border-t">
              {/* Author Bio */}
              {post.author?.bio && (
                <div className="mb-12 p-6 bg-muted/30 rounded-lg">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={post.author.avatar_url || undefined} />
                      <AvatarFallback>{authorInitials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-2">
                        About {authorName}
                      </h3>
                      <p className="text-muted-foreground">{post.author.bio}</p>
                      <Button variant="link" className="px-0 mt-2" asChild>
                        <Link href={`/profile/${authorUsername}`}>
                          View profile →
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Comments Section */}
              <div className="mt-12">
                <h2 className="text-2xl font-bold mb-8">Comments</h2>
                <CommentsSection
                  postSlug={post.id}
                  currentUserId={user?.id ?? null}
                />
              </div>
            </footer>
          </div>
        </article>
      </>
    );
  } catch (error) {
    console.error('Error loading post:', error);
    notFound();
  }
}
