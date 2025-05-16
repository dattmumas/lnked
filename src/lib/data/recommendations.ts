import { cookies } from "next/headers"; // Needs cookies if it uses them directly
// If fetchRecommendations needs to be called from client, it would be an API route call,
// but here it's used by a Server Component, so it can be a server-side function.

// Assuming Recommendation interface is defined elsewhere or can be imported/defined here
// For now, let's redefine it or assume it will be imported from a types file.
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
  // cookieHeader: string, // If called from server component, can use cookies() directly
  cursor?: string,
  limit = 10
): Promise<{ recommendations: Recommendation[]; nextCursor: string | null }> {
  const cookieStore = cookies();
  const cookieHeader = cookieStore.toString(); // Construct header if needed by API

  const params = new URLSearchParams();
  params.set("limit", limit.toString());
  if (cursor) params.set("cursor", cursor);

  // Ensure NEXT_PUBLIC_SITE_URL is available or provide a default for server-side fetch
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VERCEL_URL ||
    "http://localhost:3000";

  const res = await fetch(
    `${siteUrl}/api/recommendations?${params.toString()}`,
    {
      headers: { Cookie: cookieHeader }, // Pass cookies if your API route needs them for auth
      next: { revalidate: 300 }, // Keep revalidation strategy
    }
  );
  if (!res.ok) {
    const errorBody = await res.text();
    console.error(
      "Failed to fetch recommendations (from lib). Status:",
      res.status,
      "Body:",
      errorBody
    );
    throw new Error(
      `Failed to fetch recommendations (from lib). Status: ${res.status}`
    );
  }
  return res.json();
}
