'use client';

import React from 'react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CommentThread, ReactionType } from '@/types/comments-v2';

import { CommentItem } from './CommentItem';

interface CommentListProps {
  comments: CommentThread[];
  loading: boolean;
  onReply: (parentId: string, content: string) => void;
  onReaction: (commentId: string, reactionType: ReactionType) => void;
  onLoadMore: () => void;
  onLoadReplies: (commentId: string) => void;
  hasMoreComments: boolean;
  className?: string;
}

export const CommentList: React.FC<CommentListProps> = ({
  comments,
  loading,
  onReply,
  onReaction,
  onLoadMore,
  onLoadReplies,
  hasMoreComments,
  className = '',
}) => {
  if (loading && comments.length === 0) {
    return (
      <div className={`space-y-4 ${className}`}>
        {Array.from({ length: 3 }).map((_, index) => (
          <CommentSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (comments.length === 0 && !loading) {
    return (
      <div className={`text-center py-8 text-muted-foreground ${className}`}>
        <p className="text-sm">No comments yet. Be the first to comment!</p>
      </div>
    );
  }

  return (
    <div className={`space-y-0 ${className}`}>
      {comments.map((thread) => (
        <CommentItem
          key={thread.comment.id}
          thread={thread}
          onReply={onReply}
          onReaction={onReaction}
          onLoadReplies={onLoadReplies}
        />
      ))}

      {hasMoreComments && (
        <div className="pt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onLoadMore}
            disabled={loading}
            className="text-accent hover:text-accent/80"
          >
            {loading ? 'Loading...' : 'Load more comments'}
          </Button>
        </div>
      )}
    </div>
  );
};

const CommentSkeleton: React.FC = () => (
  <div className="py-4 border-b border-border">
    <div className="flex gap-3">
      <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <div className="flex gap-4 pt-2">
          <Skeleton className="h-6 w-12" />
          <Skeleton className="h-6 w-12" />
        </div>
      </div>
    </div>
  </div>
);
