"use server";

import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
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
  const cookieStore = cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set(name, value, options);
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.delete(name, options);
        },
      },
    }
  );

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, message: "User not authenticated." };
  }

  // Check if the user has already liked the post
  const { data: existingLike, error: likeCheckError } = await supabase
    .from("likes")
    .select("*")
    .eq("post_id", postId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (likeCheckError && likeCheckError.code !== "PGRST116") {
    // PGRST116 (no rows) is fine
    console.error("Error checking for existing like:", likeCheckError);
    return { success: false, message: "Database error checking like status." };
  }

  let userHadLikedInitially = !!existingLike;

  if (existingLike) {
    // User has liked, so unlike (delete the like)
    const { error: deleteError } = await supabase
      .from("likes")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", user.id);

    if (deleteError) {
      console.error("Error unliking post:", deleteError);
      return { success: false, message: "Failed to unlike post." };
    }
    userHadLikedInitially = false; // After unliking
  } else {
    // User has not liked, so like (insert the like)
    const { error: insertError } = await supabase
      .from("likes")
      .insert({ post_id: postId, user_id: user.id });

    if (insertError) {
      console.error("Error liking post:", insertError);
      return { success: false, message: "Failed to like post." };
    }
    userHadLikedInitially = true; // After liking
  }

  // Get the new like count for the post
  const { count, error: countError } = await supabase
    .from("likes")
    .select("*_count_placeholder_*", { count: "exact", head: true })
    .eq("post_id", postId);

  if (countError) {
    console.error("Error fetching new like count:", countError);
    // Non-critical, proceed with success if like/unlike was okay
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
