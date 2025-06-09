"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { isValidReactionType } from "@/lib/utils/reactionHelpers";

interface CommentReactionResult {
  success: boolean;
  message?: string;
  likeCount?: number;
  dislikeCount?: number;
  userReaction?: 'like' | 'dislike' | null;
}

export async function toggleCommentReaction(
  commentId: string,
  type: string,
  postSlug?: string
): Promise<CommentReactionResult> {
  const supabase = await createServerSupabaseClient();

  // Validate reaction type
  if (!isValidReactionType(type)) {
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
      .select('type')
      .eq('comment_id', commentId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingError && existingError.code !== 'PGRST116') {
      console.error("Error checking existing comment reaction:", existingError);
      return { success: false, message: "Database error checking reaction status." };
    }

    let userReaction: 'like' | 'dislike' | null = null;

    if (existing) {
      if (existing.type === type) {
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
        userReaction = null;
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

        const { error: insertError } = await supabase
          .from('comment_reactions')
          .insert({ comment_id: commentId, user_id: user.id, type });

        if (insertError) {
          console.error("Error adding new comment reaction:", insertError);
          return { success: false, message: "Failed to add reaction." };
        }
        userReaction = type;
      }
    } else {
      // No existing reaction, add new one
      const { error: insertError } = await supabase
        .from('comment_reactions')
        .insert({ comment_id: commentId, user_id: user.id, type });

      if (insertError) {
        console.error("Error adding comment reaction:", insertError);
        return { success: false, message: "Failed to add reaction." };
      }
      userReaction = type;
    }

    // Get updated reaction counts
    const [{ count: likeCount }, { count: dislikeCount }] = await Promise.all([
      supabase
        .from('comment_reactions')
        .select('*', { count: 'exact', head: true })
        .eq('comment_id', commentId)
        .eq('type', 'like'),
      supabase
        .from('comment_reactions')
        .select('*', { count: 'exact', head: true })
        .eq('comment_id', commentId)
        .eq('type', 'dislike'),
    ]);

    // Revalidate relevant paths
    if (postSlug) {
      revalidatePath(`/posts/${postSlug}`);
    }
    // Could also revalidate other paths if needed (e.g., user profiles, feeds)

    const actionMessage = existing 
      ? (existing.type === type 
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

  } catch (error) {
    console.error("Unexpected error in toggleCommentReaction:", error);
    return { 
      success: false, 
      message: "An unexpected error occurred. Please try again." 
    };
  }
} 