'use client';

import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import {
  toggleReactionState,
  type ReactionState,
  handleReactionError,
} from '@/lib/utils/reactionHelpers';

export interface ReactionButtonsProps {
  /** The ID of the item (post ID or comment ID) */
  id: string;
  /** Initial like count */
  initialLikeCount: number;
  /** Initial dislike count */
  initialDislikeCount: number;
  /** User's initial reaction state */
  initialUserReaction: 'like' | 'dislike' | null;
  /** The type of reaction handler (comment or post) */
  reactionHandler: (
    id: string,
    type: 'like' | 'dislike',
  ) => Promise<{
    success: boolean;
    likeCount?: number;
    dislikeCount?: number;
    userReaction?: 'like' | 'dislike' | null;
    message?: string;
  }>;
  /** Whether the buttons should be disabled */
  disabled?: boolean;
  /** Size variant for the buttons */
  size?: 'sm' | 'md' | 'lg';
  /** Style variant - 'default' for posts, 'comment' for comments */
  variant?: 'default' | 'comment';
  /** Whether to show count numbers */
  showCounts?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export default function ReactionButtons({
  id,
  initialLikeCount,
  initialDislikeCount,
  initialUserReaction,
  reactionHandler,
  disabled = false,
  size = 'md',
  variant = 'default',
  showCounts = true,
  className = '',
}: ReactionButtonsProps) {
  const [isPending, startTransition] = useTransition();
  const [currentState, setCurrentState] = useState<ReactionState>({
    likeCount: initialLikeCount,
    dislikeCount: initialDislikeCount,
    userReaction: initialUserReaction || undefined,
  });

  const handleReaction = (type: 'like' | 'dislike') => {
    if (disabled || isPending) return;

    // Store previous state for rollback on error
    const previousState = { ...currentState };

    // Apply optimistic update
    const newState = toggleReactionState(currentState, type);
    setCurrentState({
      likeCount: newState.newLikeCount,
      dislikeCount: newState.newDislikeCount,
      userReaction: newState.newUserReaction,
    });

    // Perform server action
    startTransition(async () => {
      try {
        const result = await reactionHandler(id, type);

        if (result.success) {
          // Update with server response
          setCurrentState({
            likeCount: result.likeCount ?? newState.newLikeCount,
            dislikeCount: result.dislikeCount ?? newState.newDislikeCount,
            userReaction: result.userReaction ?? newState.newUserReaction,
          });
        } else {
          // Rollback optimistic update on failure
          setCurrentState(previousState);
          console.error('Reaction failed:', result.message);
        }
      } catch (error) {
        // Rollback optimistic update on error
        setCurrentState(previousState);
        handleReactionError(error, variant === 'comment' ? 'comment' : 'post');
      }
    });
  };

  // Size configurations
  const sizeConfig = {
    sm: {
      button: 'h-6 w-6 p-0',
      icon: 'w-3 h-3',
      text: 'text-xs',
      gap: 'gap-1',
    },
    md: {
      button: 'h-8 w-8 p-0',
      icon: 'w-4 h-4',
      text: 'text-sm',
      gap: 'gap-2',
    },
    lg: {
      button: 'h-10 w-10 p-0',
      icon: 'w-5 h-5',
      text: 'text-base',
      gap: 'gap-3',
    },
  };

  const config = sizeConfig[size];

  // Style variants
  const getButtonStyles = (
    reactionType: 'like' | 'dislike',
    isActive: boolean,
  ) => {
    if (variant === 'comment') {
      // Comment style - more subtle
      const baseStyles = `${config.button} rounded-full transition-all duration-200 hover:bg-accent/50`;

      if (reactionType === 'like' && isActive) {
        return `${baseStyles} text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30`;
      } else if (reactionType === 'dislike' && isActive) {
        return `${baseStyles} text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30`;
      } else {
        return `${baseStyles} text-muted-foreground hover:text-foreground`;
      }
    } else {
      // Default post style - more prominent
      const baseStyles = `${config.button} rounded-full`;

      if (reactionType === 'like' && isActive) {
        return `${baseStyles} bg-primary text-primary-foreground hover:bg-primary/90`;
      } else if (reactionType === 'dislike' && isActive) {
        return `${baseStyles} bg-destructive text-destructive-foreground hover:bg-destructive/90`;
      } else {
        return `${baseStyles} bg-secondary text-secondary-foreground hover:bg-secondary/80`;
      }
    }
  };

  return (
    <div className={`flex items-center ${config.gap} ${className}`}>
      {/* Like Button */}
      <Button
        variant="ghost"
        size="sm"
        className={getButtonStyles(
          'like',
          currentState.userReaction === 'like',
        )}
        aria-label={
          currentState.userReaction === 'like' ? 'Remove like' : 'Like'
        }
        onClick={() => handleReaction('like')}
        disabled={disabled || isPending}
      >
        <ThumbsUp className={config.icon} />
      </Button>

      {/* Like Count */}
      {showCounts && (
        <span className={`${config.text} tabular-nums w-6 text-center`}>
          {currentState.likeCount}
        </span>
      )}

      {/* Dislike Button */}
      <Button
        variant="ghost"
        size="sm"
        className={getButtonStyles(
          'dislike',
          currentState.userReaction === 'dislike',
        )}
        aria-label={
          currentState.userReaction === 'dislike' ? 'Remove dislike' : 'Dislike'
        }
        onClick={() => handleReaction('dislike')}
        disabled={disabled || isPending}
      >
        <ThumbsDown className={config.icon} />
      </Button>

      {/* Dislike Count */}
      {showCounts && (
        <span className={`${config.text} tabular-nums w-6 text-center`}>
          {currentState.dislikeCount}
        </span>
      )}
    </div>
  );
}
