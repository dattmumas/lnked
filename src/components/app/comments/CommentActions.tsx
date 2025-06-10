'use client';

import React from 'react';
import { CommentWithUser, CommentReactionType } from '@/types/comments-v2';
import { Button } from '@/components/ui/button';
import { Heart, MessageCircle, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface CommentActionsProps {
  comment: CommentWithUser;
  onReply: () => void;
  onReaction: (reactionType: CommentReactionType) => void;
  showReplyButton?: boolean;
  className?: string;
}

export const CommentActions: React.FC<CommentActionsProps> = ({
  comment,
  onReply,
  onReaction,
  showReplyButton = true,
  className = '',
}) => {
  // Get like count from reactions
  const likeReaction = comment.reactions?.find((r) => r.type === 'like');
  const likeCount = likeReaction?.count || 0;

  const heartReaction = comment.reactions?.find((r) => r.type === 'heart');
  const heartCount = heartReaction?.count || 0;

  const handleLike = () => {
    onReaction('like');
  };

  const handleHeart = () => {
    onReaction('heart');
  };

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      {/* Like Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleLike}
        className="h-6 px-2 text-muted-foreground hover:text-foreground hover:bg-muted/50"
      >
        <Heart className="h-3 w-3 mr-1" />
        {likeCount > 0 && <span className="text-xs">{likeCount}</span>}
      </Button>

      {/* Heart Button */}
      {heartCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleHeart}
          className="h-6 px-2 text-muted-foreground hover:text-foreground hover:bg-muted/50"
        >
          <Heart className="h-3 w-3 mr-1 fill-red-500 text-red-500" />
          <span className="text-xs">{heartCount}</span>
        </Button>
      )}

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

      {/* More Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/50"
          >
            <MoreHorizontal className="h-3 w-3" />
            <span className="sr-only">More options</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-40">
          <DropdownMenuItem>
            <span className="text-sm">Report</span>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <span className="text-sm">Copy link</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
