'use client';

import React, { useCallback } from 'react';

import ReactionButtons from '@/components/ui/ReactionButtons';

interface PostReactionResponse {
  success: boolean;
  likeCount?: number;
  dislikeCount?: number;
  userReaction?: 'like' | 'dislike' | null;
  message?: string;
}

interface PostReactionButtonsProps {
  id: string;
  initialLikeCount: number;
  initialDislikeCount: number;
  initialUserReaction: 'like' | 'dislike' | null;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showCounts?: boolean;
  className?: string;
}

export default function PostReactionButtons({
  id,
  initialLikeCount,
  initialDislikeCount,
  initialUserReaction,
  disabled = false,
  size = 'md',
  showCounts = true,
  className = '',
}: PostReactionButtonsProps): React.ReactElement {
  // Create reaction handler for posts using the existing API pattern
  const handlePostReaction = useCallback(
    async (
      postId: string,
      type: 'like' | 'dislike',
    ): Promise<PostReactionResponse> => {
      try {
        const response = await fetch(`/api/posts/${postId}/reactions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type }),
        });

        if (response.ok) {
          const data = (await response.json()) as {
            likeCount: number;
            dislikeCount: number;
            userReaction: 'like' | 'dislike' | null;
          };
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
      } catch (error: unknown) {
        console.error('Error updating post reaction:', error);
        return {
          success: false,
          message: 'Network error occurred',
        };
      }
    },
    [],
  );

  return (
    <ReactionButtons
      id={id}
      initialLikeCount={initialLikeCount}
      initialDislikeCount={initialDislikeCount}
      initialUserReaction={initialUserReaction}
      reactionHandler={handlePostReaction}
      disabled={disabled}
      size={size}
      showCounts={showCounts}
      className={className}
    />
  );
}
