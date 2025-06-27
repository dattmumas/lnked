import { DEFAULT_RECOMMENDATION_LIMIT } from "@/lib/constants/recommendations";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// Recommendation interface matching the database structure
export interface Recommendation {
  score: number;
  created_at: string;
  suggested_collective_id: string;
  collectives: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    tags: string[] | null;
  };
}

export async function fetchRecommendations(
  cursor?: string,
  limit: number = DEFAULT_RECOMMENDATION_LIMIT
): Promise<{ recommendations: Recommendation[]; nextCursor: string | null }> {
  try {
    const supabase = await createServerSupabaseClient();

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    // If no user is authenticated, return empty recommendations
    if (userError !== null || user === null) {
      console.warn('No authenticated user for recommendations');
      return { recommendations: [], nextCursor: null };
    }

    // Build the query
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

    // Apply cursor-based pagination if provided
    if (typeof cursor === 'string' && cursor.trim().length > 0) {
      const parts = cursor.split(',');
      if (parts.length === 2) {
        const [scoreStr, id] = parts as [string, string];
        const score = parseFloat(scoreStr);
        if (!isNaN(score) && id.trim().length > 0) {
          query = query
            .gte('score', score)
            .gte('suggested_collective_id', id.trim());
        }
      }
    }

    const { data, error } = await query;

    if (error !== null) {
      console.error("Error fetching recommendations from database:", error);
      throw new Error(`Failed to fetch recommendations: ${error.message}`);
    }

    const results = data ?? [];
    let nextCursor: string | null = null;

    // If we got more results than requested, use the last one for pagination
    if (results.length > limit) {
      const next = results.pop();
      if (next !== null && next !== undefined) {
        nextCursor = `${next.score},${next.suggested_collective_id}`;
      }
    }

    return {
      recommendations: results as Recommendation[],
      nextCursor,
    };
  } catch (error: unknown) {
    console.error('Error in fetchRecommendations:', error);
    // Return empty results instead of throwing to prevent page crashes
    return { recommendations: [], nextCursor: null };
  }
}
