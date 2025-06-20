'use client';

import {
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  MoreHorizontal,
} from 'lucide-react';
import React, { useCallback } from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CommentWithAuthor, ReactionType } from '@/types/comments-v2';

interface CommentActionsProps {
  comment: CommentWithAuthor;
  onReply: () => void;
  onReaction: (reactionType: ReactionType) => void;
  showReplyButton?: boolean;
  className?: string;
}

export const CommentActions: React.FC<CommentActionsProps> = ({
  comment,
  onReply,
  onReaction,
  showReplyButton = true,
  className = '',
}): React.ReactElement => {
  const likeReaction = comment.reactions?.find((r) => r.type === 'like');
  const dislikeReaction = comment.reactions?.find((r) => r.type === 'dislike');
  const likeCount =
    likeReaction?.count !== undefined &&
    likeReaction.count !== null &&
    likeReaction.count > 0
      ? likeReaction.count
      : 0;
  const dislikeCount =
    dislikeReaction?.count !== undefined &&
    dislikeReaction.count !== null &&
    dislikeReaction.count > 0
      ? dislikeReaction.count
      : 0;

  const handleReaction = useCallback(
    (reactionType: ReactionType): void => {
      onReaction(reactionType);
    },
    [onReaction],
  );

  const handleLikeClick = useCallback((): void => {
    void handleReaction('like');
  }, [handleReaction]);

  const handleDislikeClick = useCallback((): void => {
    void handleReaction('dislike');
  }, [handleReaction]);

  return (
    <div className={`flex items-center gap-2 text-sm ${className}`}>
      {/* Like Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleLikeClick}
        className="h-6 px-2 text-muted-foreground hover:text-foreground hover:bg-muted/50"
      >
        <ThumbsUp className="h-3 w-3 mr-1" />
        {likeCount > 0 && <span className="text-xs">{likeCount}</span>}
      </Button>

      {/* Dislike Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleDislikeClick}
        className="h-6 px-2 text-muted-foreground hover:text-foreground hover:bg-muted/50"
      >
        <ThumbsDown className="h-3 w-3 mr-1" />
        {dislikeCount > 0 && <span className="text-xs">{dislikeCount}</span>}
      </Button>

      {/* Reply Button */}
      {showReplyButton && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onReply}
          className="h-6 px-2 text-muted-foreground hover:text-foreground hover:bg-muted/50"
        >
          <MessageCircle className="h-3 w-3 mr-1" />
          <span className="text-xs">Reply</span>
        </Button>
      )}

      {/* More Options */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 px-0 text-muted-foreground hover:text-foreground hover:bg-muted/50"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Report</DropdownMenuItem>
          <DropdownMenuItem>Copy link</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
