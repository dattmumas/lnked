'use client';

import parse from 'html-react-parser';
import DOMPurify from 'isomorphic-dompurify';
import { useMemo } from 'react';

import BookmarkButton from '@/components/app/posts/molecules/BookmarkButton';
import PostReactionButtons from '@/components/app/posts/molecules/PostReactionButtons';
import PostViewTracker from '@/components/app/posts/molecules/PostViewTracker';
import { formatPostDate } from '@/lib/posts';
import { transformImageUrls } from '@/lib/utils/transform-image-urls';

import type {
  PostWithAuthorAndCollective,
  PostViewer as PostViewerType,
} from '@/lib/posts';

interface Props {
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
}

// Overlay variant drops the internal navbar/header; rest identical to PostViewer
export default function OverlayPostViewer({ post, viewer, viewModel }: Props) {
  const authorName = post.author?.full_name || 'Anonymous';
  const authorUsername = post.author?.username || post.author?.id || 'unknown';

  const initialLikeCount = post.real_like_count ?? 0;
  const initialDislikeCount = post.real_dislike_count ?? 0;
  const initialUserReaction =
    (viewer.userReaction as 'like' | 'dislike' | null) ?? null;
  const initialBookmarked = viewer.isBookmarked;

  const sanitizedHtml = useMemo(
    () =>
      DOMPurify.sanitize(transformImageUrls(post.content ?? ''), {
        USE_PROFILES: { html: true },
      }),
    [post.content],
  );

  return (
    <>
      <PostViewTracker postId={post.id} />

      {/* Main Content without sticky header */}
      <article className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-6 py-12">
          {/* Thumbnail Hero */}
          {post.thumbnail_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.thumbnail_url}
              alt={post.title || 'Post thumbnail'}
              className="w-full h-auto mb-12 rounded-lg object-cover"
            />
          )}

          {/* Title Section (simplified) */}
          <header className="mb-8">
            <h1 className="text-4xl font-bold mb-4 text-foreground">
              {post.title || 'Untitled Post'}
            </h1>
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <span>
                {formatPostDate(post.published_at || post.created_at)}
              </span>
              <span>·</span>
              <span>{viewModel.readingTime}</span>
              <span>·</span>
              <span>{viewModel.formattedViewCount}</span>
            </div>
          </header>

          {/* Reaction Bar */}
          <div className="border-y py-4 mb-8">
            <PostReactionButtons
              id={post.id}
              initialLikeCount={initialLikeCount}
              initialDislikeCount={initialDislikeCount}
              initialUserReaction={initialUserReaction}
              disabled={!viewer.canReact}
            />
            <div className="ml-4 inline-block">
              <BookmarkButton
                postId={post.id}
                initialBookmarked={initialBookmarked}
                disabled={!viewer.canReact}
              />
            </div>
          </div>

          {/* Post Content */}
          <div className="article-content">
            {post.content ? (
              post.content.includes('<') && post.content.includes('>') ? (
                parse(sanitizedHtml)
              ) : (
                <div className="whitespace-pre-wrap">{post.content}</div>
              )
            ) : (
              <p className="text-muted-foreground">*(No content)*</p>
            )}
          </div>
        </div>
      </article>
    </>
  );
}
