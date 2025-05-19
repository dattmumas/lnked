"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

interface FollowActionResult {
  success: boolean;
  error?: string;
}

export async function followUser(
  userIdToFollow: string
): Promise<FollowActionResult> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "User not authenticated." };
  }

  if (user.id === userIdToFollow) {
    return { success: false, error: "You cannot follow yourself." };
  }

  const { error: insertError } = await supabase
    .from("follows")
    .insert({ follower_id: user.id, following_id: userIdToFollow });

  if (insertError) {
    console.error("Error following user:", insertError.message);
    if (insertError.code === "23505") {
      // Unique constraint violation
      return { success: false, error: "You are already following this user." };
    }
    return {
      success: false,
      error: `Failed to follow user: ${insertError.message}`,
    };
  }

  revalidatePath(`/newsletters/${userIdToFollow}`); // Revalidate the followed user's page
  revalidatePath(`/newsletters/${user.id}`); // Revalidate the current user's page (e.g., for following count)
  revalidatePath("/"); // Revalidate feed potentially

  return { success: true };
}

export async function unfollowUser(
  userIdToUnfollow: string
): Promise<FollowActionResult> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "User not authenticated." };
  }

  const { error: deleteError } = await supabase
    .from("follows")
    .delete()
    .match({ follower_id: user.id, following_id: userIdToUnfollow });

  if (deleteError) {
    console.error("Error unfollowing user:", deleteError.message);
    return {
      success: false,
      error: `Failed to unfollow user: ${deleteError.message}`,
    };
  }

  revalidatePath(`/newsletters/${userIdToUnfollow}`);
  revalidatePath(`/newsletters/${user.id}`);
  revalidatePath("/");

  return { success: true };
}
