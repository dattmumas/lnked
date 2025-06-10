// Universal Comments Hook - React interface for polymorphic comment system
// Provides complete comment functionality for any entity type

import { useState, useEffect, useCallback, useRef } from 'react';
import { commentsV2Service } from '@/lib/services/comments-v2';
import {
  CommentEntityType,
  CommentWithAuthor,
  CommentThread,
  UseCommentsReturn,
  ReactionType,
} from '@/types/comments-v2';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useUser } from '@/hooks/useUser';

interface UseCommentsV2Props {
  entityType: CommentEntityType;
  entityId: string;
  initialSort?: 'newest' | 'oldest';
  pageSize?: number;
  enableRealtime?: boolean;
}

export function useCommentsV2({
  entityType,
  entityId,
  initialSort = 'newest',
  pageSize = 20,
  enableRealtime = true,
}: UseCommentsV2Props): UseCommentsReturn {
  const [comments, setComments] = useState<CommentThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Track loaded replies for each comment
  const [loadedReplies, setLoadedReplies] = useState<Record<string, boolean>>({});
  
  // Pagination state
  const offsetRef = useRef(0);
  const subscriptionRef = useRef<RealtimeChannel | null>(null);

  const { user, loading: userLoading } = useUser();

  // Transform API comments to UI threads
  const transformToThreads = useCallback(
    (apiComments: CommentWithAuthor[]): CommentThread[] => {
      return apiComments.map(comment => ({
        comment,
        replies: [],
        hasMoreReplies: comment.reply_count > 0,
        repliesLoading: false,
      }));
    },
    []
  );

  // Load initial comments
  const loadComments = useCallback(
    async (reset = false) => {
      try {
        setLoading(true);
        setError(null);

        const offset = reset ? 0 : offsetRef.current;
        
        const apiComments = await commentsV2Service.getComments(
          entityType,
          entityId,
          offset / pageSize + 1,
          pageSize
        );

        const newThreads = transformToThreads(apiComments);

        if (reset) {
          setComments(newThreads);
          offsetRef.current = apiComments.length;
        } else {
          setComments(prev => [...prev, ...newThreads]);
          offsetRef.current += apiComments.length;
        }

        setHasMore(apiComments.length === pageSize);

      } catch (err) {
        console.error('Error loading comments:', err);
        setError(err instanceof Error ? err.message : 'Failed to load comments');
      } finally {
        setLoading(false);
      }
    },
    [entityType, entityId, pageSize, transformToThreads]
  );

  // Load replies for a specific comment
  const loadReplies = useCallback(async (commentId: string) => {
    try {
      setComments(prev =>
        prev.map(thread =>
          thread.comment.id === commentId
            ? { ...thread, repliesLoading: true }
            : thread
        )
      );

      const replies = await commentsV2Service.getCommentReplies(
        commentId,
        1,
        10
      );

      setComments(prev =>
        prev.map(thread =>
          thread.comment.id === commentId
            ? {
                ...thread,
                replies,
                hasMoreReplies: replies.length === 10,
                repliesLoading: false,
              }
            : thread
        )
      );

      setLoadedReplies(prev => ({ ...prev, [commentId]: true }));

    } catch (err) {
      console.error('Error loading replies:', err);
      
      // Reset loading state on error
      setComments(prev =>
        prev.map(thread =>
          thread.comment.id === commentId
            ? { ...thread, repliesLoading: false }
            : thread
        )
      );
    }
  }, []);

  // Add a new comment
  const addComment = useCallback(
    async (content: string, parentId?: string) => {
      if (submitting || userLoading) return;

      // Ensure user is authenticated
      if (!user?.id) {
        const authError = new Error('You must be logged in to comment.');
        setError(authError.message);
        throw authError;
      }

      try {
        setSubmitting(true);
        setError(null);

        await commentsV2Service.addComment(
          entityType,
          entityId,
          user.id,
          content,
          parentId
        );

        if (!parentId) {
          await loadComments(true);
        } else {
          await loadReplies(parentId);
          setComments(prev =>
            prev.map(thread =>
              thread.comment.id === parentId
                ? {
                    ...thread,
                    comment: {
                      ...thread.comment,
                      reply_count: thread.comment.reply_count + 1,
                    },
                  }
                : thread
            )
          );
        }

      } catch (err) {
        console.error('Error adding comment:', err);
        setError(err instanceof Error ? err.message : 'Failed to add comment');
        throw err; // Re-throw so UI can handle
      } finally {
        setSubmitting(false);
      }
    },
    [entityType, entityId, submitting, loadComments, loadReplies, user, userLoading]
  );

  // Toggle reaction on a comment
  const toggleReaction = useCallback(
    async (commentId: string, reactionType: ReactionType) => {
      try {
        if (userLoading) return;

        if (!user?.id) {
          const authError = new Error('You must be logged in to react to comments.');
          setError(authError.message);
          throw authError;
        }

        const result = await commentsV2Service.toggleReaction(
          commentId,
          user.id,
          reactionType
        );

        setComments(prev =>
          prev.map(thread => {
            if (thread.comment.id === commentId) {
              return {
                ...thread,
                comment: {
                  ...thread.comment,
                  reactions: result.reaction_counts,
                },
              };
            }

            const updatedReplies = thread.replies.map(reply =>
              reply.id === commentId
                ? { ...reply, reactions: result.reaction_counts }
                : reply
            );

            return thread.replies.some(reply => reply.id === commentId)
              ? { ...thread, replies: updatedReplies }
              : thread;
          })
        );

      } catch (err) {
        console.error('Error toggling reaction:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to toggle reaction'
        );
      }
    },
    [user, userLoading]
  );

  // Load more comments (pagination)
  const loadMoreComments = useCallback(async () => {
    if (loading || !hasMore) return;
    await loadComments(false);
  }, [loading, hasMore, loadComments]);

  // Real-time subscription
  useEffect(() => {
    if (!enableRealtime) return;

    // Real-time subscriptions are not implemented in the provided service stub
    // but this is where you would set them up.

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [entityType, entityId, enableRealtime]);

  // Initial load
  useEffect(() => {
    loadComments(true);
  }, [loadComments]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, []);

  return {
    comments,
    loading,
    error,
    addComment,
    toggleReaction,
    loadMoreComments,
    loadReplies,
    hasMore
  };
} 