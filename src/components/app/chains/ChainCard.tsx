'use client';

import {
  ThumbsUp,
  ThumbsDown,
  Reply,
  Share2,
  MoreHorizontal,
  Loader2,
} from 'lucide-react';
import React, { useCallback } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

import ChainCarousel from './ChainCarousel';

// Character limit matching composer
const CHARACTER_LIMIT = 280;

export interface ChainUser {
  name: string;
  username: string;
  avatar_url?: string;
}

export interface ChainStats {
  likes: number;
  replies: number;
  shares: number;
  dislikes: number;
}

export interface ChainItem {
  id: string;
  author_id?: string;
  user: ChainUser;
  content: string;
  timestamp: string;
  type: 'post' | 'reply' | 'share';
  stats: ChainStats;
  userInteraction?: {
    liked: boolean;
    bookmarked: boolean;
  };
  link_preview?: {
    url: string;
    title?: string | null;
    description?: string | null;
    image?: string | null;
    site?: string | null;
  } | null;
}

export interface MediaItem {
  id: string;
  storage_path: string;
  width: number | null;
  height: number | null;
  blurhash: string | null;
  alt_text: string | null;
  type: string;
  ordinal: number;
}

export interface ChainCardInteractions {
  likedChains: Set<string>;
  dislikedChains: Set<string>;
  toggleLike: (id: string) => void;
  toggleDislike: (id: string) => void;
  startReply: (id: string) => void;
  cancelReply: () => void;
  replyingTo: string | undefined;
  replyContent: string;
  setReplyContent: (val: string) => void;
  isPosting: boolean;
  submitReply: (id: string) => void;
  shareChain: (id: string, content: string) => void;
  getDeltas: (id: string) => { like: number; dislike: number };
}

export interface ChainCardProps {
  item: ChainItem;
  currentUserId: string;
  interactions: ChainCardInteractions;
  onDelete?: (id: string) => void;
  /** Optional handler that opens the full thread view. If provided, a small link will appear in the action bar. */
  onOpenThread?: () => void;
  media?: MediaItem[];
}

