import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/lib/database.types";
// import { toggleBookmark } from '@/lib/data/bookmarks';
// import { getCurrentUser } from '@/lib/auth'; // Implement as needed

export async function POST(
  req: NextRequest,
  { params }: { params: { _postId: string } }
) {
  const { _postId: postId } = params;
  const supabase = createRouteHandlerClient<Database>({ cookies });

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

  // Check for existing bookmark
  const { data: existing, error: existingError } = await supabase
    .from("post_bookmarks")
    .select("*")
    .eq("post_id", postId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingError && existingError.code !== "PGRST116") {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  let bookmarked: boolean;
  if (existing) {
    // Unbookmark
    await supabase
      .from("post_bookmarks")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", user.id);
    bookmarked = false;
  } else {
    // Bookmark
    await supabase
      .from("post_bookmarks")
      .insert({ post_id: postId, user_id: user.id });
    bookmarked = true;
  }

  return NextResponse.json({ success: true, bookmarked });
}
