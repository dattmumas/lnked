import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// GET /api/posts - Fetches posts, optionally filtered by collective_id
// Example: /api/posts?collectiveId=uuid-of-collective
export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient();

  const { searchParams } = new URL(request.url);
  const collectiveId = searchParams.get("collectiveId");

  try {
    let query = supabase
      .from("posts")
      .select(
        "id, title, created_at, is_public, collective_id, collective:collectives!collective_id(name, slug), author:users!author_id(full_name)"
      )
      .eq("is_public", true) // Only public posts by default through this API
      // .is('published_at', 'not.null') // Only published posts
      .order("created_at", { ascending: false });

    if (collectiveId) {
      query = query.eq("collective_id", collectiveId);
    }

    const { data: posts, error } = await query;

    if (error) {
      console.error("Error fetching posts:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(posts);
  } catch (e: unknown) {
    const errorMessage =
      e instanceof Error ? e.message : "An unexpected error occurred.";
    console.error("Unexpected error fetching posts:", errorMessage, e);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// POST for posts is handled by a Server Action in app/dashboard/[collectiveId]/new-post/_actions.ts
