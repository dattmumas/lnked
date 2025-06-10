'use client';

import { useState, useEffect, useCallback } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

interface PostInteractions {
  isLiked: boolean;
  isDisliked: boolean;
  isBookmarked: boolean;
  likeCount: number;
  dislikeCount: number;
  commentCount: number;
  viewCount?: number;
}

interface UsePostInteractionsProps {
  postId: string;
  userId?: string;
  initialInteractions?: Partial<PostInteractions>;
}

interface UsePostInteractionsReturn {
  interactions: PostInteractions;
  toggleLike: () => Promise<void>;
  toggleDislike: () => Promise<void>;
  toggleBookmark: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export function usePostInteractions({
  postId,
  userId,
  initialInteractions = {},
}: UsePostInteractionsProps): UsePostInteractionsReturn {
  const [interactions, setInteractions] = useState<PostInteractions>({
    isLiked: false,
    isDisliked: false,
    isBookmarked: false,
    likeCount: 0,
    dislikeCount: 0,
    commentCount: 0,
    viewCount: 0,
    ...initialInteractions,
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  
  const supabase = createSupabaseBrowserClient();

  // Initialize user interactions
  useEffect(() => {
    if (!userId || !postId || initialized) return;

    const initializeInteractions = async () => {
      try {
        setIsLoading(true);
        
        // Fetch user's reactions for this post
        const { data: userReactions } = await supabase
          .from('post_reactions')
          .select('type')
          .eq('user_id', userId)
          .eq('post_id', postId);

        // Fetch user's bookmark status
        const { data: userBookmark } = await supabase
          .from('post_bookmarks')
          .select('id')
          .eq('user_id', userId)
          .eq('post_id', postId)
          .single();

        // Fetch reaction counts
        const { data: reactionCounts } = await supabase
          .from('post_reactions')
          .select('type')
          .eq('post_id', postId);

        // Fetch comment count
        const { data: commentCount } = await supabase
          .from('comments')
          .select('id', { count: 'exact' })
          .eq('post_id', postId);

        // Process the data
        const userReaction = userReactions?.[0]?.type || null;
        const likesCount = reactionCounts?.filter(r => r.type === 'like').length || 0;
        const dislikesCount = reactionCounts?.filter(r => r.type === 'dislike').length || 0;

        setInteractions(prev => ({
          ...prev,
          isLiked: userReaction === 'like',
          isDisliked: userReaction === 'dislike',
          isBookmarked: Boolean(userBookmark),
          likeCount: likesCount,
          dislikeCount: dislikesCount,
          commentCount: commentCount?.length || 0,
        }));

        setInitialized(true);
      } catch (err) {
        console.error('Error initializing post interactions:', err);
        setError('Failed to load post interactions');
      } finally {
        setIsLoading(false);
      }
    };

    initializeInteractions();
  }, [userId, postId, initialized, supabase]);

  const toggleLike = useCallback(async () => {
    if (!userId || isLoading) return;

    const wasLiked = interactions.isLiked;
    const wasDisliked = interactions.isDisliked;

    // Optimistic update
    setInteractions(prev => ({
      ...prev,
      isLiked: !wasLiked,
      isDisliked: false, // Remove dislike if present
      likeCount: wasLiked ? prev.likeCount - 1 : prev.likeCount + 1,
      dislikeCount: wasDisliked ? prev.dislikeCount - 1 : prev.dislikeCount,
    }));

    try {
      setIsLoading(true);
      setError(null);

      // Remove existing reactions first
      await supabase
        .from('post_reactions')
        .delete()
        .eq('user_id', userId)
        .eq('post_id', postId);

      // Add new reaction if not removing a like
      if (!wasLiked) {
        await supabase
          .from('post_reactions')
          .insert({
            user_id: userId,
            post_id: postId,
            type: 'like',
          });
      }
    } catch (err) {
      console.error('Error toggling like:', err);
      setError('Failed to update like');
      
      // Revert optimistic update
      setInteractions(prev => ({
        ...prev,
        isLiked: wasLiked,
        isDisliked: wasDisliked,
        likeCount: wasLiked ? prev.likeCount + 1 : prev.likeCount - 1,
        dislikeCount: wasDisliked ? prev.dislikeCount + 1 : prev.dislikeCount,
      }));
    } finally {
      setIsLoading(false);
    }
  }, [userId, postId, interactions.isLiked, interactions.isDisliked, isLoading, supabase]);

  const toggleDislike = useCallback(async () => {
    if (!userId || isLoading) return;

    const wasLiked = interactions.isLiked;
    const wasDisliked = interactions.isDisliked;

    // Optimistic update
    setInteractions(prev => ({
      ...prev,
      isLiked: false, // Remove like if present
      isDisliked: !wasDisliked,
      likeCount: wasLiked ? prev.likeCount - 1 : prev.likeCount,
      dislikeCount: wasDisliked ? prev.dislikeCount - 1 : prev.dislikeCount + 1,
    }));

    try {
      setIsLoading(true);
      setError(null);

      // Remove existing reactions first
      await supabase
        .from('post_reactions')
        .delete()
        .eq('user_id', userId)
        .eq('post_id', postId);

      // Add new reaction if not removing a dislike
      if (!wasDisliked) {
        await supabase
          .from('post_reactions')
          .insert({
            user_id: userId,
            post_id: postId,
            type: 'dislike',
          });
      }
    } catch (err) {
      console.error('Error toggling dislike:', err);
      setError('Failed to update dislike');
      
      // Revert optimistic update
      setInteractions(prev => ({
        ...prev,
        isLiked: wasLiked,
        isDisliked: wasDisliked,
        likeCount: wasLiked ? prev.likeCount + 1 : prev.likeCount,
        dislikeCount: wasDisliked ? prev.dislikeCount + 1 : prev.dislikeCount - 1,
      }));
    } finally {
      setIsLoading(false);
    }
  }, [userId, postId, interactions.isLiked, interactions.isDisliked, isLoading, supabase]);

  const toggleBookmark = useCallback(async () => {
    if (!userId || isLoading) return;

    const wasBookmarked = interactions.isBookmarked;

    // Optimistic update
    setInteractions(prev => ({
      ...prev,
      isBookmarked: !wasBookmarked,
    }));

    try {
      setIsLoading(true);
      setError(null);

      if (wasBookmarked) {
        // Remove bookmark
        await supabase
          .from('post_bookmarks')
          .delete()
          .eq('user_id', userId)
          .eq('post_id', postId);
      } else {
        // Add bookmark
        await supabase
          .from('post_bookmarks')
          .insert({
            user_id: userId,
            post_id: postId,
          });
      }
    } catch (err) {
      console.error('Error toggling bookmark:', err);
      setError('Failed to update bookmark');
      
      // Revert optimistic update
      setInteractions(prev => ({
        ...prev,
        isBookmarked: wasBookmarked,
      }));
    } finally {
      setIsLoading(false);
    }
  }, [userId, postId, interactions.isBookmarked, isLoading, supabase]);

  return {
    interactions,
    toggleLike,
    toggleDislike,
    toggleBookmark,
    isLoading,
    error,
  };
} 