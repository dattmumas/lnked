import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import type { Database } from "@/lib/database.types";

// GET /api/collectives - Fetches all collectives (publicly readable)
export async function GET() {
  const supabase = createRouteHandlerClient<Database>({ cookies });

  try {
    const { data: collectives, error } = await supabase
      .from("collectives")
      .select(
        "id, name, slug, description, created_at, owner_id, owner:users!owner_id(full_name)"
      ) // Fetch owner's name
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching collectives:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(collectives);
  } catch (e: unknown) {
    const errorMessage =
      e instanceof Error ? e.message : "An unexpected error occurred.";
    console.error("Unexpected error fetching collectives:", errorMessage, e);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// POST for collectives is handled by a Server Action in app/dashboard/collectives/new/_actions.ts
