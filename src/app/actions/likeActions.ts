"use server";

import { revalidatePath } from "next/cache";

import { requireUser, ERROR_MESSAGES } from '@/lib/utils/server-action-helpers';

interface LikeActionResult {
  success: boolean;
  message?: string;
  newLikeCount?: number;
  userHadLiked?: boolean;
}

export async function togglePostLike(
  postId: string,
  collectiveSlug: string | null | undefined
): Promise<LikeActionResult> {
  try {
    // Unified authentication
    const authResult = await requireUser();
    if (!authResult.success) {
      return { success: false, message: authResult.error };
    }

    const { user, supabase } = authResult;

    // First get the post to retrieve tenant_id
    const { data: post, error: postError } = await supabase
      .from("posts")
      .select("tenant_id")
      .eq("id", postId)
      .single();

    if (postError || post === null) {
      console.error("Error fetching post:", postError);
      return { success: false, message: ERROR_MESSAGES.NOT_FOUND };
    }

    // Check if the user has already liked the post
    const { data: existingLike, error: likeCheckError } = await supabase
      .from("post_reactions")
      .select("*")
      .eq("post_id", postId)
      .eq("user_id", user.id)
      .eq("type", "like")
      .maybeSingle();

    if (likeCheckError && likeCheckError.code !== "PGRST116") {
      console.error("Error checking for existing like:", likeCheckError);
      return { success: false, message: "Database error checking like status." };
    }

    let userHadLikedInitially = Boolean(existingLike);

    if (existingLike) {
      // Unlike
      const { error: deleteError } = await supabase
        .from("post_reactions")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", user.id)
        .eq("type", "like");

      if (deleteError) {
        console.error("Error unliking post:", deleteError);
        return { success: false, message: "Failed to unlike post." };
      }
      userHadLikedInitially = false; // After unliking
    } else {
      // Like - Include tenant_id from the post
      const { error: insertError } = await supabase
        .from("post_reactions")
        .insert({ 
          post_id: postId, 
          user_id: user.id, 
          type: "like",
          tenant_id: post.tenant_id
        })
        .single();

      if (insertError) {
        console.error("Error liking post:", insertError);
        return { success: false, message: "Failed to like post." };
      }
      userHadLikedInitially = true; // After liking
    }

    // Get the new like count for the post
    const { count, error: countError } = await supabase
      .from("post_reactions")
      .select("*", { count: "exact", head: true })
      .eq("post_id", postId)
      .eq("type", "like");

    if (countError) {
      console.error("Error fetching new like count:", countError);
    }

    // Revalidation logic
    if (collectiveSlug !== null && collectiveSlug !== undefined) {
      revalidatePath(`/collectives/${collectiveSlug}/${postId}`);
      revalidatePath(`/collectives/${collectiveSlug}`);
    } else {
      // It's an individual post, revalidate the generic post page
      revalidatePath(`/posts/${postId}`);
    }

    return {
      success: true,
      ...(count !== null ? { newLikeCount: count } : {}),
      userHadLiked: userHadLikedInitially,
      message: existingLike
        ? "Post unliked successfully."
        : "Post liked successfully.",
    };
  } catch (error: unknown) {
    console.error("Unexpected error in togglePostLike:", error);
    return {
      success: false,
      message: ERROR_MESSAGES.INTERNAL_ERROR,
    };
  }
}
