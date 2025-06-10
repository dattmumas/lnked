'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import ReactionButtons from '@/components/ui/ReactionButtons';
import {
  toggleReactionState,
  type ReactionState,
} from '@/lib/utils/reactionHelpers';

interface PostReactionButtonsProps {
  id: string;
  initialLikeCount: number;
  initialDislikeCount: number;
  initialUserReaction: 'like' | 'dislike' | null;
  disabled?: boolean;
}

export default function PostReactionButtons({
  id,
  initialLikeCount,
  initialDislikeCount,
  initialUserReaction,
  disabled = false,
}: PostReactionButtonsProps) {
  // Create reaction handler for posts using the existing API pattern
  const handlePostReaction = async (
    postId: string,
    type: 'like' | 'dislike',
  ) => {
    try {
      const response = await fetch(`/api/posts/${postId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          likeCount: data.likeCount,
          dislikeCount: data.dislikeCount,
          userReaction: data.userReaction,
        };
      } else {
        return {
          success: false,
          message: 'Failed to update post reaction',
        };
      }
    } catch (error) {
      console.error('Error updating post reaction:', error);
      return {
        success: false,
        message: 'Network error occurred',
      };
    }
  };

  return (
    <ReactionButtons
      id={id}
      initialLikeCount={initialLikeCount}
      initialDislikeCount={initialDislikeCount}
      initialUserReaction={initialUserReaction}
      reactionHandler={handlePostReaction}
      disabled={disabled}
      size="md"
      variant="default"
      showCounts
      className=""
    />
  );
}
