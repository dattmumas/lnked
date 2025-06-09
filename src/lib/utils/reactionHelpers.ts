/**
 * Shared utilities for handling like/dislike reaction state management
 * Used by both comment and post reaction components
 */

export interface ReactionState {
  likeCount: number;
  dislikeCount: number;
  userReaction: 'like' | 'dislike' | null;
}

export interface ReactionToggleResult {
  newLikeCount: number;
  newDislikeCount: number;
  newUserReaction: 'like' | 'dislike' | null;
}

/**
 * Calculates the new reaction state when a user toggles a like/dislike
 * Handles optimistic UI updates consistently across components
 * 
 * @param currentState Current reaction state
 * @param toggleType The type of reaction being toggled ('like' | 'dislike')
 * @returns New reaction state after the toggle
 */
export function toggleReactionState(
  currentState: ReactionState,
  toggleType: 'like' | 'dislike'
): ReactionToggleResult {
  const { likeCount, dislikeCount, userReaction } = currentState;
  
  let newLikeCount = likeCount;
  let newDislikeCount = dislikeCount;
  let newUserReaction: 'like' | 'dislike' | null = null;

  if (toggleType === 'like') {
    if (userReaction === 'like') {
      // User is removing their like
      newLikeCount -= 1;
      newUserReaction = null;
    } else {
      // User is adding a like
      newLikeCount += 1;
      newUserReaction = 'like';
      // If user had disliked, remove the dislike
      if (userReaction === 'dislike') {
        newDislikeCount -= 1;
      }
    }
  } else { // toggleType === 'dislike'
    if (userReaction === 'dislike') {
      // User is removing their dislike
      newDislikeCount -= 1;
      newUserReaction = null;
    } else {
      // User is adding a dislike
      newDislikeCount += 1;
      newUserReaction = 'dislike';
      // If user had liked, remove the like
      if (userReaction === 'like') {
        newLikeCount -= 1;
      }
    }
  }

  return {
    newLikeCount,
    newDislikeCount,
    newUserReaction,
  };
}

/**
 * Type guard to validate reaction type
 */
export function isValidReactionType(type: string): type is 'like' | 'dislike' {
  return type === 'like' || type === 'dislike';
}

/**
 * Common error handler for reaction API calls
 */
export function handleReactionError(
  error: unknown,
  context: 'comment' | 'post'
): string {
  console.error(`Error handling ${context} reaction:`, error);
  return `Failed to update ${context} reaction. Please try again.`;
} 