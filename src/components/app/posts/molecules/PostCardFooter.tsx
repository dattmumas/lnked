'use client';

import {
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  Bookmark,
  Share2,
  ExternalLink,
  MessageSquare,
  Repeat2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useCallback, useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import BookmarkButton from '@/components/app/posts/molecules/BookmarkButton';
import { CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

// Constants
const MILLION = 1000000;
const THOUSAND = 1000;
const DECIMAL_PLACES = 1;

interface PostInteractions {
  isLiked: boolean;
  isDisliked: boolean;
  isBookmarked: boolean;
  likeCount: number;
  dislikeCount: number;
  commentCount: number;
  viewCount?: number;
}

interface PostCardFooterProps {
  postId: string;
  postSlug?: string | null;
  postTitle: string;
  interactions: PostInteractions;
  onToggleLike?: () => void;
  onToggleDislike?: () => void;
  onToggleBookmark?: () => void;
  disabled?: boolean;
  showViewCount?: boolean;
}

export default function PostCardFooter({
  postId,
  postSlug,
  postTitle,
  interactions,
  onToggleLike,
  onToggleDislike,
  onToggleBookmark,
  disabled = false,
  showViewCount = true,
}: PostCardFooterProps): React.ReactElement {
  const [isPending, startTransition] = useTransition();
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const router = useRouter();

  const postUrl =
    postSlug !== undefined && postSlug !== null && postSlug.length > 0
      ? `/posts/${postSlug}`
      : `/posts/${postId}`;

  const handleReaction = useCallback(
    (type: 'like' | 'dislike'): void => {
      if (disabled || isPending) return;

      startTransition(() => {
        if (type === 'like' && onToggleLike) {
          onToggleLike();
        } else if (type === 'dislike' && onToggleDislike) {
          onToggleDislike();
        }
      });
    },
    [disabled, isPending, onToggleLike, onToggleDislike],
  );

  const handleBookmark = useCallback((): void => {
    if (disabled || isPending || !onToggleBookmark) return;

    startTransition(() => {
      onToggleBookmark();
    });
  }, [disabled, isPending, onToggleBookmark]);

  const handleCommentsClick = useCallback((): void => {
    void router.push(`${postUrl}#comments`);
  }, [router, postUrl]);

  const handleShare = useCallback(
    async (method: 'copy' | 'native'): Promise<void> => {
      const fullUrl = `${window.location.origin}${postUrl}`;

      if (
        method === 'native' &&
        typeof navigator !== 'undefined' &&
        'share' in navigator
      ) {
        try {
          await navigator.share({
            title: postTitle,
            url: fullUrl,
          });
        } catch {
          // User cancelled or error occurred, fallback to copy
          await navigator.clipboard.writeText(fullUrl);
        }
      } else {
        await navigator.clipboard.writeText(fullUrl);
      }

      setShareMenuOpen(false);
    },
    [postUrl, postTitle],
  );

  const handleLikeClick = useCallback((): void => {
    void handleReaction('like');
  }, [handleReaction]);

  const handleDislikeClick = useCallback((): void => {
    void handleReaction('dislike');
  }, [handleReaction]);

  const handleBookmarkClick = useCallback((): void => {
    void handleBookmark();
  }, [handleBookmark]);

  const handleNativeShare = (): void => {
    handleShare('native');
  };

  const handleCopyShare = useCallback((): void => {
    void handleShare('copy');
  }, [handleShare]);

  const formatCount = useCallback((count: number): string => {
    const num = count ?? 0;
    if (num >= MILLION) {
      return `${(num / MILLION).toFixed(DECIMAL_PLACES)}M`;
    } else if (num >= THOUSAND) {
      return `${(num / THOUSAND).toFixed(DECIMAL_PLACES)}K`;
    }
    return num.toString();
  }, []);

  const shareUrl =
    postSlug !== undefined && postSlug !== null
      ? `${window.location.origin}/posts/${postSlug}`
      : `${window.location.origin}/posts/${postId}`;

  return (
    <>
      <Separator />
      <CardFooter className="px-6 py-3 flex items-center justify-between text-muted-foreground text-sm">
        <div className="flex items-center gap-6">
          {/* Like Button */}
          <button
            type="button"
            className={cn(
              'flex items-center gap-1.5 hover:text-primary transition-colors',
              interactions.isLiked && 'text-primary font-semibold',
            )}
            onClick={handleLikeClick}
            aria-pressed={interactions.isLiked}
          >
            <ThumbsUp className="h-4 w-4" />
            <span>{formatCount(interactions.likeCount)}</span>
          </button>

          {/* Dislike Button */}
          <button
            type="button"
            className={cn(
              'flex items-center gap-1.5 hover:text-destructive transition-colors',
              interactions.isDisliked && 'text-destructive font-semibold',
            )}
            onClick={handleDislikeClick}
            aria-pressed={interactions.isDisliked}
          >
            <ThumbsDown className="h-4 w-4" />
            <span>{formatCount(interactions.dislikeCount)}</span>
          </button>

          {/* Comment Button */}
          <button
            type="button"
            className="flex items-center gap-1.5 hover:text-primary transition-colors"
            onClick={handleCommentsClick}
          >
            <MessageSquare className="h-4 w-4" />
            <span>{formatCount(interactions.commentCount)}</span>
          </button>
        </div>

        <div className="flex items-center gap-4">
          {/* View Count */}
          {showViewCount && interactions.viewCount !== undefined && (
            <div className="flex items-center gap-1.5">
              <span>{formatCount(interactions.viewCount)} views</span>
            </div>
          )}

          {/* Bookmark and Share */}
          <BookmarkButton
            postId={postId}
            initialBookmarked={interactions.isBookmarked}
          />
          <button
            type="button"
            className="p-2 hover:bg-muted rounded-full transition-colors"
            onClick={handleNativeShare}
          >
            <Share2 className="h-4 w-4" />
            <span className="sr-only">Share</span>
          </button>
        </div>
      </CardFooter>
    </>
  );
}
