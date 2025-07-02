import Image from 'next/image';
import Link from 'next/link';
import React from 'react';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

import PostCardFooter from './PostCardFooter';
import PostCardHeader from './PostCardHeader';

// Constants
const DEFAULT_EXCERPT_LENGTH = 150;

interface Author {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

interface Collective {
  id: string;
  name: string;
  slug: string;
}

interface PostInteractions {
  isLiked: boolean;
  isDisliked: boolean;
  isBookmarked: boolean;
  likeCount: number;
  dislikeCount: number;
  commentCount: number;
  viewCount?: number;
}

interface ArticlePost {
  id: string;
  title: string;
  content?: string | null;
  meta_description?: string | null;
  thumbnail_url?: string | null;
  slug?: string | null;
  created_at: string;
  author: Author;
  collective?: Collective | null;
}

interface ArticleCardProps {
  post: ArticlePost;
  interactions: PostInteractions;
  onToggleLike?: () => void;
  onToggleDislike?: () => void;
  onToggleBookmark?: () => void;
  onFollow?: () => void;
  isFollowing?: boolean;
  currentUserId?: string;
  showFollowButton?: boolean;
  className?: string;
}

// Utility function to extract text from content
function getPostExcerpt(content: string | undefined | null): string {
  if (!content) {
    return '';
  }

  // For now, just truncate the content
  // When TipTap is implemented, this will handle its format
  const plainText = content.replace(/<[^>]*>/g, ''); // Remove any HTML tags
  return plainText.length > 200
    ? `${plainText.substring(0, 200)}...`
    : plainText;
}

export default function ArticleCard({
  post,
  interactions,
  onToggleLike,
  onToggleDislike,
  onToggleBookmark,
  onFollow,
  isFollowing = false,
  currentUserId,
  showFollowButton = false,
  className,
}: ArticleCardProps): React.ReactElement {
  const postUrl =
    post.slug !== undefined && post.slug !== null && post.slug.length > 0
      ? `/posts/${post.slug}`
      : `/posts/${post.id}`;

  const excerpt = post.meta_description ?? getPostExcerpt(post.content ?? null);

  return (
    <Card
      className={cn(
        'overflow-hidden rounded-xl border bg-card shadow-sm transition-all duration-300 ease-in-out hover:shadow-md',
        className,
      )}
    >
      <div className="p-6">
        <PostCardHeader
          author={post.author}
          timestamp={post.created_at}
          {...(post.collective ? { collective: post.collective } : {})}
          showFollowButton={showFollowButton}
          {...(currentUserId ? { currentUserId } : {})}
          {...(onFollow ? { onFollow } : {})}
          isFollowing={isFollowing}
        />

        {post.thumbnail_url && (
          <Link href={postUrl} className="mt-4 block">
            <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
              <Image
                src={post.thumbnail_url}
                alt={post.title}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </div>
          </Link>
        )}

        <div className="mt-4">
          <Link href={postUrl} className="group block">
            <h2 className="text-xl font-bold leading-snug tracking-tight group-hover:text-primary transition-colors">
              {post.title}
            </h2>
            {excerpt && (
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground line-clamp-3">
                {excerpt}
              </p>
            )}
          </Link>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <Link
            href={postUrl}
            className="text-sm font-semibold text-primary hover:underline"
          >
            Read more →
          </Link>
        </div>
      </div>

      <PostCardFooter
        postId={post.id}
        postSlug={post.slug ?? null}
        postTitle={post.title}
        interactions={interactions}
        {...(onToggleLike ? { onToggleLike } : {})}
        {...(onToggleDislike ? { onToggleDislike } : {})}
        {...(onToggleBookmark ? { onToggleBookmark } : {})}
        showViewCount
      />
    </Card>
  );
}
