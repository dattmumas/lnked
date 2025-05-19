import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

interface LikeRequestBody {
  postId: string;
}

// POST /api/like - Toggles a like for a post by the authenticated user
export async function POST(request: Request) {
  const supabase = createServerSupabaseClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "User not authenticated" },
      { status: 401 }
    );
  }

  try {
    const { postId } = (await request.json()) as LikeRequestBody;
    if (!postId) {
      return NextResponse.json(
        { error: "postId is required" },
        { status: 400 }
      );
    }

    // Check for existing like
    const { data: existingLike, error: checkError } = await supabase
      .from("post_reactions")
      .select("*")
      .eq("type", "like")
      .eq("post_id", postId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (checkError && checkError.code !== "PGRST116") {
      console.error("Error checking like:", checkError.message);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    if (existingLike) {
      // Unlike
      const { error: deleteError } = await supabase
        .from("post_reactions")
        .delete()
        .match({ post_id: postId, user_id: user.id });
      if (deleteError) {
        console.error("Error unliking post:", deleteError.message);
        return NextResponse.json(
          { error: "Failed to unlike post" },
          { status: 500 }
        );
      }
    } else {
      // Like
      const { error: insertError } = await supabase
        .from("post_reactions")
        .insert({ post_id: postId, user_id: user.id });
      if (insertError) {
        console.error("Error liking post:", insertError.message);
        return NextResponse.json(
          { error: "Failed to like post" },
          { status: 500 }
        );
      }
    }

    // Get new like count
    const { count, error: countError } = await supabase
      .from("post_reactions")
      .select("*_count_placeholder_*", { count: "exact", head: true })
      .eq("post_id", postId);

    if (countError) {
      console.error("Error fetching like count:", countError.message);
      // Proceed even if count fails, like action was successful
    }

    return NextResponse.json({ likes: count ?? 0 });
  } catch (e: unknown) {
    const errorMessage =
      e instanceof Error ? e.message : "An unexpected error occurred.";
    console.error("Error in /api/like:", errorMessage, e);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
