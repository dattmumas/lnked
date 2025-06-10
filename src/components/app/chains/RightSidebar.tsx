// This file is extracted from HomePageClient.tsx for reuse on the video page
'use client';
import { useState, useEffect, useCallback } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
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
import Link from 'next/link';

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
  };
  showReplyForm?: boolean;
}

function useChainInteractions(userId: string) {
  const [likedChains, setLikedChains] = useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const supabase = createSupabaseBrowserClient();

  const toggleLike = async (chainId: string) => {
    const isCurrentlyLiked = likedChains.has(chainId);
    try {
      if (isCurrentlyLiked) {
        setLikedChains((prev) => {
          const newSet = new Set(prev);
          newSet.delete(chainId);
          return newSet;
        });
        await supabase
          .from('chain_reactions' as any)
          .delete()
          .match({ user_id: userId, chain_id: chainId, reaction: 'like' });
      } else {
        setLikedChains((prev) => new Set(prev).add(chainId));
        await supabase.from('chain_reactions' as any).upsert({
          user_id: userId,
          chain_id: chainId,
          reaction: 'like',
        });
      }
    } catch (error) {
      console.error('Error toggling chain like:', error);
    }
  };

  const startReply = (chainId: string) => {
    setReplyingTo(chainId);
    setReplyContent('');
  };
  const cancelReply = () => {
    setReplyingTo(null);
    setReplyContent('');
  };
  const submitReply = async (parentChainId: string) => {
    if (!replyContent.trim() || isPosting) return;
    setIsPosting(true);
    try {
      await supabase.from('chains' as any).insert({
        author_id: userId,
        content: replyContent.trim(),
        parent_chain_id: parentChainId,
        status: 'active',
      });
      setReplyContent('');
      setReplyingTo(null);
    } catch (error) {
      console.error('Error posting reply:', error);
    } finally {
      setIsPosting(false);
    }
  };
  const shareChain = (chainId: string, content: string) => {
    if (navigator.share) {
      navigator.share({
        title: `${content.slice(0, 50)}...`,
        url: `${window.location.origin}/chains/${chainId}`,
      });
    } else {
      navigator.clipboard.writeText(
        `${window.location.origin}/chains/${chainId}`,
      );
    }
  };
  return {
    likedChains,
    replyingTo,
    replyContent,
    setReplyContent,
    isPosting,
    toggleLike,
    startReply,
    cancelReply,
    submitReply,
    shareChain,
  };
}

function useChains() {
  const [chains, setChains] = useState<ChainItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createSupabaseBrowserClient();

  const fetchChains = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('chains' as any)
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
        .limit(20);
      if (error) {
        setError(error.message);
        return;
      }
      const transformedChains: ChainItem[] = (data || []).map((chain: any) => {
        const user = chain.users || {};
        return {
          id: chain.id,
          user: {
            name: user.full_name || user.username || 'Anonymous',
            username: user.username || 'unknown',
            avatar_url: user.avatar_url || undefined,
          },
          content: chain.content,
          timestamp: new Date(chain.created_at).toLocaleString(),
          type: 'post',
          stats: { likes: 0, replies: 0, shares: 0 },
          userInteraction: { liked: false },
        };
      });
      setChains(transformedChains);
      setError(null);
    } catch (err) {
      setError('Failed to load chains');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchChains();
    // Real-time subscription could be added here
  }, [fetchChains]);

  return { chains, loading, error, refetch: fetchChains };
}

