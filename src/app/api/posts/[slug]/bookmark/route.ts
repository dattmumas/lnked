import { NextRequest, NextResponse } from 'next/server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
// import { toggleBookmark } from '@/lib/data/bookmarks';
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

  // Check for existing bookmark
  const { data: existing, error: existingError } = await supabase
    .from('post_bookmarks')
    .select('*')
    .eq('post_id', postId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existingError && existingError.code !== 'PGRST116') {
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  let bookmarked: boolean;
  if (existing) {
    // Unbookmark
    await supabase
      .from('post_bookmarks')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', user.id);
    bookmarked = false;
  } else {
    // Bookmark
    await supabase
      .from('post_bookmarks')
      .insert({ post_id: postId, user_id: user.id });
    bookmarked = true;
  }

  return NextResponse.json({ success: true, bookmarked });
}
