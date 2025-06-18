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
import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';


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
}: PostCardFooterProps) {
  const [isPending, startTransition] = useTransition();
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const router = useRouter();

  const postUrl = postSlug ? `/posts/${postSlug}` : `/posts/${postId}`;

  const handleReaction = (type: 'like' | 'dislike') => {
    if (disabled || isPending) return;

    startTransition(() => {
      if (type === 'like' && onToggleLike) {
        onToggleLike();
      } else if (type === 'dislike' && onToggleDislike) {
        onToggleDislike();
      }
    });
  };

  const handleBookmark = () => {
    if (disabled || isPending || !onToggleBookmark) return;

    startTransition(() => {
      onToggleBookmark();
    });
  };

  const handleCommentsClick = () => {
    void router.push(`${postUrl}#comments`);
  };

  const handleShare = async (method: 'copy' | 'native') => {
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
      } catch (error: unknown) {
        // User cancelled or error occurred, fallback to copy
        await navigator.clipboard.writeText(fullUrl);
      }
    } else {
      await navigator.clipboard.writeText(fullUrl);
    }

    setShareMenuOpen(false);
  };

  const formatCount = (count: number): string => {
    const num = count ?? 0;
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  return (
    <div className="flex items-center justify-between pt-4 border-t border-border">
      {/* Reaction Buttons */}
      <div className="flex items-center gap-1">
        <Button
          variant={interactions.isLiked ? 'default' : 'ghost'}
          size="sm"
          onClick={() => void handleReaction('like')}
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
          onClick={() => void handleReaction('dislike')}
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
          onClick={() => void handleBookmark()}
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
              <DropdownMenuItem onClick={() => void handleShare('native')}>
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => void handleShare('copy')}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Copy link
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
