import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";
import { getCommentsByPostId } from "@/lib/data/comments";
// import { getCurrentUser } from '@/lib/auth'; // Implement as needed

export async function GET(
  req: NextRequest,
  { params }: { params: { _postId: string } }
) {
  const { _postId: postId } = params;
  try {
    const comments = await getCommentsByPostId(postId);
    return NextResponse.json({ comments });
  } catch (e: unknown) {
    const error = e instanceof Error ? e : new Error("Unknown error");
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { _postId: string } }
) {
  const { _postId: postId } = params;
  const cookieStore = await cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set() {}, // no-op for SSR
        remove() {}, // no-op for SSR
      },
    }
  );

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

  let body: { content?: string; parent_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { content, parent_id } = body;
  if (
    !content ||
    typeof content !== "string" ||
    content.trim().length < 1 ||
    content.length > 2000
  ) {
    return NextResponse.json(
      { error: "Invalid comment content" },
      { status: 400 }
    );
  }

  const { data: inserted, error: insertError } = await supabase
    .from("comments")
    .insert({
      post_id: postId,
      user_id: user.id,
      content: content.trim(),
      parent_id: parent_id || null,
    })
    .select()
    .maybeSingle();

  if (insertError || !inserted) {
    return NextResponse.json(
      { error: insertError?.message || "Failed to add comment" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, comment: inserted });
}
