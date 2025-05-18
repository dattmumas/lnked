import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
// import type { Database } from "@/lib/database.types";

export async function POST(request: Request) {
  const { event, session } = await request.json();
  const supabase = await createServerSupabaseClient();

  if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
    await supabase.auth.setSession(session);
  } else if (event === "SIGNED_OUT") {
    await supabase.auth.signOut();
  }
  return NextResponse.json({ status: "success" });
}
