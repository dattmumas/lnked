"use server";

import { revalidatePath } from "next/cache";

import { requireUser, ERROR_MESSAGES } from '@/lib/utils/server-action-helpers';
import { ReactionType } from '@/types/comments-v2';

// Reaction result types simplified to like/dislike only
export interface ReactionState {
  likeCount: number;
  dislikeCount: number;
  userReaction: ReactionType | undefined;
}

export interface CommentReactionResult {
  success: boolean;
  message?: string;
  likeCount?: number;
  dislikeCount?: number;
  userReaction?: ReactionType | undefined;
}

export async function toggleCommentReaction(
  commentId: string,
  type: string,
  postSlug?: string
): Promise<CommentReactionResult> {
  // Validate reaction type
  const validReactionTypes = ['like', 'dislike'] as const;
  type ValidReactionType = typeof validReactionTypes[number];
  if (!validReactionTypes.includes(type as ValidReactionType)) {
    return {
      success: false,
      message: "Invalid reaction type. Must be 'like' or 'dislike'."
    };
  }

  // Unified authentication
  const authResult = await requireUser();
  if (!authResult.success) {
    return { success: false, message: authResult.error };
  }

  const { user, supabase } = authResult;

  try {
    // Check for existing reaction to handle switch logic
    const { data: existing, error: existingError } = await supabase
      .from('comment_reactions')
      .select('reaction_type')
      .eq('comment_id', commentId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingError !== null && existingError.code !== 'PGRST116') {
      console.error("Error checking existing comment reaction:", existingError);
      return { success: false, message: "Database error checking reaction status." };
    }

    let userReaction: ReactionType | undefined = undefined;

    if (existing !== null) {
      if (existing.reaction_type === type) {
        // Toggle off (remove reaction)
        const { error: deleteError } = await supabase
          .from('comment_reactions')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', user.id);

        if (deleteError !== null) {
          console.error("Error removing comment reaction:", deleteError);
          return { success: false, message: "Failed to remove reaction." };
        }
        userReaction = undefined;
      } else {
        // Switch reaction type - delete old then add new
        const { error: deleteError } = await supabase
          .from('comment_reactions')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', user.id);

        if (deleteError !== null) {
          console.error("Error removing old comment reaction:", deleteError);
          return { success: false, message: "Failed to update reaction." };
        }

        const { error: insertError } = await supabase
          .from('comment_reactions')
          .insert({
            comment_id: commentId,
            user_id: user.id,
            reaction_type: type as ReactionType,
          });

        if (insertError !== null) {
          console.error("Error adding new comment reaction:", insertError);
          return { success: false, message: "Failed to add reaction." };
        }
        userReaction = type as ValidReactionType;
      }
    } else {
      // No existing reaction, add new one
      const { error: insertError } = await supabase
        .from('comment_reactions')
        .insert({
          comment_id: commentId,
          user_id: user.id,
          reaction_type: type as ReactionType,
        });

      if (insertError !== null) {
        console.error("Error adding comment reaction:", insertError);
        return { success: false, message: "Failed to add reaction." };
      }
      userReaction = type as ValidReactionType;
    }

    // Get updated reaction counts
    const [{ count: likeCount }, { count: dislikeCount }] = await Promise.all([
      supabase
        .from('comment_reactions')
        .select('*', { count: 'exact', head: true })
        .eq('comment_id', commentId)
        .eq('reaction_type', 'like'),
      supabase
        .from('comment_reactions')
        .select('*', { count: 'exact', head: true })
        .eq('comment_id', commentId)
        .eq('reaction_type', 'dislike'),
    ]);

    // Revalidate relevant paths
    if (postSlug !== null && postSlug !== undefined) {
      revalidatePath(`/posts/${postSlug}`);
    }

    const actionMessage = existing !== null
      ? (existing.reaction_type === type 
          ? `Comment reaction removed successfully.`
          : `Comment reaction updated successfully.`)
      : `Comment reaction added successfully.`;

    return {
      success: true,
      likeCount: likeCount !== null ? likeCount : 0,
      dislikeCount: dislikeCount !== null ? dislikeCount : 0,
      userReaction,
      message: actionMessage,
    };

  } catch (error: unknown) {
    console.error("Unexpected error in toggleCommentReaction:", error);
    return { 
      success: false, 
      message: ERROR_MESSAGES.INTERNAL_ERROR
    };
  }
}