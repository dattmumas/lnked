import { NextRequest, NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";


export const dynamic = "force-dynamic";

// Constants for pagination and limits
const DEFAULT_RECOMMENDATION_LIMIT = 10;
const PAGINATION_BUFFER = 1;
const HTTP_UNAUTHORIZED = 401;
const HTTP_INTERNAL_SERVER_ERROR = 500;

/**
 * GET /api/recommendations
 * Returns a paginated list of recommended collectives for the current user.
 * Query params: limit (default 10), cursor (optional, for pagination)
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError !== null || user === null) {
      return NextResponse.json({ error: "Unauthorized" }, { status: HTTP_UNAUTHORIZED });
    }

    const { searchParams } = new URL(req.url);
    const limitParam = searchParams.get("limit");
    const limit = parseInt(limitParam ?? String(DEFAULT_RECOMMENDATION_LIMIT), 10);
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
      .limit(limit + PAGINATION_BUFFER); // Fetch one extra for next cursor

    if (cursor !== null && cursor !== undefined) {
      const [scoreStr, id] = cursor.split(",");
      const score = parseFloat(scoreStr);
      query = query.gte("score", score).gte("suggested_collective_id", id);
    }

    const { data, error } = await query;
    if (error !== null) {
      console.error("Error fetching recommendations:", error);
      return NextResponse.json(
        { error: "Failed to fetch recommendations" },
        { status: HTTP_INTERNAL_SERVER_ERROR }
      );
    }

    let nextCursor: string | null = null;
    const results = data ?? [];
    if (results.length > limit) {
      const next = results.pop();
      if (next !== null && next !== undefined) {
        nextCursor = `${next.score},${next.suggested_collective_id}`;
      }
    }

    return NextResponse.json({
      recommendations: results,
      nextCursor,
    });
  } catch (error: unknown) {
    console.error('Error in GET /api/recommendations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: HTTP_INTERNAL_SERVER_ERROR }
    );
  }
}
