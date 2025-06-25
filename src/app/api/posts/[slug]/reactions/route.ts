import { NextRequest, NextResponse } from 'next/server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
// import { togglePostReaction } from '@/lib/data/reactions';
// import { getCurrentUser } from '@/lib/auth'; // Implement as needed

import type { TablesInsert, Enums } from '@/types/database.types';



export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
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
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: post, error: postError } = await supabase
    .from('posts')
    .select('tenant_id')
    .eq('id', postId)
    .single();

  if (postError || !post || !post.tenant_id) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }

  const { reaction_type } = (await request.json()) as {
    reaction_type: unknown;
  };
  if (reaction_type !== 'like' && reaction_type !== 'dislike') {
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

  let userReaction: Enums<'reaction_type'> | null = null;

  if (existing) {
    if (existing.type === reaction_type) {
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
      const payload: TablesInsert<'post_reactions'> = {
        post_id: postId,
        user_id: user.id,
        type: reaction_type as Enums<'reaction_type'>,
        tenant_id: post.tenant_id,
      };
      await supabase.from('post_reactions').insert(payload);
      userReaction = reaction_type as Enums<'reaction_type'>;
    }
  } else {
    // No reaction, insert new
    const payload2: TablesInsert<'post_reactions'> = {
      post_id: postId,
      user_id: user.id,
      type: reaction_type as Enums<'reaction_type'>,
      tenant_id: post.tenant_id,
    };
    await supabase.from('post_reactions').insert(payload2);
    userReaction = reaction_type as Enums<'reaction_type'>;
  }

  // Get new like/dislike counts
  const [{ count: likeCount }, { count: dislikeCount }] = await Promise.all([
    supabase
      .from('post_reactions')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId)
      .eq('reaction_type', 'like'),
    supabase
      .from('post_reactions')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId)
      .eq('reaction_type', 'dislike'),
  ]);

  return NextResponse.json({
    success: true,
    likeCount: likeCount ?? 0,
    dislikeCount: dislikeCount ?? 0,
    userReaction,
  });
}
