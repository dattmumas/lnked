'use server';

import { NextRequest, NextResponse } from 'next/server';
import { createRequestScopedSupabaseClient } from '@/lib/supabase/request-scoped';

const PAGE_SIZE = 30;

export async function GET(req: NextRequest) {
  const cursor = req.nextUrl.searchParams.get('cursor');
  const supabase = createRequestScopedSupabaseClient(req);

  let q = supabase
    .from('posts')
    .select(
      `
      id,
      post_type,
      title,
      created_at,
      video:video_assets!posts_video_id_fkey(duration, mux_playback_id, status, is_public),
      author:users!posts_author_id_fkey(id, full_name, avatar_url)
    `,
    )
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE + 1);

  if (cursor) {
    q = q.lt('created_at', cursor);
  }

  const { data, error } = await q;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const dataArr = data ?? [];
  const items = dataArr.slice(0, PAGE_SIZE);
  const nextCursor =
    dataArr.length > PAGE_SIZE
      ? (items[items.length - 1]?.created_at ?? null)
      : null;

  return NextResponse.json({ items, nextCursor });
}
