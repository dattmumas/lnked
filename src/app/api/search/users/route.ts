import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createServerSupabaseClient } from '@/lib/supabase/server';

// Constants for validation and limits
const MAX_QUERY_LENGTH = 100;
const DEFAULT_SEARCH_LIMIT = 10;
const MAX_SEARCH_LIMIT = 25;

const QuerySchema = z.object({
  q: z.string().trim().min(1).max(MAX_QUERY_LENGTH),
  limit: z.coerce.number().optional(),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const parsed = QuerySchema.safeParse({
    q: searchParams.get('q') ?? '',
    limit: searchParams.get('limit') ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query' }, { status: 400 });
  }

  const { q, limit = DEFAULT_SEARCH_LIMIT } = parsed.data;
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from('users')
    .select('id, username, full_name, avatar_url')
    .ilike('username', `%${q}%`)
    .limit(Math.min(limit, MAX_SEARCH_LIMIT));

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 200 });
}

export const runtime = 'nodejs'; 