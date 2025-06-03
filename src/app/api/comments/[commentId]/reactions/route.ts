import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ commentId: string }> },
) {
  const { commentId } = await params;
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

  let body: { type?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const { type } = body;
  if (type !== 'like' && type !== 'dislike') {
    return NextResponse.json(
      { error: 'Invalid reaction type' },
      { status: 400 },
    );
  }

  // Check for existing reaction
  const { data: existing, error: existingError } = await supabase
    .from('comment_reactions')
    .select('type')
    .eq('comment_id', commentId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existingError && existingError.code !== 'PGRST116') {
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  let userReaction: 'like' | 'dislike' | null = null;

  if (existing) {
    if (existing.type === type) {
      // Toggle off (remove reaction)
      await supabase
        .from('comment_reactions')
        .delete()
        .eq('comment_id', commentId)
        .eq('user_id', user.id);
      userReaction = null;
    } else {
      // Switch reaction
      await supabase
        .from('comment_reactions')
        .delete()
        .eq('comment_id', commentId)
        .eq('user_id', user.id);
      await supabase
        .from('comment_reactions')
        .insert({ comment_id: commentId, user_id: user.id, type });
      userReaction = type;
    }
  } else {
    // No reaction, insert new
    await supabase
      .from('comment_reactions')
      .insert({ comment_id: commentId, user_id: user.id, type });
    userReaction = type;
  }

  // Get new like/dislike counts
  const [{ count: likeCount }, { count: dislikeCount }] = await Promise.all([
    supabase
      .from('comment_reactions')
      .select('*', { count: 'exact', head: true })
      .eq('comment_id', commentId)
      .eq('type', 'like'),
    supabase
      .from('comment_reactions')
      .select('*', { count: 'exact', head: true })
      .eq('comment_id', commentId)
      .eq('type', 'dislike'),
  ]);

  return NextResponse.json({
    success: true,
    likeCount: likeCount ?? 0,
    dislikeCount: dislikeCount ?? 0,
    userReaction,
  });
} 