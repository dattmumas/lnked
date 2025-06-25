import { ChevronLeft, Edit, Share2, MoreHorizontal } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { CommentSection } from '@/components/app/comments';
import BookmarkButton from '@/components/app/posts/molecules/BookmarkButton';
import PostReactionButtons from '@/components/app/posts/molecules/PostReactionButtons';
import PostViewTracker from '@/components/app/posts/molecules/PostViewTracker';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { CommentsSkeleton } from '@/components/ui/CommentsSkeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ReadOnlyLexicalViewer } from '@/components/ui/ReadOnlyLexicalViewer';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { calculateReadingTime, formatDate } from '@/lib/utils';

import type { Database } from '@/lib/database.types';
import type { SupabaseClient } from '@supabase/supabase-js';

// Constants
const MAX_AUTHOR_INITIALS = 2;

type PostWithAuthorAndCollective = {
  id: string;
  title: string | null;
  content: string | null;
  subtitle: string | null;
  author_id: string;
  collective_id: string | null;
  thumbnail_url: string | null;
  is_public: boolean | null;
  published_at: string | null;
  created_at: string | null;
  view_count: number | null;
  author: {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
    bio: string | null;
  } | null;
  collective: {
    id: string;
    name: string;
    slug: string;
  } | null;
  user_reaction?: {
    reaction_type: string;
  };
  user_bookmark?: {
    id: string;
  };
  real_like_count: number;
  real_dislike_count: number;
};

const formatPostDate = (dateString: string | null): string => {
  if (dateString === null || dateString === undefined)
    return 'Date not available';
  return formatDate(dateString);
};

