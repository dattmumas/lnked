'use client';

import React, { useState } from 'react';
import { CommentThread, ReactionType } from '@/types/comments-v2';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CommentActions } from './CommentActions';
import { formatDistanceToNow } from 'date-fns';
import { ChevronDown } from 'lucide-react';

interface CommentRepliesProps {
  thread: CommentThread;
  onLoadReplies: (commentId: string) => void;
  onReply: (parentId: string, content: string) => void;
  onReaction: (commentId: string, reactionType: ReactionType) => void;
  className?: string;
}

export const CommentReplies: React.FC<CommentRepliesProps> = ({
  thread,
  onLoadReplies,
  onReply,
  onReaction,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { comment, replies, hasMoreReplies, repliesLoading } = thread;

  const handleToggleReplies = () => {
    if (!isExpanded && replies.length === 0) {
      onLoadReplies(comment.id);
    }
    setIsExpanded(!isExpanded);
  };

  const handleLoadMoreReplies = () => {
    onLoadReplies(comment.id);
  };

  if (comment.reply_count === 0) {
    return null;
  }

  return (
    <div className={`ml-8 ${className}`}>
      {/* View Replies Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleToggleReplies}
        disabled={repliesLoading}
        className="text-accent hover:text-accent/80 p-0 h-auto font-normal"
      >
        <ChevronDown
          className={`h-3 w-3 mr-1 transition-transform ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
        {repliesLoading
          ? 'Loading replies...'
          : isExpanded
            ? 'Hide replies'
            : `View ${comment.reply_count} ${comment.reply_count === 1 ? 'reply' : 'replies'}`}
      </Button>

      {/* Replies List */}
      {isExpanded && (
        <div className="mt-3 space-y-3">
          {replies.map((reply) => (
            <ReplyItem key={reply.id} reply={reply} onReaction={onReaction} />
          ))}

          {hasMoreReplies && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLoadMoreReplies}
              disabled={repliesLoading}
              className="text-accent hover:text-accent/80 text-xs"
            >
              {repliesLoading ? 'Loading...' : 'Load more replies'}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

interface ReplyItemProps {
  reply: any; // CommentWithUser type
  onReaction: (commentId: string, reactionType: ReactionType) => void;
}

const ReplyItem: React.FC<ReplyItemProps> = ({ reply, onReaction }) => {
  const formattedTime = formatDistanceToNow(new Date(reply.created_at), {
    addSuffix: true,
  });

  const handleReaction = (reactionType: ReactionType) => {
    onReaction(reply.id, reactionType);
  };

  return (
    <div className="flex gap-3">
      {/* Avatar */}
      <Avatar className="h-6 w-6 flex-shrink-0">
        <AvatarImage src={reply.user.avatar_url || ''} />
        <AvatarFallback className="text-xs">
          {reply.user.full_name?.[0] || reply.user.username?.[0] || 'U'}
        </AvatarFallback>
      </Avatar>

      {/* Reply Content */}
      <div className="flex-1 min-w-0">
        {/* Reply Header */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-foreground">
            {reply.user.full_name || reply.user.username}
          </span>
          <span className="text-xs text-muted-foreground">{formattedTime}</span>
        </div>

        {/* Reply Content */}
        <div className="text-xs text-foreground leading-relaxed mb-2">
          {reply.content}
        </div>

        {/* Reply Actions */}
        <CommentActions
          comment={reply}
          onReply={() => {}} // Replies to replies are handled at parent level
          onReaction={handleReaction}
          showReplyButton={false} // No nested reply buttons in flat design
        />
      </div>
    </div>
  );
};
