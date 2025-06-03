import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
// import { togglePostReaction } from '@/lib/data/reactions';
// import { getCurrentUser } from '@/lib/auth'; // Implement as needed

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug: postId } = await params;
  const supabase = await createServerSupabaseClient();

  // Validate that postId is a valid UUID
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(postId);
  if (!isUUID) {
    return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 });
  }

  // Check if post exists
  const { data: postRecord } = await supabase
    .from('posts')
    .select('id')
    .eq('id', postId)
    .maybeSingle<{ id: string }>();

  if (!postRecord) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }

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
    .from('post_reactions')
    .select('type')
    .eq('post_id', postId)
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
        .from('post_reactions')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id);
      userReaction = null;
    } else {
      // Switch reaction
      await supabase
        .from('post_reactions')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id);
      await supabase
        .from('post_reactions')
        .insert({ post_id: postId, user_id: user.id, type });
      userReaction = type;
    }
  } else {
    // No reaction, insert new
    await supabase
      .from('post_reactions')
      .insert({ post_id: postId, user_id: user.id, type });
    userReaction = type;
  }

  // Get new like/dislike counts
  const [{ count: likeCount }, { count: dislikeCount }] = await Promise.all([
    supabase
      .from('post_reactions')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId)
      .eq('type', 'like'),
    supabase
      .from('post_reactions')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId)
      .eq('type', 'dislike'),
  ]);

  return NextResponse.json({
    success: true,
    likeCount: likeCount ?? 0,
    dislikeCount: dislikeCount ?? 0,
    userReaction,
  });
}
