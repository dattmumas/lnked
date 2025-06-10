'use client';

import React, { useState } from 'react';
import {
  CommentThread,
  ReactionType,
  CommentWithAuthor,
} from '@/types/comments-v2';
import { CommentForm } from './CommentForm';
import { CommentActions } from './CommentActions';
import { CommentReplies } from './CommentReplies';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';

interface CommentItemProps {
  thread: CommentThread;
  onReply: (parentId: string, content: string) => void;
  onReaction: (commentId: string, reactionType: ReactionType) => void;
  onLoadReplies: (commentId: string) => void;
  className?: string;
}

export const CommentItem: React.FC<CommentItemProps> = ({
  thread,
  onReply,
  onReaction,
  onLoadReplies,
  className = '',
}) => {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const { comment } = thread;
  const user = comment.user || comment.author;

  const handleReplySubmit = (content: string) => {
    onReply(comment.id, content);
    setShowReplyForm(false);
  };

  const handleReplyClick = () => {
    setShowReplyForm(!showReplyForm);
  };

  const handleReaction = (reactionType: ReactionType) => {
    onReaction(comment.id, reactionType);
  };

  const formattedTime = formatDistanceToNow(new Date(comment.created_at), {
    addSuffix: true,
  });

  return (
    <div className={`py-4 border-b border-border ${className}`}>
      <div className="flex gap-3">
        {/* Avatar */}
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={user.avatar_url || ''} />
          <AvatarFallback className="text-xs">
            {user.full_name?.[0] || user.username?.[0] || 'U'}
          </AvatarFallback>
        </Avatar>

        {/* Comment Content */}
        <div className="flex-1 min-w-0">
          {/* Comment Header */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-semibold text-foreground">
              {user.full_name || user.username}
            </span>
            <span className="text-xs text-muted-foreground">
              {formattedTime}
            </span>
            {comment.is_pinned && (
              <span className="text-xs bg-accent/20 text-accent px-2 py-1 rounded">
                Pinned
              </span>
            )}
          </div>

          {/* Comment Content */}
          <div className="text-sm text-foreground leading-relaxed mb-3">
            {comment.content}
          </div>

          {/* Comment Actions */}
          <CommentActions
            comment={comment}
            onReply={handleReplyClick}
            onReaction={handleReaction}
            showReplyButton
          />

          {/* Reply Form */}
          {showReplyForm && (
            <div className="mt-4">
              <CommentForm
                onSubmit={handleReplySubmit}
                placeholder={`Reply to ${user.username}...`}
                buttonText="Reply"
                className="pl-0"
              />
            </div>
          )}

          {/* Replies Section */}
          {comment.reply_count > 0 && (
            <div className="mt-4">
              <CommentReplies
                thread={thread}
                onLoadReplies={onLoadReplies}
                onReply={onReply}
                onReaction={onReaction}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
