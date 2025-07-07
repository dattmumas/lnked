import { NextRequest, NextResponse } from 'next/server';

import { createServerSupabaseClient } from '@/lib/supabase/server';

import type { Database } from '@/lib/database.types';

// Shape of a single row returned by get_user_feed
type UserFeedRow =
  Database['public']['Functions']['get_user_feed']['Returns'][number];
type RpcParams = Database['public']['Functions']['get_user_feed']['Args'];

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const supabase = await createServerSupabaseClient();
  const { searchParams } = new URL(req.url);

  const limit = Number(searchParams.get('limit') ?? '20');
  const offset = Number(searchParams.get('offset') ?? '0');

  // Auth check handled inside RPC via RLS; but ensure user exists for clarity
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rpcParams: RpcParams = {
    p_user_id: user.id,
    p_limit: limit,
    p_offset: offset,
  };

  const { data: rpcData } = await supabase
    .rpc('get_user_feed', rpcParams)
    .throwOnError();

  const items: UserFeedRow[] = rpcData ?? [];

  const nextOffset = items.length === limit ? offset + limit : null;

  return NextResponse.json({ items, nextOffset });
}
