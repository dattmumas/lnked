import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/recommendations
 * Returns a paginated list of recommended collectives for the current user.
 * Query params: limit (default 10), cursor (optional, for pagination)
 */
export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "10", 10);
  const cursor = searchParams.get("cursor"); // cursor = score,id for stable pagination

  let query = supabase
    .from("recommendations")
    .select(
      `
      score,
      created_at,
      suggested_collective_id,
      collectives:collectives (
        id, name, slug, description, tags
      )
      `
    )
    .eq("user_id", user.id)
    .order("score", { ascending: true })
    .order("suggested_collective_id", { ascending: true })
    .limit(limit + 1); // Fetch one extra for next cursor

  if (cursor) {
    const [scoreStr, id] = cursor.split(",");
    const score = parseFloat(scoreStr);
    query = query.gte("score", score).gte("suggested_collective_id", id);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching recommendations:", error);
    return NextResponse.json(
      { error: "Failed to fetch recommendations" },
      { status: 500 }
    );
  }

  let nextCursor: string | null = null;
  const results = data || [];
  if (results.length > limit && results.length > 0) {
    const next = results.pop();
    if (next) {
      nextCursor = `${next.score},${next.suggested_collective_id}`;
    }
  }

  return NextResponse.json({
    recommendations: results,
    nextCursor,
  });
}
