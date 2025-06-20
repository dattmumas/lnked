'use client';

import {
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  Bookmark,
  Share2,
  ExternalLink,
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
  postSlug?: string;
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
  showViewCount = false,
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

  const handleNativeShare = useCallback((): void => {
    void handleShare('native');
  }, [handleShare]);

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

  return (
    <div className="flex items-center justify-between pt-4 border-t border-border">
      {/* Reaction Buttons */}
      <div className="flex items-center gap-1">
        <Button
          variant={interactions.isLiked ? 'default' : 'ghost'}
          size="sm"
          onClick={handleLikeClick}
          disabled={disabled || isPending}
          className="flex items-center gap-2 rounded-full"
          aria-label={interactions.isLiked ? 'Unlike post' : 'Like post'}
        >
          <ThumbsUp
            className={`h-4 w-4 ${
              interactions.isLiked
                ? 'text-accent-foreground'
                : 'text-muted-foreground'
            }`}
          />
          <span className="text-sm tabular-nums">
            {formatCount(interactions.likeCount)}
          </span>
        </Button>

        <Button
          variant={interactions.isDisliked ? 'destructive' : 'ghost'}
          size="sm"
          onClick={handleDislikeClick}
          disabled={disabled || isPending}
          className="flex items-center gap-2 rounded-full"
          aria-label={
            interactions.isDisliked ? 'Remove dislike' : 'Dislike post'
          }
        >
          <ThumbsDown
            className={`h-4 w-4 ${
              interactions.isDisliked
                ? 'text-destructive-foreground'
                : 'text-muted-foreground'
            }`}
          />
          <span className="text-sm tabular-nums">
            {formatCount(interactions.dislikeCount)}
          </span>
        </Button>
      </div>

      {/* Secondary Actions */}
      <div className="flex items-center gap-1">
        {/* Comments */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCommentsClick}
          className="flex items-center gap-2 rounded-full"
          aria-label="View comments"
        >
          <MessageCircle className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground tabular-nums">
            {formatCount(interactions.commentCount)}
          </span>
        </Button>

        {/* Views (optional) */}
        {showViewCount && interactions.viewCount !== undefined && (
          <div className="flex items-center gap-1 px-2">
            <span className="text-xs text-muted-foreground">
              {formatCount(interactions.viewCount)} views
            </span>
          </div>
        )}

        {/* Bookmark */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBookmarkClick}
          disabled={disabled || isPending}
          className="rounded-full"
          aria-label={
            interactions.isBookmarked ? 'Remove bookmark' : 'Bookmark post'
          }
        >
          <Bookmark
            className={`h-4 w-4 ${
              interactions.isBookmarked
                ? 'fill-accent text-accent'
                : 'text-muted-foreground'
            }`}
          />
        </Button>

        {/* Share */}
        <DropdownMenu open={shareMenuOpen} onOpenChange={setShareMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full"
              aria-label="Share post"
            >
              <Share2 className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <DropdownMenuItem onClick={handleNativeShare}>
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={handleCopyShare}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Copy link
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
