import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getCommentsByPostId } from '@/lib/data/comments';

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } },
) {
  const { slug } = params;
  try {
    const comments = await getCommentsByPostId(slug);
    return NextResponse.json({ comments });
  } catch (e: unknown) {
    const error = e instanceof Error ? e : new Error('Unknown error');
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } },
) {
  const { slug } = params;
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: 'User not authenticated' },
      { status: 401 },
    );
  }

  let body: { content?: string; parent_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const { content, parent_id } = body;
  if (
    !content ||
    typeof content !== 'string' ||
    content.trim().length < 1 ||
    content.length > 2000
  ) {
    return NextResponse.json(
      { error: 'Invalid comment content' },
      { status: 400 },
    );
  }

  const { data: inserted, error: insertError } = await supabase
    .from('comments')
    .insert({
      post_id: slug,
      user_id: user.id,
      content: content.trim(),
      parent_id: parent_id || null,
    })
    .select()
    .maybeSingle();

  if (insertError || !inserted) {
    return NextResponse.json(
      { error: insertError?.message || 'Failed to add comment' },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, comment: inserted });
}