export default function ChainCard({
  item,
  currentUserId,
  interactions,
  onDelete,
  onOpenThread,
  media,
}: ChainCardProps): React.ReactElement {
  const handleToggleLike = useCallback((): void => {
    interactions.toggleLike(item.id);
  }, [interactions, item.id]);

  const handleToggleDislike = useCallback((): void => {
    interactions.toggleDislike(item.id);
  }, [interactions, item.id]);

  const handleStartReply = useCallback((): void => {
    interactions.startReply(item.id);
  }, [interactions, item.id]);

  const handleShare = useCallback((): void => {
    interactions.shareChain(item.id, item.content);
  }, [interactions, item.id, item.content]);

  const handleSubmitReply = useCallback((): void => {
    interactions.submitReply(item.id);
  }, [interactions, item.id]);

  const isLiked = interactions.likedChains.has(item.id);
  const isDisliked = interactions.dislikedChains.has(item.id);
  const isReplying = interactions.replyingTo === item.id;

  const delta = interactions.getDeltas(item.id);

  return (
    <div
      className={cn(
        'relative mb-4 mx-3 rounded-2xl p-5 transition-all',
        'bg-white/5 dark:bg-white/10 bg-clip-padding backdrop-filter',
        'backdrop-blur-md backdrop-saturate-150',
        'border border-white/20 dark:border-white/10',
        'ring-1 ring-inset ring-white/10 dark:ring-white/5',
        'shadow-md hover:shadow-lg',
      )}
    >
      <div className="flex gap-3">
        <Avatar className="w-9 h-9 flex-shrink-0">
          {item.user.avatar_url ? (
            <AvatarImage src={item.user.avatar_url} alt={item.user.name} />
          ) : (
            <AvatarFallback className="text-xs">
              {item.user.name
                .split(' ')
                .map((n) => n[0])
                .join('')}
            </AvatarFallback>
          )}
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-1">
            <div className="flex items-baseline flex-wrap gap-x-1.5 min-w-0 pr-2">
              <span className="font-medium text-sm truncate max-w-[150px] text-foreground">
                {item.user.name}
              </span>
              <span className="text-muted-foreground text-xs truncate max-w-[100px]">
                @{item.user.username}
              </span>
            </div>
            <span className="text-muted-foreground text-xs flex-shrink-0">
              {item.timestamp}
            </span>
          </div>
          <p className="text-sm text-foreground mb-2.5 leading-relaxed break-words">
            {item.content}
          </p>

          {/* Image carousel */}
          {media && media.length > 0 && (
            <div className="mb-3 -ml-[3rem] md:-ml-[3rem]">
              <ChainCarousel media={media} />
            </div>
          )}

          {/* Link preview */}
          {item.link_preview && (
            <a
              href={item.link_preview.url}
              target="_blank"
              rel="noreferrer"
              className="block rounded-lg overflow-hidden border border-white/10 dark:border-white/5 hover:bg-white/5/10 transition mb-3"
            >
              {item.link_preview.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.link_preview.image}
                  alt=""
                  className="w-full max-h-48 object-cover"
                />
              )}
              <div className="p-3 space-y-0.5 bg-background/80 backdrop-blur-sm">
                <p className="text-sm font-medium line-clamp-2">
                  {item.link_preview.title}
                </p>
                {item.link_preview.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {item.link_preview.description}
                  </p>
                )}
                <span className="text-xs text-muted-foreground">
                  {item.link_preview.site ??
                    new URL(item.link_preview.url).hostname}
                </span>
              </div>
            </a>
          )}

          {/* Action bar */}
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={handleToggleLike}
              className={cn(
                'flex items-center gap-1.5 text-xs transition-colors',
                isLiked
                  ? 'text-accent'
                  : 'text-muted-foreground hover:text-accent',
              )}
            >
              <ThumbsUp className={cn('w-4 h-4', isLiked && 'fill-current')} />
              <span>{item.stats.likes + delta.like}</span>
            </button>

            <button
              type="button"
              onClick={handleToggleDislike}
              className={cn(
                'flex items-center gap-1.5 text-xs transition-colors',
                isDisliked
                  ? 'text-destructive'
                  : 'text-muted-foreground hover:text-destructive',
              )}
            >
              <ThumbsDown
                className={cn('w-4 h-4', isDisliked && 'fill-current')}
              />
              <span>{item.stats.dislikes + delta.dislike}</span>
            </button>

            <button
              type="button"
              onClick={handleStartReply}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-accent transition-colors"
            >
              <Reply className="w-4 h-4" />
              <span>{item.stats.replies}</span>
            </button>

            {onOpenThread && (
              <button
                type="button"
                onClick={(e): void => {
                  e.stopPropagation();
                  onOpenThread();
                }}
                className="text-xs underline text-foreground hover:text-accent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 rounded-sm"
              >
                See Chain
              </button>
            )}

            <div className="flex items-center gap-5 ml-auto">
              <button
                type="button"
                onClick={handleShare}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-accent transition-colors"
              >
                <Share2 className="w-4 h-4" />
                <span>{item.stats.shares}</span>
              </button>

              {/* More menu for author */}
              {item.author_id === currentUserId ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="ml-auto text-muted-foreground hover:text-accent transition-colors"
                      aria-label="Chain options"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    sideOffset={4}
                    align="center"
                    className="z-50 min-w-[120px] rounded-md border bg-background p-1"
                  >
                    <DropdownMenuItem
                      onSelect={(): void => onDelete?.(item.id)}
                      className="flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm text-destructive focus:bg-accent/10 dark:focus:bg-accent/20 outline-none"
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <button
                  type="button"
                  className="text-muted-foreground hover:text-accent transition-colors"
                  aria-label="Chain options"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Reply form */}
          {isReplying && (
            <div className="mt-4 space-y-3">
              <Textarea
                value={interactions.replyContent}
                onChange={(e): void =>
                  interactions.setReplyContent(e.target.value)
                }
                placeholder={`Reply to ${item.user.name}...`}
                className="w-full text-sm min-h-[70px] resize-none"
                maxLength={CHARACTER_LIMIT}
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {CHARACTER_LIMIT - interactions.replyContent.length}{' '}
                  characters remaining
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={interactions.cancelReply}
                    className="h-7 text-xs px-3"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSubmitReply}
                    disabled={
                      interactions.replyContent.trim().length === 0 ||
                      interactions.isPosting
                    }
                    className="h-7 text-xs px-3"
                  >
                    {interactions.isPosting ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      'Reply'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
