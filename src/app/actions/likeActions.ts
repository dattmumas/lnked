"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";
import { revalidatePath } from "next/cache";

interface LikeActionResult {
  success: boolean;
  message?: string;
  newLikeCount?: number;
  userHadLiked?: boolean;
}

export async function togglePostLike(
  postId: string,
  collectiveSlug: string | null | undefined,
  authorId: string
): Promise<LikeActionResult> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, message: "User not authenticated." };
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

  let userHadLikedInitially = !!existingLike;

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
    // Like
    const { error: insertError } = await supabase
      .from("post_reactions")
      .insert({ post_id: postId, user_id: user.id, type: "like" })
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
  if (collectiveSlug) {
    revalidatePath(`/collectives/${collectiveSlug}/${postId}`);
    revalidatePath(`/collectives/${collectiveSlug}`);
  } else {
    // It's an individual post, revalidate the author's newsletter page and the generic post page
    revalidatePath(`/newsletters/${authorId}`);
    revalidatePath(`/posts/${postId}`);
  }
  // Also revalidate any other relevant general feeds if applicable
  // revalidatePath('/'); // Example: if home page is a feed

  return {
    success: true,
    newLikeCount: count ?? undefined,
    userHadLiked: userHadLikedInitially,
    message: existingLike
      ? "Post unliked successfully."
      : "Post liked successfully.",
  };
}
