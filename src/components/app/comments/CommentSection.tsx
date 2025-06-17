'use client';

import React from 'react';

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
}) => {
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

  const handleNewComment = async (content: string) => {
    try {
      await addComment(content);
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  const handleReply = async (parentId: string, content: string) => {
    try {
      await addComment(content, parentId);
    } catch (error) {
      console.error('Failed to add reply:', error);
    }
  };

  const handleReaction = async (
    commentId: string,
    reactionType: ReactionType,
  ) => {
    try {
      await toggleReaction(commentId, reactionType);
    } catch (error) {
      console.error('Failed to toggle reaction:', error);
    }
  };

  // Calculate total comment count from loaded comments
  const totalCommentsCount = comments.reduce((count, thread) => {
    return count + 1 + thread.comment.reply_count;
  }, 0);

  const displayCount = Math.max(totalCommentsCount, initialCommentsCount);

  if (error) {
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
        onSubmit={handleNewComment}
        placeholder={`Add a comment to this ${entityType}...`}
        loading={loading}
      />

      <CommentList
        comments={comments}
        loading={loading}
        onReply={handleReply}
        onReaction={handleReaction}
        onLoadMore={loadMoreComments}
        onLoadReplies={loadReplies}
        hasMoreComments={hasMore}
      />
    </div>
  );
};
