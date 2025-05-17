import { NextRequest, NextResponse } from "next/server";
import { logPostView } from "@/lib/data/views";

export async function POST(
  req: NextRequest,
  { params }: { params: { _postId: string } }
) {
  const { _postId: postId } = params;
  // const user = await getCurrentUser(req); // Implement this for auth if needed
  try {
    await logPostView({ postId, userId: null });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const error = e instanceof Error ? e : new Error("Unknown error");
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
