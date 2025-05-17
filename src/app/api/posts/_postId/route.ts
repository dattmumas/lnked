import { NextRequest, NextResponse } from "next/server";
import { getPostById, getPostStats } from "@/lib/data/posts";
// import { getUserSubscription } from "@/lib/data/subscriptions";
// import { getCurrentUser } from '@/lib/auth'; // Implement as needed

export async function GET(
  req: NextRequest,
  { params }: { params: { _postId: string } }
) {
  const { _postId: postId } = params;
  // const user = await getCurrentUser(req); // Implement this for auth
  try {
    const post = await getPostById(postId);
    const stats = await getPostStats(postId);
    const isSubscribed = post.is_public ? true : false;
    return NextResponse.json({ post, stats, isSubscribed });
  } catch (e: unknown) {
    const error = e instanceof Error ? e : new Error("Unknown error");
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
}
