'use client';

import React, { useCallback } from 'react';

import { Separator } from '@/components/ui/separator';
import { useCommentsV2 } from '@/hooks/comments/useCommentsV2';
import { CommentEntityType, ReactionType } from '@/types/comments-v2';

import { CommentForm } from './CommentForm';
import { CommentList } from './CommentList';
import { CommentStats } from './CommentStats';

interface CommentSectionProps {
  entityType: CommentEntityType;
  entityId: string;
  initialCommentsCount?: number;
  className?: string;
}

export const CommentSection: React.FC<CommentSectionProps> = ({
  entityType,
  entityId,
  initialCommentsCount = 0,
  className = '',
}): React.ReactElement => {
  const {
    comments,
    loading,
    error,
    addComment,
    toggleReaction,
    loadMoreComments,
    loadReplies,
    hasMore,
  } = useCommentsV2({
    entityType,
    entityId,
    enableRealtime: true,
  });

  const handleNewComment = useCallback(
    async (content: string): Promise<void> => {
      try {
        await addComment(content);
      } catch (error: unknown) {
        console.error('Failed to add comment:', error);
      }
    },
    [addComment],
  );

  const handleReply = useCallback(
    async (parentId: string, content: string): Promise<void> => {
      try {
        await addComment(content, parentId);
      } catch (error: unknown) {
        console.error('Failed to add reply:', error);
      }
    },
    [addComment],
  );

  const handleReaction = useCallback(
    async (commentId: string, reactionType: ReactionType): Promise<void> => {
      try {
        await toggleReaction(commentId, reactionType);
      } catch (error: unknown) {
        console.error('Failed to toggle reaction:', error);
      }
    },
    [toggleReaction],
  );

  // Wrapper functions for event handlers to fix no-misused-promises
  const handleSubmitComment = useCallback(
    (content: string): void => {
      void handleNewComment(content);
    },
    [handleNewComment],
  );

  const handleReplyWrapper = useCallback(
    (parentId: string, content: string): void => {
      void handleReply(parentId, content);
    },
    [handleReply],
  );

  const handleReactionWrapper = useCallback(
    (commentId: string, reactionType: ReactionType): void => {
      void handleReaction(commentId, reactionType);
    },
    [handleReaction],
  );

  const handleLoadMoreWrapper = useCallback((): void => {
    void loadMoreComments();
  }, [loadMoreComments]);

  const handleLoadRepliesWrapper = useCallback(
    (commentId: string): void => {
      void loadReplies(commentId);
    },
    [loadReplies],
  );

  // Calculate total comment count from loaded comments
  const totalCommentsCount = comments.reduce((count, thread) => {
    return count + 1 + thread.comment.reply_count;
  }, 0);

  const displayCount = Math.max(totalCommentsCount, initialCommentsCount);

  if (error !== undefined && error !== null && error.length > 0) {
    return (
      <div
        className={`bg-background p-6 rounded-lg border border-destructive/20 ${className}`}
      >
        <p className="text-sm text-destructive">
          Failed to load comments. Please try again later.
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-background space-y-6 ${className}`}>
      <CommentStats count={displayCount} loading={loading} />

      <Separator className="border-border" />

      <CommentForm
        onSubmit={handleSubmitComment}
        placeholder={`Add a comment to this ${entityType}...`}
        loading={loading}
      />

      <CommentList
        comments={comments}
        loading={loading}
        onReply={handleReplyWrapper}
        onReaction={handleReactionWrapper}
        onLoadMore={handleLoadMoreWrapper}
        onLoadReplies={handleLoadRepliesWrapper}
        hasMoreComments={hasMore}
      />
    </div>
  );
};
