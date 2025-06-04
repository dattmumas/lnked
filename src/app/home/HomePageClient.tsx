'use client';

import { User } from '@supabase/supabase-js';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  PlusCircle,
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  Play,
  TrendingUp,
  Send,
  Smile,
  Image,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  Reply,
  ExternalLink,
  MoreHorizontal,
  Video,
  Edit,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface UserProfile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
}

interface HomePageClientProps {
  user: User;
  profile: UserProfile | null;
}

// Database interfaces for real data
interface DatabaseChain {
  id: string;
  user_id: string;
  content: string;
  type: 'post' | 'reply' | 'share';
  created_at: string;
  parent_id?: string;
  metadata?: any;
  // User data from join
  users?: {
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface DatabasePost {
  id: string;
  title: string;
  content?: string;
  user_id: string;
  collective_id?: string;
  created_at: string;
  published_at?: string;
  type: string;
  thumbnail_url?: string;
  metadata?: any;
  // User data from join
  users?: {
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
  // Collective data from join
  collectives?: {
    name: string;
    slug: string;
  };
  // Interaction counts
  _count?: {
    reactions: number;
    comments: number;
    views: number;
  };
}

// Enhanced interfaces for interactions
interface FeedItem {
  id: string;
  type: 'post' | 'video';
  title: string;
  content?: string;
  author: {
    name: string;
    username: string;
    avatar_url?: string;
  };
  published_at: string;
  stats: {
    likes: number;
    dislikes: number;
    comments: number;
    views?: number;
  };
  userInteraction?: {
    liked: boolean;
    disliked: boolean;
    bookmarked: boolean;
  };
  thumbnail_url?: string;
  duration?: string;
  collective?: {
    name: string;
    slug: string;
  };
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

// Navigation items moved to GlobalSidebar component

// Custom hook for post interactions
function usePostInteractions(userId: string) {
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [dislikedPosts, setDislikedPosts] = useState<Set<string>>(new Set());
  const [bookmarkedPosts, setBookmarkedPosts] = useState<Set<string>>(
    new Set(),
  );
  const [initialized, setInitialized] = useState(false);
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();

  // Initialize user's interaction state from database
  useEffect(() => {
    const initializeUserInteractions = async () => {
      if (!userId || initialized) return;

      try {
        // Get user's reactions
        const { data: userReactions } = await supabase
          .from('post_reactions')
          .select('post_id, type')
          .eq('user_id', userId);

        // Get user's bookmarks
        const { data: userBookmarks } = await supabase
          .from('post_bookmarks')
          .select('post_id')
          .eq('user_id', userId);

        if (userReactions) {
          const liked = new Set(
            userReactions
              .filter((r) => r.type === 'like')
              .map((r) => r.post_id),
          );
          const disliked = new Set(
            userReactions
              .filter((r) => r.type === 'dislike')
              .map((r) => r.post_id),
          );
          setLikedPosts(liked);
          setDislikedPosts(disliked);
        }

        if (userBookmarks) {
          const bookmarked = new Set(userBookmarks.map((b) => b.post_id));
          setBookmarkedPosts(bookmarked);
        }

        setInitialized(true);
      } catch (error) {
        console.error('Error initializing user interactions:', error);
      }
    };

    initializeUserInteractions();
  }, [userId, initialized, supabase]);

  const toggleLike = async (postId: string) => {
    const isCurrentlyLiked = likedPosts.has(postId);
    const isCurrentlyDisliked = dislikedPosts.has(postId);

    try {
      if (isCurrentlyDisliked) {
        setDislikedPosts((prev) => {
          const newSet = new Set(prev);
          newSet.delete(postId);
          return newSet;
        });
        await supabase.from('post_reactions').delete().match({
          user_id: userId,
          post_id: postId,
          type: 'dislike',
        });
      }

      if (isCurrentlyLiked) {
        setLikedPosts((prev) => {
          const newSet = new Set(prev);
          newSet.delete(postId);
          return newSet;
        });
        await supabase.from('post_reactions').delete().match({
          user_id: userId,
          post_id: postId,
          type: 'like',
        });
      } else {
        setLikedPosts((prev) => new Set(prev).add(postId));
        await supabase.from('post_reactions').upsert({
          user_id: userId,
          post_id: postId,
          type: 'like',
        });
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const toggleDislike = async (postId: string) => {
    const isCurrentlyLiked = likedPosts.has(postId);
    const isCurrentlyDisliked = dislikedPosts.has(postId);

    try {
      if (isCurrentlyLiked) {
        setLikedPosts((prev) => {
          const newSet = new Set(prev);
          newSet.delete(postId);
          return newSet;
        });
        await supabase.from('post_reactions').delete().match({
          user_id: userId,
          post_id: postId,
          type: 'like',
        });
      }

      if (isCurrentlyDisliked) {
        setDislikedPosts((prev) => {
          const newSet = new Set(prev);
          newSet.delete(postId);
          return newSet;
        });
        await supabase.from('post_reactions').delete().match({
          user_id: userId,
          post_id: postId,
          type: 'dislike',
        });
      } else {
        setDislikedPosts((prev) => new Set(prev).add(postId));
        await supabase.from('post_reactions').upsert({
          user_id: userId,
          post_id: postId,
          type: 'dislike',
        });
      }
    } catch (error) {
      console.error('Error toggling dislike:', error);
    }
  };

  const toggleBookmark = async (postId: string) => {
    const isCurrentlyBookmarked = bookmarkedPosts.has(postId);

    try {
      if (isCurrentlyBookmarked) {
        setBookmarkedPosts((prev) => {
          const newSet = new Set(prev);
          newSet.delete(postId);
          return newSet;
        });
        await supabase.from('post_bookmarks').delete().match({
          user_id: userId,
          post_id: postId,
        });
      } else {
        setBookmarkedPosts((prev) => new Set(prev).add(postId));
        await supabase.from('post_bookmarks').insert({
          user_id: userId,
          post_id: postId,
        });
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    }
  };

  const sharePost = (postId: string, title: string) => {
    if (navigator.share) {
      navigator.share({
        title,
        url: `${window.location.origin}/posts/${postId}`,
      });
    } else {
      navigator.clipboard.writeText(
        `${window.location.origin}/posts/${postId}`,
      );
    }
  };

  const navigateToComments = (postId: string) => {
    router.push(`/posts/${postId}#comments`);
  };

  return {
    likedPosts,
    dislikedPosts,
    bookmarkedPosts,
    initialized,
    toggleLike,
    toggleDislike,
    toggleBookmark,
    sharePost,
    navigateToComments,
  };
}

// Custom hook for chain interactions
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
          .match({
            user_id: userId,
            chain_id: chainId,
            reaction: 'like',
          });
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
        title: content.slice(0, 50) + '...',
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

// Custom hook for chains data
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
        console.error('Error fetching chains:', error);
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
          timestamp: formatTimestamp(chain.created_at),
          type: 'post', // chains are always posts for now
          stats: {
            likes: 0, // TODO: Get actual like counts
            replies: 0, // TODO: Get actual reply counts
            shares: 0, // TODO: Get actual share counts
          },
          userInteraction: {
            liked: false, // TODO: Check if user liked this chain
          },
        };
      });

      setChains(transformedChains);
      setError(null);
    } catch (err) {
      console.error('Error in fetchChains:', err);
      setError('Failed to load chains');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // Real-time subscription for live updates
  useEffect(() => {
    fetchChains();

    // Set up real-time subscription
    const channel = supabase
      .channel('chains')
      .on(
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table: 'chains',
        },
        () => {
          // Refetch chains when there are changes
          fetchChains();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchChains, supabase]);

  return { chains, loading, error, refetch: fetchChains };
}

// Custom hook for feed data
function useFeed() {
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createSupabaseBrowserClient();

  const fetchFeed = useCallback(async () => {
    try {
      // Get current user ID for checking user interactions
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const userId = user?.id;

      const { data, error } = await supabase
        .from('posts')
        .select(
          `
          id,
          title,
          content,
          created_at,
          published_at,
          status,
          post_type,
          thumbnail_url,
          metadata,
          users!author_id (
            username,
            full_name,
            avatar_url
          ),
          collectives!collective_id (
            name,
            slug
          )
        `,
        )
        .eq('status', 'active')
        .not('published_at', 'is', null)
        .order('published_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching feed:', error);
        setError(error.message);
        return;
      }

      // Get reaction counts and user interactions for all posts
      const postIds = (data || []).map((post) => post.id);

      // Get reaction counts
      const { data: reactionCounts } = await supabase
        .from('post_reactions')
        .select('post_id, type')
        .in('post_id', postIds);

      // Get user interactions if user is logged in
      let userInteractions: { reactions: any[]; bookmarks: any[] } = {
        reactions: [],
        bookmarks: [],
      };
      if (userId) {
        const { data: userReactions } = await supabase
          .from('post_reactions')
          .select('post_id, type')
          .eq('user_id', userId)
          .in('post_id', postIds);

        const { data: userBookmarks } = await supabase
          .from('post_bookmarks')
          .select('post_id')
          .eq('user_id', userId)
          .in('post_id', postIds);

        userInteractions = {
          reactions: userReactions || [],
          bookmarks: userBookmarks || [],
        };
      }

      const transformedFeed: FeedItem[] = (data || []).map((post: any) => {
        const user = post.users || {};
        const collective = post.collectives || {};

        // Calculate like and dislike counts
        const postReactions = (reactionCounts || []).filter(
          (r: any) => r.post_id === post.id,
        );
        const likeCount = postReactions.filter(
          (r: any) => r.type === 'like',
        ).length;
        const dislikeCount = postReactions.filter(
          (r: any) => r.type === 'dislike',
        ).length;

        // Check user interactions
        const userReactionsList = userInteractions.reactions || [];
        const userBookmarksList = userInteractions.bookmarks || [];

        const userLiked = userReactionsList.some(
          (r: any) => r.post_id === post.id && r.type === 'like',
        );
        const userDisliked = userReactionsList.some(
          (r: any) => r.post_id === post.id && r.type === 'dislike',
        );
        const userBookmarked = userBookmarksList.some(
          (b: any) => b.post_id === post.id,
        );

        // Determine if this is a video post based on post_type or metadata
        const isVideo =
          post.post_type === 'video' ||
          post.metadata?.type === 'video' ||
          post.metadata?.duration;

        return {
          id: post.id,
          type: isVideo ? 'video' : 'post',
          title: post.title,
          content: post.content || undefined,
          author: {
            name: user.full_name || user.username || 'Anonymous',
            username: user.username || 'unknown',
            avatar_url: user.avatar_url || undefined,
          },
          published_at: formatTimestamp(post.published_at || post.created_at),
          stats: {
            likes: likeCount,
            dislikes: dislikeCount,
            comments: 0, // TODO: Add actual comment counts when available
            views: undefined, // TODO: Add actual view counts when available
          },
          userInteraction: {
            liked: userLiked,
            disliked: userDisliked,
            bookmarked: userBookmarked,
          },
          thumbnail_url: post.thumbnail_url || undefined,
          duration: post.metadata?.duration || undefined,
          collective: collective.name
            ? {
                name: collective.name,
                slug: collective.slug,
              }
            : undefined,
        };
      });

      setFeedItems(transformedFeed);
      setError(null);
    } catch (err) {
      console.error('Error in fetchFeed:', err);
      setError('Failed to load feed');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  return { feedItems, loading, error, refetch: fetchFeed };
}

// Utility function to format timestamps
function formatTimestamp(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return `${diffInSeconds}s`;
  } else if (diffInSeconds < 3600) {
    return `${Math.floor(diffInSeconds / 60)}m`;
  } else if (diffInSeconds < 86400) {
    return `${Math.floor(diffInSeconds / 3600)}h`;
  } else if (diffInSeconds < 604800) {
    return `${Math.floor(diffInSeconds / 86400)}d`;
  } else {
    return date.toLocaleDateString();
  }
}

// Utility function to extract plain text from Lexical JSON content
function extractTextFromLexical(content: string | null): string {
  if (!content) return '';

  try {
    // If it looks like JSON, try to parse it
    if (content.startsWith('{') && content.includes('"root"')) {
      const parsed = JSON.parse(content);

      // Recursively extract text from Lexical nodes
      function extractText(node: any): string {
        if (!node) return '';

        // If it's a text node, return the text
        if (node.text) {
          return node.text;
        }

        // If it has children, recursively extract text from them
        if (node.children && Array.isArray(node.children)) {
          return node.children.map(extractText).join(' ');
        }

        return '';
      }

      return extractText(parsed.root).trim();
    }

    // If it's not JSON, return as is
    return content;
  } catch (error) {
    // If parsing fails, return the original content
    return content;
  }
}

// LeftSidebar function removed - now handled by GlobalSidebar in layout

function CenterFeed({ user }: { user: User }) {
  const [filter, setFilter] = useState<'all' | 'posts' | 'videos'>('all');
  const { feedItems, loading, error, refetch } = useFeed();
  const postInteractions = usePostInteractions(user.id);

  // Refetch feed when user interactions change to update counts
  useEffect(() => {
    if (postInteractions.initialized) {
      // Small delay to allow database operations to complete
      const timeoutId = setTimeout(() => {
        refetch();
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [
    postInteractions.likedPosts,
    postInteractions.dislikedPosts,
    postInteractions.bookmarkedPosts,
    refetch,
    postInteractions.initialized,
  ]);

  const filteredItems = feedItems.filter((item) => {
    if (filter === 'all') return true;
    return filter === 'posts' ? item.type === 'post' : item.type === 'video';
  });

  if (loading || !postInteractions.initialized) {
    return (
      <div className="flex-1 max-w-4xl mx-auto px-6 py-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-500">
            {loading ? 'Loading feed...' : 'Loading interactions...'}
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 max-w-4xl mx-auto px-6 py-6">
        <div className="text-center py-12">
          <p className="text-red-500 mb-4">Error loading feed: {error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-4xl mx-auto px-6 py-6">
      {/* Filter Toggles */}
      <div className="flex gap-2 mb-6 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg w-fit">
        {(['all', 'posts', 'videos'] as const).map((filterType) => (
          <button
            key={filterType}
            onClick={() => setFilter(filterType)}
            className={cn(
              'px-4 py-2 rounded-md text-sm font-medium transition-all duration-200',
              filter === filterType
                ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white',
            )}
          >
            {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
          </button>
        ))}
      </div>

      {/* Feed Items */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">
            No {filter === 'all' ? 'content' : filter} found.
          </p>
          <p className="text-sm text-gray-400 mt-2">
            Check back later for new posts!
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {filteredItems.map((item) => (
            <Card
              key={item.id}
              className="overflow-hidden hover:shadow-lg transition-shadow duration-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
            >
              {item.type === 'video' && item.thumbnail_url && (
                <div className="relative aspect-video bg-gray-100 dark:bg-gray-800">
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Play className="w-16 h-16 text-white opacity-80" />
                  </div>
                  {item.duration && (
                    <div className="absolute bottom-3 right-3 bg-black/70 text-white text-sm px-2 py-1 rounded">
                      {item.duration}
                    </div>
                  )}
                </div>
              )}

              <CardHeader className="pb-4 px-6 pt-6">
                <div className="flex items-center gap-4 mb-4">
                  <Avatar className="w-10 h-10">
                    {item.author.avatar_url ? (
                      <AvatarImage
                        src={item.author.avatar_url}
                        alt={item.author.name}
                      />
                    ) : (
                      <AvatarFallback>
                        {item.author.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-base">
                        {item.author.name}
                      </span>
                      <span className="text-gray-500 text-sm">
                        @{item.author.username}
                      </span>
                      <span className="text-gray-400 text-sm">•</span>
                      <span className="text-gray-500 text-sm">
                        {item.published_at}
                      </span>
                      {item.collective && (
                        <>
                          <span className="text-gray-400 text-sm">in</span>
                          <Link
                            href={`/collectives/${item.collective.slug}`}
                            className="text-blue-500 text-sm hover:underline"
                          >
                            {item.collective.name}
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {item.type}
                  </Badge>
                </div>

                <CardTitle className="text-2xl leading-tight mb-3">
                  <Link
                    href={`/posts/${item.id}`}
                    className="hover:text-blue-600 transition-colors"
                  >
                    {item.title}
                  </Link>
                </CardTitle>
                {item.content && (
                  <CardDescription className="text-base line-clamp-3 text-gray-600 dark:text-gray-300">
                    {extractTextFromLexical(item.content)}
                  </CardDescription>
                )}
              </CardHeader>

              <CardContent className="pt-0 px-6 pb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    {/* Like/Dislike Buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => postInteractions.toggleLike(item.id)}
                        className={cn(
                          'flex items-center gap-3 px-4 py-2 rounded-full text-sm transition-all duration-200',
                          postInteractions.likedPosts.has(item.id)
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                            : 'text-gray-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20',
                        )}
                      >
                        <ThumbsUp
                          className={cn(
                            'w-5 h-5',
                            postInteractions.likedPosts.has(item.id) &&
                              'fill-current',
                          )}
                        />
                        <span className="font-medium">{item.stats.likes}</span>
                      </button>
                      <button
                        onClick={() => postInteractions.toggleDislike(item.id)}
                        className={cn(
                          'flex items-center gap-3 px-4 py-2 rounded-full text-sm transition-all duration-200',
                          postInteractions.dislikedPosts.has(item.id)
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                            : 'text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20',
                        )}
                      >
                        <ThumbsDown
                          className={cn(
                            'w-5 h-5',
                            postInteractions.dislikedPosts.has(item.id) &&
                              'fill-current',
                          )}
                        />
                        <span className="font-medium">
                          {item.stats.dislikes || 0}
                        </span>
                      </button>
                    </div>

                    {/* Comments Button */}
                    <button
                      onClick={() =>
                        postInteractions.navigateToComments(item.id)
                      }
                      className="flex items-center gap-3 text-gray-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-4 py-2 rounded-full transition-all duration-200"
                    >
                      <MessageCircle className="w-5 h-5" />
                      <span className="text-sm font-medium">
                        {item.stats.comments}
                      </span>
                    </button>

                    {/* Views */}
                    {item.stats.views && (
                      <div className="flex items-center gap-3 text-gray-500 px-4 py-2">
                        <TrendingUp className="w-5 h-5" />
                        <span className="text-sm font-medium">
                          {item.stats.views}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Bookmark Button */}
                    <button
                      onClick={() => postInteractions.toggleBookmark(item.id)}
                      className={cn(
                        'p-3 rounded-full transition-all duration-200',
                        postInteractions.bookmarkedPosts.has(item.id)
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                          : 'text-gray-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20',
                      )}
                    >
                      <Bookmark
                        className={cn(
                          'w-5 h-5',
                          postInteractions.bookmarkedPosts.has(item.id) &&
                            'fill-current',
                        )}
                      />
                    </button>

                    {/* Share Button */}
                    <button
                      onClick={() =>
                        postInteractions.sharePost(item.id, item.title)
                      }
                      className="p-3 text-gray-500 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-full transition-all duration-200"
                    >
                      <Share2 className="w-5 h-5" />
                    </button>

                    {/* External Link */}
                    <Link
                      href={`/posts/${item.id}`}
                      className="p-3 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-full transition-all duration-200"
                    >
                      <ExternalLink className="w-5 h-5" />
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
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

  const maxLength = 280; // Twitter-like character limit
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

      if (error) {
        console.error('Error posting chain:', error);
        return;
      }

      // Reset form on success
      setContent('');
      console.info('Chain posted successfully:', data);

      // Call success callback to refresh chains
      if (onPostSuccess) {
        onPostSuccess();
      }

      // TODO: Show success toast notification
    } catch (error) {
      console.error('Error posting chain:', error);
      // TODO: Show error toast notification
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

function RightSidebar({
  user,
  profile,
}: {
  user: User;
  profile: UserProfile | null;
}) {
  const { chains, loading, error, refetch } = useChains();
  const chainInteractions = useChainInteractions(user.id);

  return (
    <div className="w-112 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 hidden lg:block">
      <div className="sticky top-16 h-[calc(100vh-4rem)] overflow-hidden flex flex-col">
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

// Enhanced Mobile Floating Action Button Component
function FloatingCreateButton() {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="fixed bottom-6 right-6 lg:hidden z-50">
      {/* Overlay to close on outside click */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm"
          onClick={() => setIsExpanded(false)}
        />
      )}

      {/* Action Buttons (shown when expanded) */}
      <div
        className={cn(
          'absolute bottom-16 right-0 space-y-3 transition-all duration-300 ease-out',
          isExpanded
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-4 pointer-events-none',
        )}
      >
        {/* Video Upload Button */}
        <Link
          href="/videos/upload"
          className="flex items-center gap-3 bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-full shadow-lg transition-all duration-200 hover:scale-105"
          onClick={() => setIsExpanded(false)}
        >
          <Video className="w-5 h-5" />
          <span className="text-sm font-medium">Upload Video</span>
        </Link>

        {/* New Post Button */}
        <Link
          href="/posts/new"
          className="flex items-center gap-3 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-full shadow-lg transition-all duration-200 hover:scale-105"
          onClick={() => setIsExpanded(false)}
        >
          <Edit className="w-5 h-5" />
          <span className="text-sm font-medium">New Post</span>
        </Link>
      </div>

      {/* Main FAB Button */}
      <Button
        size="lg"
        onClick={toggleExpanded}
        className={cn(
          'relative rounded-full shadow-lg transition-all duration-300 w-14 h-14',
          isExpanded
            ? 'bg-gray-600 hover:bg-gray-700 rotate-45'
            : 'bg-blue-600 hover:bg-blue-700',
        )}
      >
        <PlusCircle className="w-6 h-6" />
      </Button>
    </div>
  );
}

export default function HomePageClient({ user, profile }: HomePageClientProps) {
  const [loading, setLoading] = useState(true);
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    // Initialize any required data
    const initialize = async () => {
      try {
        // Note: Main data loading is now handled by custom hooks
        console.info('Initializing homepage for user:', user.id);
        if (profile?.full_name) {
          console.info('User profile loaded:', profile.full_name);
        }
        await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate loading
      } catch (error) {
        console.error('Error initializing homepage:', error);
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, [user.id, profile?.full_name, supabase]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-500">Loading your homepage...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Three-Zone Layout */}
      <div className="flex">
        {/* Center Feed - Main Content Stream */}
        <main className="flex-1 lg:mr-112 transition-all duration-300">
          <CenterFeed user={user} />
        </main>

        {/* Right Sidebar - Chains Activity Feed */}
        <RightSidebar user={user} profile={profile} />
      </div>

      {/* Enhanced Floating Action Button for Mobile */}
      <FloatingCreateButton />
    </div>
  );
}