function ChainPostForm({
  user,
  profile,
  onPostSuccess,
}: {
  user: User;
  profile: UserProfile | null;
  onPostSuccess?: () => void;
}) {
  const [content, setContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const supabase = createSupabaseBrowserClient();
  const maxLength = 280;
  const remainingChars = maxLength - content.length;
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isPosting) return;
    setIsPosting(true);
    try {
      const { data, error } = await supabase
        .from('chains' as any)
        .insert({
          author_id: user.id,
          content: content.trim(),
          status: 'active',
          created_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) return;
      setContent('');
      if (onPostSuccess) onPostSuccess();
    } catch (error) {
    } finally {
      setIsPosting(false);
    }
  };
  const getUserInitials = () => {
    if (profile?.full_name) {
      return profile.full_name
        .split(' ')
        .map((name) => name[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return (
      profile?.username?.slice(0, 2).toUpperCase() ||
      user.email?.slice(0, 2).toUpperCase() ||
      'U'
    );
  };
  return (
    <div className="border-t border-gray-200 dark:border-gray-700 p-5">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-3">
          <Avatar className="w-9 h-9 flex-shrink-0">
            {profile?.avatar_url ? (
              <AvatarImage
                src={profile.avatar_url}
                alt={profile.full_name || profile.username || 'User'}
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
              onChange={(e) => setContent(e.target.value)}
              placeholder="What's happening?"
              className="min-h-[90px] resize-none border-0 p-0 text-sm placeholder:text-gray-500 focus-visible:ring-0 focus-visible:ring-offset-0"
              maxLength={maxLength}
              disabled={isPosting}
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="p-2 text-gray-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors"
                  title="Add emoji"
                  disabled={isPosting}
                >
                  <Smile className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  className="p-2 text-gray-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors"
                  title="Add image"
                  disabled={isPosting}
                >
                  <Image className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    'text-xs font-medium',
                    remainingChars < 20 ? 'text-red-500' : 'text-gray-500',
                  )}
                >
                  {remainingChars}
                </span>
                <Button
                  type="submit"
                  size="sm"
                  disabled={!content.trim() || isPosting || remainingChars < 0}
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
}) {
  const { chains, loading, error, refetch } = useChains();
  const chainInteractions = useChainInteractions(user.id);
  return (
    <div className="fixed right-0 top-16 w-112 h-[calc(100vh-4rem)] bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 hidden lg:block z-20">
      <div className="h-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-xl">Chains</h2>
            <div
              className="w-2 h-2 bg-green-500 rounded-full animate-pulse"
              title="Live activity"
            />
          </div>
        </div>
        {/* Chains Feed - Scrollable */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-500 text-sm mb-2">Error loading chains</p>
              <Button size="sm" variant="outline" onClick={refetch}>
                Retry
              </Button>
            </div>
          ) : chains.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">No chains yet.</p>
              <p className="text-xs mt-1">Be the first to post!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {chains.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex gap-3">
                    <Avatar className="w-9 h-9 flex-shrink-0">
                      {item.user.avatar_url ? (
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
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-sm">
                          {item.user.name}
                        </span>
                        <span className="text-gray-500 text-xs">
                          @{item.user.username}
                        </span>
                        <span className="text-gray-400 text-xs">•</span>
                        <span className="text-gray-500 text-xs">
                          {item.timestamp}
                        </span>
                      </div>
                      <p className="text-sm text-gray-900 dark:text-gray-100 line-clamp-4 mb-3 leading-relaxed">
                        {item.content}
                      </p>
                      {/* Interactive Buttons */}
                      <div className="flex items-center gap-6">
                        {/* Like Button */}
                        <button
                          onClick={() => chainInteractions.toggleLike(item.id)}
                          className={cn(
                            'flex items-center gap-1 text-xs transition-colors',
                            chainInteractions.likedChains.has(item.id)
                              ? 'text-red-500'
                              : 'text-gray-500 hover:text-red-500',
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
                          onClick={() => chainInteractions.startReply(item.id)}
                          className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-500 transition-colors"
                        >
                          <Reply className="w-4 h-4" />
                          <span>{item.stats.replies}</span>
                        </button>
                        {/* Share Button */}
                        <button
                          onClick={() =>
                            chainInteractions.shareChain(item.id, item.content)
                          }
                          className="flex items-center gap-1 text-xs text-gray-500 hover:text-green-500 transition-colors"
                        >
                          <Share2 className="w-4 h-4" />
                          <span>{item.stats.shares}</span>
                        </button>
                        {/* More Options */}
                        <button className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>
                      {/* Reply Form */}
                      {chainInteractions.replyingTo === item.id && (
                        <div className="mt-4 space-y-3">
                          <Textarea
                            value={chainInteractions.replyContent}
                            onChange={(e) =>
                              chainInteractions.setReplyContent(e.target.value)
                            }
                            placeholder={`Reply to ${item.user.name}...`}
                            className="w-full text-sm min-h-[70px] resize-none"
                            maxLength={280}
                          />
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">
                              {280 - chainInteractions.replyContent.length}{' '}
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
                                onClick={() =>
                                  chainInteractions.submitReply(item.id)
                                }
                                disabled={
                                  !chainInteractions.replyContent.trim() ||
                                  chainInteractions.isPosting
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
