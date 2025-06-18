"use server";

import { revalidatePath } from "next/cache";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ReactionType } from '@/types/comments-v2';

import type { TablesInsert } from '@/types/database.types';

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
  const supabase = createServerSupabaseClient();

  // Validate reaction type
  const validReactionTypes = ['like', 'dislike'] as const;
  type ValidReactionType = typeof validReactionTypes[number];
  if (!validReactionTypes.includes(type as ValidReactionType)) {
    return {
      success: false,
      message: "Invalid reaction type. Must be 'like' or 'dislike'."
    };
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, message: "User not authenticated." };
  }

  try {
    // Check for existing reaction
    const { data: existing, error: existingError } = await supabase
      .from('comment_reactions')
      .select('reaction_type')
      .eq('comment_id', commentId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingError && existingError.code !== 'PGRST116') {
      console.error("Error checking existing comment reaction:", existingError);
      return { success: false, message: "Database error checking reaction status." };
    }

    let userReaction: ReactionType | undefined = undefined;

    if (existing) {
      if (existing.reaction_type === type) {
        // Toggle off (remove reaction)
        const { error: deleteError } = await supabase
          .from('comment_reactions')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', user.id);

        if (deleteError) {
          console.error("Error removing comment reaction:", deleteError);
          return { success: false, message: "Failed to remove reaction." };
        }
        userReaction = undefined;
      } else {
        // Switch reaction type
        const { error: deleteError } = await supabase
          .from('comment_reactions')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', user.id);

        if (deleteError) {
          console.error("Error removing old comment reaction:", deleteError);
          return { success: false, message: "Failed to update reaction." };
        }

        const payload: TablesInsert<'comment_reactions'> = {
          comment_id: commentId,
          user_id: user.id,
          reaction_type: type as ReactionType,
        };

        const { error: insertError } = await supabase
          .from('comment_reactions')
          .insert(payload);

        if (insertError) {
          console.error("Error adding new comment reaction:", insertError);
          return { success: false, message: "Failed to add reaction." };
        }
        userReaction = type as ValidReactionType;
      }
    } else {
      // No existing reaction, add new one
      const payload2: TablesInsert<'comment_reactions'> = {
        comment_id: commentId,
        user_id: user.id,
        reaction_type: type as ReactionType,
      };

      const { error: insertError } = await supabase
        .from('comment_reactions')
        .insert(payload2);

      if (insertError) {
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
        .eq('reaction_type', 'dislike' as ReactionType),
    ]);

    // Revalidate relevant paths
    if (postSlug) {
      revalidatePath(`/posts/${postSlug}`);
    }
    // Could also revalidate other paths if needed (e.g., user profiles, feeds)

    const actionMessage = existing 
      ? (existing.reaction_type === type 
          ? `Comment reaction removed successfully.`
          : `Comment reaction updated successfully.`)
      : `Comment reaction added successfully.`;

    return {
      success: true,
      likeCount: likeCount ?? 0,
      dislikeCount: dislikeCount ?? 0,
      userReaction,
      message: actionMessage,
    };

  } catch (error: unknown) {
    console.error("Unexpected error in toggleCommentReaction:", error);
    return { 
      success: false, 
      message: "An unexpected error occurred. Please try again." 
    };
  }
} 