async function getPostBySlugOrId(
  supabase: SupabaseClient<Database>,
  slugOrId: string,
  userId?: string,
): Promise<{ data: PostWithAuthorAndCollective | undefined; error?: string }> {
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
        return { data: undefined, error: postError.message };
      }

      if (postData === null || postData === undefined) {
        return { data: undefined, error: 'Post not found' };
      }

      // Get real like/dislike counts from post_reactions table
      const [{ count: likeCount }, { count: dislikeCount }] = await Promise.all(
        [
          supabase
            .from('post_reactions')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', slugOrId)
            .eq('type', 'like'),
          supabase
            .from('post_reactions')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', slugOrId)
            .eq('type', 'dislike'),
        ],
      );

      let reactionData = undefined;
      let bookmarkData = undefined;

      // If we have a user, fetch their specific reaction and bookmark data
      if (userId !== null && userId !== undefined) {
        // Fetch user reaction
        const { data: userReaction } = await supabase
          .from('post_reactions' as const)
          .select('type')
          .eq('post_id', slugOrId)
          .eq('user_id', userId)
          .maybeSingle();

        // Fetch user bookmark
        const { data: userBookmark } = await supabase
          .from('post_bookmarks' as const)
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
            : undefined,
          user_bookmark: bookmarkData
            ? { id: bookmarkData.post_id }
            : undefined,
          // Use real counts from post_reactions table
          real_like_count: likeCount ?? 0,
          real_dislike_count: dislikeCount ?? 0,
        },
        error: undefined,
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
      return { data: undefined, error: postError.message };
    }

    if (postData === null || postData === undefined) {
      return { data: undefined, error: 'Post not found' };
    }

    // Get real like/dislike counts from post_reactions table
    const [{ count: likeCount }, { count: dislikeCount }] = await Promise.all([
      supabase
        .from('post_reactions')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', slugOrId)
        .eq('type', 'like'),
      supabase
        .from('post_reactions')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', slugOrId)
        .eq('type', 'dislike'),
    ]);

    let reactionData = undefined;
    let bookmarkData = undefined;

    // If we have a user, fetch their specific reaction and bookmark data
    if (userId !== null && userId !== undefined) {
      // Fetch user reaction
      const { data: userReaction } = await supabase
        .from('post_reactions' as const)
        .select('type')
        .eq('post_id', slugOrId)
        .eq('user_id', userId)
        .maybeSingle();

      // Fetch user bookmark
      const { data: userBookmark } = await supabase
        .from('post_bookmarks' as const)
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
          : undefined,
        user_bookmark: bookmarkData ? { id: bookmarkData.post_id } : undefined,
        // Use real counts from post_reactions table
        real_like_count: likeCount ?? 0,
        real_dislike_count: dislikeCount ?? 0,
      },
      error: undefined,
    };
  } catch (error: unknown) {
    console.error('Unexpected error in getPostBySlugOrId:', error);
    return {
      data: undefined,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export default async function PostBySlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<React.ReactElement> {
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
      post.is_public === true &&
      post.published_at !== null &&
      post.published_at !== undefined &&
      new Date(post.published_at) <= new Date();

    if (isPublished !== true && isOwner !== true) {
      notFound();
    }

    // Safe fallbacks for data
    const authorName =
      post.author?.full_name !== null && post.author?.full_name !== undefined
        ? post.author.full_name
        : 'Anonymous';
    const authorUsername =
      post.author?.username !== null && post.author?.username !== undefined
        ? post.author.username
        : post.author?.id !== null && post.author?.id !== undefined
          ? post.author.id
          : 'unknown';
    const authorInitials =
      authorName
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, MAX_AUTHOR_INITIALS) !== ''
        ? authorName
            .split(' ')
            .map((n: string) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, MAX_AUTHOR_INITIALS)
        : 'A';

    const readingTime = calculateReadingTime(post.content ?? '');
    const viewCount =
      post.view_count !== null && post.view_count !== undefined
        ? post.view_count
        : 0;
    const initialLikeCount =
      post.real_like_count !== null && post.real_like_count !== undefined
        ? post.real_like_count
        : 0;
    const initialDislikeCount =
      post.real_dislike_count !== null && post.real_dislike_count !== undefined
        ? post.real_dislike_count
        : 0;
    const initialUserReaction =
      post.user_reaction?.reaction_type === 'like' ||
      post.user_reaction?.reaction_type === 'dislike'
        ? post.user_reaction.reaction_type
        : undefined;
    const initialBookmarked =
      post.user_bookmark?.id !== null && post.user_bookmark?.id !== undefined;

    // Fetch comment count via RPC for this post
    const { data: rpcCommentCount, error: commentCountError } =
      await supabase.rpc('get_comment_count', {
        p_entity_type: 'post',
        p_entity_id: slugOrId,
      });

    if (commentCountError) {
      console.error('Error fetching comment count:', commentCountError);
    }

    const initialCommentCount =
      rpcCommentCount !== null && rpcCommentCount !== undefined
        ? rpcCommentCount
        : 0;

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
                postId={post.id}
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
            {/* Thumbnail Hero */}
            {post.thumbnail_url !== null &&
              post.thumbnail_url !== undefined && (
                <div className="relative aspect-video w-full mb-12 overflow-hidden rounded-lg bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={post.thumbnail_url}
                    alt={
                      post.title !== null && post.title !== undefined
                        ? post.title
                        : 'Post thumbnail'
                    }
                    className="w-full h-full object-cover transition-transform duration-200 hover:scale-105"
                    loading="lazy"
                  />
                </div>
              )}

            {/* Title Section */}
            <header className="mb-12">
              <h1 className="text-5xl font-bold leading-tight mb-6 text-foreground">
                {post.title !== null && post.title !== undefined
                  ? post.title
                  : 'Untitled Post'}
              </h1>

              {/* Subtitle */}
              {post.subtitle !== null && post.subtitle !== undefined && (
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
                    {post.collective !== null &&
                      post.collective !== undefined && (
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
                {user?.id !== null &&
                  user?.id !== undefined &&
                  user.id !== post.author_id && (
                    <Button variant="outline" size="sm">
                      Follow
                    </Button>
                  )}
              </div>

              {/* Reaction Bar */}
              <div className="border-y py-4">
                <PostReactionButtons
                  id={post.id}
                  initialLikeCount={initialLikeCount}
                  initialDislikeCount={initialDislikeCount}
                  initialUserReaction={
                    initialUserReaction as 'like' | 'dislike' | null
                  }
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
              <Suspense
                fallback={
                  <div className="animate-pulse">
                    <div className="h-4 bg-muted rounded w-full mb-4"></div>
                    <div className="h-4 bg-muted rounded w-3/4 mb-4"></div>
                    <div className="h-4 bg-muted rounded w-5/6"></div>
                  </div>
                }
              >
                <ReadOnlyLexicalViewer contentJSON={post.content ?? ''} />
              </Suspense>
            </div>

            {/* Post Footer */}
            <footer className="mt-16 pt-8 border-t">
              {/* Author Bio */}
              {post.author?.bio !== null && post.author?.bio !== undefined && (
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
                <Suspense fallback={<CommentsSkeleton />}>
                  <CommentSection
                    entityType="post"
                    entityId={post.id}
                    initialCommentsCount={initialCommentCount}
                  />
                </Suspense>
              </div>
            </footer>
          </div>
        </article>
      </>
    );
  } catch (error: unknown) {
    console.error('Error loading post:', error);
    notFound();
  }
}
