import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getCommentsByPostId, getOrCreatePostForVideo, addComment } from '@/lib/data/comments';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug: postIdOrSlug } = await params;
  const supabase = await createServerSupabaseClient();

  let postId: string;

  // Handle video slugs (format: video-{videoId})
  if (postIdOrSlug.startsWith('video-')) {
    const videoId = postIdOrSlug.replace('video-', '');
    try {
      const post = await getOrCreatePostForVideo(videoId);
      postId = post.id;
    } catch (e: unknown) {
      const error = e instanceof Error ? e : new Error('Unknown error');
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
  } else {
    // Handle regular post IDs - validate UUID format
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(postIdOrSlug);
    if (!isUUID) {
      return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 });
    }

    const { data: postRecord } = await supabase
      .from('posts')
      .select('id')
      .eq('id', postIdOrSlug)
      .maybeSingle<{ id: string }>();

    if (!postRecord) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }
    postId = postRecord.id;
  }

  try {
    const comments = await getCommentsByPostId(postId);
    return NextResponse.json({ comments });
  } catch (e: unknown) {
    const error = e instanceof Error ? e : new Error('Unknown error');
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug: postIdOrSlug } = await params;
  const supabase = await createServerSupabaseClient();

  let postId: string;

  // Handle video slugs (format: video-{videoId})
  if (postIdOrSlug.startsWith('video-')) {
    const videoId = postIdOrSlug.replace('video-', '');
    try {
      const post = await getOrCreatePostForVideo(videoId);
      postId = post.id;
    } catch (e: unknown) {
      const error = e instanceof Error ? e : new Error('Unknown error');
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
  } else {
    // Handle regular post IDs - validate UUID format
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(postIdOrSlug);
    if (!isUUID) {
      return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 });
    }

    const { data: postRecord } = await supabase
      .from('posts')
      .select('id')
      .eq('id', postIdOrSlug)
      .maybeSingle<{ id: string }>();

    if (!postRecord) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }
    postId = postRecord.id;
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

  try {
    const comment = await addComment({
      postId,
      userId: user.id,
      content: content.trim(),
      parentId: parent_id || undefined,
    });

    return NextResponse.json({ success: true, comment });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to add comment';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 },
    );
  }
}
