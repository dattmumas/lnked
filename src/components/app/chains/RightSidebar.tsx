// This file is extracted from HomePageClient.tsx for reuse on the video page
'use client';
import {
  Loader2,
  Heart,
  Reply,
  Share2,
  MoreHorizontal,
  Smile,
  Image,
  Send,
} from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';

// internal ui components
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { cn } from '@/lib/utils';
import { formatTimestamp } from '@/utils/home/formatTimestamp';

// Constants
const CHAINS_LIMIT = 20;
const MAX_CONTENT_PREVIEW_LENGTH = 50;
const MAX_INITIALS_LENGTH = 2;
const CHARACTER_LIMIT = 280;
const WARNING_THRESHOLD = 20;

// Types
interface UserProfile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
}
interface User {
  id: string;
  email?: string;
}
interface ChainItem {
  id: string;
  author_id?: string;
  user: {
    name: string;
    username: string;
    avatar_url?: string;
  };
  content: string;
  timestamp: string;
  type: 'post' | 'reply' | 'share';
  stats: {
    likes: number;
    replies: number;
    shares: number;
  };
  userInteraction?: {
    liked: boolean;
    bookmarked: boolean;
  };
  showReplyForm?: boolean;
}

// Subset of chains table returned by the sidebar query
type ChainDBRow = {
  id: string;
  author_id: string;
  content: string;
  created_at: string;
  users?: {
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
};

function useChainInteractions(userId: string): {
  likedChains: Set<string>;
  replyingTo: string | undefined;
  replyContent: string;
  setReplyContent: (content: string) => void;
  isPosting: boolean;
  toggleLike: (chainId: string) => void;
  startReply: (chainId: string) => void;
  cancelReply: () => void;
  submitReply: (parentChainId: string) => void;
  shareChain: (chainId: string, content: string) => void;
} {
  const [likedChains, setLikedChains] = useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<string | undefined>(undefined);
  const [replyContent, setReplyContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const supabase = createSupabaseBrowserClient();

  const toggleLike = useCallback(
    async (chainId: string): Promise<void> => {
      const isCurrentlyLiked = likedChains.has(chainId);
      try {
        if (isCurrentlyLiked) {
          setLikedChains((prev) => {
            const newSet = new Set(prev);
            newSet.delete(chainId);
            return newSet;
          });
          await supabase
            .from('chain_reactions')
            .delete()
            .match({ user_id: userId, chain_id: chainId, reaction: 'like' });
        } else {
          setLikedChains((prev) => new Set(prev).add(chainId));
          await supabase.from('chain_reactions').upsert({
            user_id: userId,
            chain_id: chainId,
            reaction: 'like',
          });
        }
      } catch (error: unknown) {
        console.error('Error toggling chain like:', error);
      }
    },
    [likedChains, supabase, userId],
  );

  const startReply = useCallback((chainId: string): void => {
    setReplyingTo(chainId);
    setReplyContent('');
  }, []);

  const cancelReply = useCallback((): void => {
    setReplyingTo(undefined);
    setReplyContent('');
  }, []);

  const submitReply = useCallback(
    async (parentChainId: string): Promise<void> => {
      if (replyContent.trim().length === 0 || isPosting) return;
      setIsPosting(true);
      try {
        await supabase.from('chains').insert({
          author_id: userId,
          content: replyContent.trim(),
          parent_chain_id: parentChainId,
          status: 'active',
        });
        setReplyContent('');
        setReplyingTo(undefined);
      } catch (error: unknown) {
        console.error('Error posting reply:', error);
      } finally {
        setIsPosting(false);
      }
    },
    [replyContent, isPosting, supabase, userId],
  );

  const shareChain = useCallback((chainId: string, content: string): void => {
    if (navigator.share !== undefined && navigator.share !== null) {
      void navigator.share({
        title: `${content.slice(0, MAX_CONTENT_PREVIEW_LENGTH)}...`,
        url: `${window.location.origin}/chains/${chainId}`,
      });
    } else {
      void navigator.clipboard.writeText(
        `${window.location.origin}/chains/${chainId}`,
      );
    }
  }, []);

  return {
    likedChains,
    replyingTo,
    replyContent,
    setReplyContent,
    isPosting,
    toggleLike: (chainId: string): void => {
      void toggleLike(chainId);
    },
    startReply,
    cancelReply,
    submitReply: (parentChainId: string): void => {
      void submitReply(parentChainId);
    },
    shareChain,
  };
}

function useChains(): {
  chains: ChainItem[];
  loading: boolean;
  error: string | undefined;
  refetch: () => void;
} {
  const [chains, setChains] = useState<ChainItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);
  const supabase = createSupabaseBrowserClient();

  const fetchChains = useCallback(async (): Promise<void> => {
    try {
      const { data, error } = await supabase
        .from('chains')
        .select(
          `
          id,
          author_id,
          content,
          status,
          created_at,
          users!author_id (
            username,
            full_name,
            avatar_url
          )
        `,
        )
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(CHAINS_LIMIT);
      if (error !== undefined && error !== null) {
        setError(error.message);
        return;
      }
      const transformedChains: ChainItem[] = (
        (data as ChainDBRow[] | null) ?? []
      ).map((chain) => ({
        id: chain.id,
        author_id: chain.author_id,
        user: {
          name: chain.users?.full_name || chain.users?.username || 'Unknown',
          username: chain.users?.username || 'unknown',
          avatar_url: chain.users?.avatar_url || '',
        },
        content: chain.content,
        timestamp: formatTimestamp(chain.created_at),
        type: 'post' as const,
        stats: {
          likes: 0,
          replies: 0,
          shares: 0,
        },
        userInteraction: {
          liked: false,
          bookmarked: false,
        },
      }));
      setChains(transformedChains);
      setError(undefined);
    } catch {
      setError('Failed to load chains');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const handleRefetch = useCallback((): void => {
    void fetchChains();
  }, [fetchChains]);

  useEffect((): void => {
    void fetchChains();
    // Real-time subscription could be added here
  }, [fetchChains]);

  return { chains, loading, error, refetch: handleRefetch };
}

function ChainPostForm({
  user,
  profile,
  onPostSuccess,
}: {
  user: User;
  profile: UserProfile | null;
  onPostSuccess?: () => void;
}): React.ReactElement {
  const [content, setContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const supabase = createSupabaseBrowserClient();
  const remainingChars = CHARACTER_LIMIT - content.length;

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
      e.preventDefault();
      if (content.trim().length === 0 || isPosting) return;
      setIsPosting(true);
      try {
        const { error } = await supabase
          .from('chains')
          .insert({
            author_id: user.id,
            content: content.trim(),
            status: 'active',
            created_at: new Date().toISOString(),
          })
          .select()
          .single();
        if (error !== undefined && error !== null) return;
        setContent('');
        if (onPostSuccess !== undefined && onPostSuccess !== null)
          onPostSuccess();
      } catch (error: unknown) {
        console.error('Error posting chain:', error);
      } finally {
        setIsPosting(false);
      }
    },
    [content, isPosting, supabase, user.id, onPostSuccess],
  );

  const handleFormSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>): void => {
      void handleSubmit(e);
    },
    [handleSubmit],
  );

  const handleContentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
      setContent(e.target.value);
    },
    [],
  );

  const getUserInitials = useCallback((): string => {
    if (
      profile?.full_name !== undefined &&
      profile?.full_name !== null &&
      profile.full_name.length > 0
    ) {
      return profile.full_name
        .split(' ')
        .map((name) => name[0])
        .join('')
        .toUpperCase()
        .slice(0, MAX_INITIALS_LENGTH);
    }
    const usernameInitials =
      profile?.username !== undefined &&
      profile?.username !== null &&
      profile.username.length > 0
        ? profile.username.slice(0, MAX_INITIALS_LENGTH).toUpperCase()
        : undefined;

    const emailInitials =
      user.email !== undefined && user.email !== null && user.email.length > 0
        ? user.email.slice(0, MAX_INITIALS_LENGTH).toUpperCase()
        : undefined;

    return usernameInitials ?? emailInitials ?? 'U';
  }, [profile, user.email]);

  return (
    <div className="border-t border-border p-4">
      <form onSubmit={handleFormSubmit} className="space-y-3">
        <div className="flex gap-3">
          <Avatar className="w-9 h-9 flex-shrink-0">
            {profile?.avatar_url !== undefined &&
            profile?.avatar_url !== null &&
            profile.avatar_url.length > 0 ? (
              <AvatarImage
                src={profile.avatar_url}
                alt={
                  profile.full_name !== undefined &&
                  profile.full_name !== null &&
                  profile.full_name.length > 0
                    ? profile.full_name
                    : profile.username !== undefined &&
                        profile.username !== null &&
                        profile.username.length > 0
                      ? profile.username
                      : 'User'
                }
              />
            ) : (
              <AvatarFallback className="text-xs">
                {getUserInitials()}
              </AvatarFallback>
            )}
          </Avatar>
          <div className="flex-1 space-y-3">
            <Textarea
              value={content}
              onChange={handleContentChange}
              placeholder="What's happening?"
              className="min-h-[90px] resize-none border-0 p-0 text-sm placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
              maxLength={CHARACTER_LIMIT}
              disabled={isPosting}
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="p-2 text-muted-foreground hover:text-accent hover:bg-accent/20 rounded-full transition-colors"
                  title="Add emoji"
                  disabled={isPosting}
                >
                  <Smile className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  className="p-2 text-muted-foreground hover:text-accent hover:bg-accent/20 rounded-full transition-colors"
                  title="Add image"
                  disabled={isPosting}
                >
                  {/* eslint-disable-next-line jsx-a11y/alt-text */}
                  <Image className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    'text-xs font-medium',
                    remainingChars < WARNING_THRESHOLD
                      ? 'text-destructive'
                      : 'text-muted-foreground',
                  )}
                >
                  {remainingChars}
                </span>
                <Button
                  type="submit"
                  size="sm"
                  disabled={
                    content.trim().length === 0 ||
                    isPosting ||
                    remainingChars < 0
                  }
                  className="px-5 py-2 h-auto text-sm font-medium"
                >
                  {isPosting ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Posting...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Send className="w-4 h-4" />
                      Post
                    </div>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

export function RightSidebar({
  user,
  profile,
}: {
  user: User;
  profile: UserProfile | null;
}): React.ReactElement {
  const { chains, loading, error, refetch } = useChains();
  const chainInteractions = useChainInteractions(user.id);

  const handleToggleLike = useCallback(
    (itemId: string) => (): void => {
      chainInteractions.toggleLike(itemId);
    },
    [chainInteractions],
  );

  const handleStartReply = useCallback(
    (itemId: string) => (): void => {
      chainInteractions.startReply(itemId);
    },
    [chainInteractions],
  );

  const handleShareChain = useCallback(
    (itemId: string, itemContent: string) => (): void => {
      chainInteractions.shareChain(itemId, itemContent);
    },
    [chainInteractions],
  );

  const handleReplyContentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
      chainInteractions.setReplyContent(e.target.value);
    },
    [chainInteractions],
  );

  const handleSubmitReply = useCallback(
    (itemId: string) => (): void => {
      chainInteractions.submitReply(itemId);
    },
    [chainInteractions],
  );

  const handleDeleteChain = useCallback(
    (itemId: string) => (): void => {
      void (async (): Promise<void> => {
        try {
          const supabase = createSupabaseBrowserClient();
          await supabase
            .from('chains')
            .update({ status: 'deleted' })
            .eq('id', itemId)
            .eq('author_id', user.id);
          refetch();
        } catch (error: unknown) {
          console.error('Error deleting chain:', error);
        }
      })();
    },
    [user.id, refetch],
  );

  return (
    <div className="fixed right-0 top-16 w-[28rem] h-[calc(100vh-4rem)] bg-background border-l border-border hidden lg:block z-20">
      <div className="h-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg text-foreground">Chains</h2>
            <div
              className="w-2 h-2 bg-green-500 rounded-full animate-pulse"
              title="Live activity"
            />
          </div>
        </div>
        {/* Chains Feed - Scrollable */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-accent" />
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-destructive text-sm mb-2">
                Error loading chains
              </p>
              <Button size="sm" variant="outline" onClick={refetch}>
                Retry
              </Button>
            </div>
          ) : chains.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No chains yet.</p>
              <p className="text-xs mt-1">Be the first to post!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {chains.map((item) => (
                <div
                  key={item.id}
                  className="px-3 py-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex gap-3">
                    <Avatar className="w-9 h-9 flex-shrink-0">
                      {item.user.avatar_url !== undefined &&
                      item.user.avatar_url !== null &&
                      item.user.avatar_url.length > 0 ? (
                        <AvatarImage
                          src={item.user.avatar_url}
                          alt={item.user.name}
                        />
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
                      {/* Interactive Buttons */}
                      <div className="flex items-center gap-5">
                        {/* Like Button */}
                        <button
                          onClick={handleToggleLike(item.id)}
                          className={cn(
                            'flex items-center gap-1.5 text-xs transition-colors',
                            chainInteractions.likedChains.has(item.id)
                              ? 'text-destructive'
                              : 'text-muted-foreground hover:text-destructive',
                          )}
                        >
                          <Heart
                            className={cn(
                              'w-4 h-4',
                              chainInteractions.likedChains.has(item.id) &&
                                'fill-current',
                            )}
                          />
                          <span>{item.stats.likes}</span>
                        </button>
                        {/* Reply Button */}
                        <button
                          onClick={handleStartReply(item.id)}
                          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-accent transition-colors"
                        >
                          <Reply className="w-4 h-4" />
                          <span>{item.stats.replies}</span>
                        </button>
                        {/* Share Button */}
                        <button
                          onClick={handleShareChain(item.id, item.content)}
                          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-accent transition-colors"
                        >
                          <Share2 className="w-4 h-4" />
                          <span>{item.stats.shares}</span>
                        </button>
                        {/* More / Delete menu */}
                        {item.author_id === user.id ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                className="ml-auto text-muted-foreground hover:text-accent transition-colors"
                                aria-label="Chain options"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              sideOffset={4}
                              align="center"
                              className="z-50 min-w-[120px] rounded-md border bg-background p-1 shadow-md"
                            >
                              <DropdownMenuItem
                                onSelect={handleDeleteChain(item.id)}
                                className="flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm text-destructive focus:bg-accent/10 dark:focus:bg-accent/20 outline-none"
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : (
                          <button
                            className="ml-auto text-muted-foreground hover:text-accent transition-colors"
                            aria-label="Chain options"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      {/* Reply Form */}
                      {chainInteractions.replyingTo === item.id && (
                        <div className="mt-4 space-y-3">
                          <Textarea
                            value={chainInteractions.replyContent}
                            onChange={handleReplyContentChange}
                            placeholder={`Reply to ${item.user.name}...`}
                            className="w-full text-sm min-h-[70px] resize-none"
                            maxLength={CHARACTER_LIMIT}
                          />
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                              {CHARACTER_LIMIT -
                                chainInteractions.replyContent.length}{' '}
                              characters remaining
                            </span>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={chainInteractions.cancelReply}
                                className="h-7 text-xs px-3"
                              >
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                onClick={handleSubmitReply(item.id)}
                                disabled={
                                  chainInteractions.replyContent.trim()
                                    .length === 0 || chainInteractions.isPosting
                                }
                                className="h-7 text-xs px-3"
                              >
                                {chainInteractions.isPosting ? (
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
              ))}
            </div>
          )}
        </div>
        {/* Chain Post Form - Fixed at bottom */}
        <ChainPostForm user={user} profile={profile} onPostSuccess={refetch} />
      </div>
    </div>
  );
}
