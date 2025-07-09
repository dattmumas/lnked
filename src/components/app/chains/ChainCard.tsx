'use client';

import {
  ThumbsUp,
  ThumbsDown,
  Reply,
  Share2,
  MoreHorizontal,
  Loader2,
  Repeat,
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
import ChainContentParser from './ChainContentParser';

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
  meta?: {
    references?: {
      type: 'user' | 'post';
      id: string;
      text: string;
      offset: number;
      length: number;
    }[];
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
  rechainedChains: Set<string>;
  toggleLike: (id: string) => Promise<void>;
  toggleDislike: (id: string) => Promise<void>;
  toggleRechain: (id: string) => Promise<void>;
  getDeltas: (id: string) => { like: number; dislike: number; rechain: number };
  startReply: (id: string) => void;
  cancelReply: () => void;
  replyingTo?: string;
  replyContent: string;
  setReplyContent: (val: string) => void;
  isPosting: boolean;
  submitReply: (id: string) => void;
  shareChain: (id: string, content: string) => void;
}

export interface ChainCardProps {
  item: ChainItem;
  currentUserId: string;
  interactions: ChainCardInteractions;
  onDelete?: (id: string) => void;
  /** Optional handler that opens the full thread view. If provided, a small link will appear in the action bar. */
  onOpenThread?: () => void;
  media?: MediaItem[];
  meta?: {
    references?: {
      type: 'user' | 'post';
      id: string;
      text: string;
      offset: number;
      length: number;
    }[];
  } | null;
}

// Format timestamp to compact format (Mon 15 2:30pm)
function formatCompactTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      // For today, just show time (2:30pm)
      return date
        .toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        })
        .toLowerCase();
    } else {
      // For other days, show Mon 15 2:30pm
      const month = date.toLocaleDateString('en-US', { month: 'short' });
      const day = date.getDate();
      const time = date
        .toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        })
        .toLowerCase();

      return `${month} ${day} ${time}`;
    }
  } catch {
    // Fallback to original timestamp if parsing fails
    return timestamp;
  }
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
    if (process.env.NODE_ENV === 'development') {
      const likedBefore = interactions.likedChains.has(item.id);
      const dislikedBefore = interactions.dislikedChains.has(item.id);
      // eslint-disable-next-line no-console
      console.log('[CHAIN_REACTION] Like button clicked', {
        chainId: item.id,
        likedBefore,
        dislikedBefore,
      });
    }
    interactions.toggleLike(item.id);
  }, [interactions, item.id]);

  const handleToggleDislike = useCallback((): void => {
    if (process.env.NODE_ENV === 'development') {
      const likedBefore = interactions.likedChains.has(item.id);
      const dislikedBefore = interactions.dislikedChains.has(item.id);
      // eslint-disable-next-line no-console
      console.log('[CHAIN_REACTION] Dislike button clicked', {
        chainId: item.id,
        likedBefore,
        dislikedBefore,
      });
    }
    interactions.toggleDislike(item.id);
  }, [interactions, item.id]);

  const handleToggleRechain = useCallback((): void => {
    interactions.toggleRechain(item.id);
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
  const isRechained = interactions.rechainedChains.has(item.id);
  const isReplying = interactions.replyingTo === item.id;

  const delta = interactions.getDeltas(item.id);

  return (
    <article
      className={cn(
        // Base layout and spacing
        'relative mx-4 mb-6',

        // Modern card styling with enhanced contrast
        'rounded-3xl bg-white/[0.02] backdrop-blur-xl',
        'border border-white/[0.08] dark:border-white/[0.06]',

        // Elevated appearance with sophisticated shadows
        'shadow-md',
        'dark:shadow-md',

        // Interactive states
        'hover:shadow-lg',
        'dark:hover:shadow-lg',
        'hover:border-white/[0.12] dark:hover:border-white/[0.1]',
        'transition-all duration-300 ease-out',

        // Subtle gradient overlay
        'before:absolute before:inset-0 before:rounded-3xl',
        'before:bg-gradient-to-br before:from-white/[0.03] before:to-transparent',
        'before:pointer-events-none',
      )}
    >
      {/* Header Section */}
      <header className="relative p-6 pb-4">
        <div className="flex items-start gap-4">
          {/* Avatar with enhanced styling */}
          <div className="relative flex-shrink-0">
            <Avatar className="w-12 h-12 ring-2 ring-white/[0.08] dark:ring-white/[0.06]">
              {item.user.avatar_url ? (
                <AvatarImage
                  src={item.user.avatar_url}
                  alt={item.user.name}
                  className="object-cover"
                />
              ) : (
                <AvatarFallback className="text-sm font-semibold bg-gradient-to-br from-accent/20 to-accent/10 text-accent">
                  {item.user.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()}
                </AvatarFallback>
              )}
            </Avatar>
          </div>

          {/* User info and metadata */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <h3 className="font-semibold text-base text-foreground truncate flex-shrink min-w-0">
                  {item.user.name}
                </h3>
                <span className="text-sm text-muted-foreground/80 truncate flex-shrink min-w-0">
                  @{item.user.username}
                </span>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                <time className="text-xs text-muted-foreground/60 font-medium whitespace-nowrap">
                  {formatCompactTimestamp(item.timestamp)}
                </time>

                {/* More menu with enhanced positioning */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      onClick={(e): void => {
                        e.stopPropagation();
                      }}
                      className={cn(
                        'p-2 rounded-full transition-all duration-200',
                        'text-muted-foreground/60 hover:text-foreground',
                        'hover:bg-white/[0.08] dark:hover:bg-white/[0.06]',
                        'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
                      )}
                      aria-label="Chain options"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    sideOffset={8}
                    align="end"
                    className={cn(
                      'z-[100] min-w-[140px] rounded-2xl border backdrop-blur-xl',
                      'bg-white/[0.08] dark:bg-white/[0.06] border-white/[0.12]',
                      'shadow-[0_8px_32px_-4px_rgba(0,0,0,0.2)]',
                    )}
                  >
                    {item.author_id === currentUserId ? (
                      <DropdownMenuItem
                        onSelect={(): void => onDelete?.(item.id)}
                        className={cn(
                          'flex cursor-pointer select-none items-center',
                          'rounded-xl px-3 py-2.5 text-sm font-medium',
                          'text-destructive hover:text-destructive',
                          'focus:bg-destructive/10 dark:focus:bg-destructive/20',
                          'transition-colors duration-150',
                        )}
                      >
                        Delete
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        onSelect={(): void => {
                          // TODO: Implement report functionality
                          console.log('Report chain:', item.id);
                        }}
                        className={cn(
                          'flex cursor-pointer select-none items-center',
                          'rounded-xl px-3 py-2.5 text-sm font-medium',
                          'text-destructive hover:text-destructive',
                          'focus:bg-destructive/10 dark:focus:bg-destructive/20',
                          'transition-colors duration-150',
                        )}
                      >
                        Report
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Content Section */}
      <section className="px-6 pb-4">
        {/* Media carousel with enhanced styling - now above text */}
        {media && media.length > 0 && (
          <div className="mb-4 -mx-2 overflow-hidden rounded-2xl min-w-0">
            <ChainCarousel media={media} />
          </div>
        )}

        <div className="prose prose-sm dark:prose-invert max-w-none break-words overflow-hidden">
          <div className="text-sm leading-relaxed text-foreground/90">
            <ChainContentParser
              content={item.content}
              mentions={item.meta?.references ?? []}
            />
          </div>
        </div>

        {/* Link preview with modern design - remains below text */}
        {item.link_preview && (!media || media.length === 0) && (
          <a
            href={item.link_preview.url}
            target="_blank"
            rel="noreferrer"
            className={cn(
              'block mt-4 rounded-2xl overflow-hidden',
              'border border-white/[0.08] dark:border-white/[0.06]',
              'bg-white/[0.02] backdrop-blur-sm',
              'hover:bg-white/[0.04] dark:hover:bg-white/[0.03]',
              'hover:border-white/[0.12] dark:hover:border-white/[0.08]',
              'transition-all duration-200 group',
            )}
          >
            {item.link_preview.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.link_preview.image}
                alt=""
                className="w-full h-48 object-cover group-hover:scale-[1.02] transition-transform duration-300"
              />
            )}
            <div className="p-4 space-y-2 min-w-0">
              <h4 className="font-semibold text-sm leading-snug line-clamp-2 text-foreground group-hover:text-accent transition-colors break-words">
                {item.link_preview.title}
              </h4>
              {item.link_preview.description && (
                <p className="text-sm text-muted-foreground/80 line-clamp-2 leading-relaxed break-words">
                  {item.link_preview.description}
                </p>
              )}
              <span className="text-xs text-muted-foreground/60 font-medium truncate block">
                {item.link_preview.site ??
                  new URL(item.link_preview.url).hostname}
              </span>
            </div>
          </a>
        )}
      </section>

      {/* Action Bar with enhanced design */}
      <footer className="px-6 py-4 border-t border-white/[0.06] dark:border-white/[0.04]">
        <div className="flex items-center justify-between min-w-0">
          {/* Primary actions */}
          <div className="flex items-center gap-1 sm:gap-2 md:gap-4 min-w-0 flex-1">
            <button
              type="button"
              onClick={handleToggleLike}
              className={cn(
                'flex items-center gap-1 px-1.5 sm:px-2 md:px-3 py-1.5 rounded-full transition-all duration-200 min-w-0',
                'hover:bg-accent/10 dark:hover:bg-accent/10',
                isLiked
                  ? 'text-accent bg-accent/10'
                  : 'text-muted-foreground hover:text-accent',
              )}
            >
              <ThumbsUp
                className={cn(
                  'w-3.5 sm:w-4 h-3.5 sm:h-4 flex-shrink-0',
                  isLiked && 'fill-current',
                )}
              />
              <span className="text-xs font-medium min-w-0 truncate">
                {item.stats.likes + delta.like}
              </span>
            </button>

            <button
              type="button"
              onClick={handleToggleDislike}
              className={cn(
                'flex items-center gap-1 px-1.5 sm:px-2 md:px-3 py-1.5 rounded-full transition-all duration-200 min-w-0',
                'hover:bg-destructive/10 dark:hover:bg-destructive/10',
                isDisliked
                  ? 'text-destructive bg-destructive/10'
                  : 'text-muted-foreground hover:text-destructive',
              )}
            >
              <ThumbsDown
                className={cn(
                  'w-3.5 sm:w-4 h-3.5 sm:h-4 flex-shrink-0',
                  isDisliked && 'fill-current',
                )}
              />
              <span className="text-xs font-medium min-w-0 truncate">
                {item.stats.dislikes + delta.dislike}
              </span>
            </button>

            <button
              type="button"
              onClick={handleToggleRechain}
              className={cn(
                'flex items-center gap-1 px-1.5 sm:px-2 md:px-3 py-1.5 rounded-full transition-all duration-200 min-w-0',
                'hover:bg-green-500/10 dark:hover:bg-green-500/10',
                isRechained
                  ? 'text-green-500 bg-green-500/10'
                  : 'text-muted-foreground hover:text-green-500',
              )}
            >
              <Repeat
                className={cn(
                  'w-3.5 sm:w-4 h-3.5 sm:h-4 flex-shrink-0',
                  isRechained && 'fill-current',
                )}
              />
              <span className="text-xs font-medium min-w-0 truncate">
                {item.stats.shares + delta.rechain}
              </span>
            </button>

            <button
              type="button"
              onClick={handleStartReply}
              className={cn(
                'flex items-center gap-1 px-1.5 sm:px-2 md:px-3 py-1.5 rounded-full transition-all duration-200 min-w-0',
                'text-muted-foreground hover:text-accent',
                'hover:bg-accent/10 dark:hover:bg-accent/10',
              )}
            >
              <Reply className="w-3.5 sm:w-4 h-3.5 sm:h-4 flex-shrink-0" />
              <span className="text-xs font-medium min-w-0 truncate">
                {item.stats.replies}
              </span>
            </button>
          </div>

          {/* Secondary actions */}
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 ml-2">
            {onOpenThread && (
              <button
                type="button"
                onClick={(e): void => {
                  e.stopPropagation();
                  onOpenThread();
                }}
                className={cn(
                  'text-xs font-medium text-accent hover:text-accent/80',
                  'underline underline-offset-2 transition-colors duration-150',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 rounded-sm',
                  'whitespace-nowrap px-1',
                )}
              >
                <span className="hidden md:inline">View Thread</span>
                <span className="md:hidden">Thread</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleShare}
              className={cn(
                'flex items-center gap-1 px-1.5 sm:px-2 py-1.5 rounded-full transition-all duration-200 min-w-0',
                'text-muted-foreground hover:text-accent',
                'hover:bg-accent/10 dark:hover:bg-accent/10',
              )}
            >
              <Share2 className="w-3.5 sm:w-4 h-3.5 sm:h-4 flex-shrink-0" />
              <span className="text-xs font-medium min-w-0 truncate">
                {item.stats.shares}
              </span>
            </button>
          </div>
        </div>
      </footer>

      {/* Reply form with enhanced styling */}
      {isReplying && (
        <section className="px-6 pb-6 border-t border-white/[0.06] dark:border-white/[0.04]">
          <div className="pt-4 space-y-4">
            <Textarea
              value={interactions.replyContent}
              onChange={(e): void =>
                interactions.setReplyContent(e.target.value)
              }
              placeholder={`Reply to ${item.user.name}...`}
              className={cn(
                'w-full text-sm min-h-[80px] resize-none',
                'rounded-2xl border-white/[0.08] dark:border-white/[0.06]',
                'bg-white/[0.02] backdrop-blur-sm',
                'focus:border-accent/50 focus:ring-accent/20',
                'placeholder:text-muted-foreground/60',
              )}
              maxLength={CHARACTER_LIMIT}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground/70 font-medium">
                {CHARACTER_LIMIT - interactions.replyContent.length} characters
                remaining
              </span>
              <div className="flex gap-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={interactions.cancelReply}
                  className={cn(
                    'h-9 px-4 text-sm font-medium rounded-full',
                    'border-white/[0.08] dark:border-white/[0.06]',
                    'hover:bg-white/[0.08] dark:hover:bg-white/[0.06]',
                  )}
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
                  className={cn(
                    'h-9 px-4 text-sm font-medium rounded-full',
                    'bg-accent hover:bg-accent/90',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                  )}
                >
                  {interactions.isPosting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Reply'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}
    </article>
  );
}
