'use client';

import { Edit, Share2, MoreHorizontal } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Suspense } from 'react';

import { CommentSection } from '@/components/app/comments';
import BookmarkButton from '@/components/app/posts/molecules/BookmarkButton';
import PostReactionButtons from '@/components/app/posts/molecules/PostReactionButtons';
import PostViewTracker from '@/components/app/posts/molecules/PostViewTracker';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import BackButton from '@/components/ui/BackButton';
import { Button } from '@/components/ui/button';
import { CommentsSkeleton } from '@/components/ui/CommentsSkeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatPostDate } from '@/lib/posts';
import { transformImageUrls } from '@/lib/utils/transform-image-urls';

import type {
  PostWithAuthorAndCollective,
  PostViewer as PostViewerType,
} from '@/lib/posts';

interface PostViewerProps {
  post: PostWithAuthorAndCollective;
  viewer: PostViewerType;
  viewModel: {
    readingTime: string;
    authorInitials: string;
    formattedViewCount: string;
    hasAuthor: boolean;
    hasCollective: boolean;
    isPublished: boolean;
  };
  initialCommentCount: number;
}

export default function PostViewer({
  post,
  viewer,
  viewModel,
  initialCommentCount,
}: PostViewerProps) {
  // Safe fallbacks for data
  const authorName = post.author?.full_name || 'Anonymous';
  const authorUsername = post.author?.username || post.author?.id || 'unknown';

  const initialLikeCount = post.real_like_count ?? 0;
  const initialDislikeCount = post.real_dislike_count ?? 0;
  const initialUserReaction =
    (viewer.userReaction as 'like' | 'dislike' | null) ?? null;
  const initialBookmarked = viewer.isBookmarked;

  return (
    <>
      <PostViewTracker postId={post.id} />

      {/* Header Bar */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm border-b">
        <div className="w-full mx-auto px-6 py-3 flex items-center justify-between">
          <BackButton />

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <Share2 className="h-4 w-4" />
            </Button>
            <BookmarkButton
              postId={post.id}
              initialBookmarked={initialBookmarked}
              disabled={!viewer.canReact}
            />
            {viewer.canEdit && (
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
          {post.thumbnail_url && (
            <div className="relative aspect-video w-full mb-12 overflow-hidden rounded-lg bg-muted">
              <Image
                src={post.thumbnail_url}
                alt={post.title || 'Post thumbnail'}
                fill
                priority
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
                className="object-cover transition-transform duration-200 hover:scale-105"
                placeholder="blur"
                blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
              />
            </div>
          )}

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
                <AvatarFallback>{viewModel.authorInitials}</AvatarFallback>
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
                  <span>{viewModel.readingTime}</span>
                  <span>·</span>
                  <span>{viewModel.formattedViewCount}</span>
                </div>
              </div>
              {viewer.canReact && !viewer.isOwner && (
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
                initialUserReaction={initialUserReaction}
                disabled={!viewer.canReact}
              />
            </div>
          </header>

          {/* Post Content */}
          <div className="article-content">
            {post.content ? (
              // Check if content contains HTML tags
              post.content.includes('<') && post.content.includes('>') ? (
                <div
                  dangerouslySetInnerHTML={{
                    __html: transformImageUrls(post.content),
                  }}
                />
              ) : (
                // Render plain text with preserved line breaks
                <div className="whitespace-pre-wrap">{post.content}</div>
              )
            ) : (
              <p className="text-muted-foreground">*(No content)*</p>
            )}
          </div>

          {/* Comments Section */}
          <div className="mt-16 pt-8 border-t">
            <h2 className="text-2xl font-bold mb-8">
              Comments ({initialCommentCount})
            </h2>
            <Suspense fallback={<CommentsSkeleton />}>
              <CommentSection
                entityType="post"
                entityId={post.id}
                initialCommentsCount={initialCommentCount}
              />
            </Suspense>
          </div>
        </div>
      </article>
    </>
  );
}
