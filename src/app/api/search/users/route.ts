import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const QuerySchema = z.object({
  q: z.string().trim().min(1).max(100),
  limit: z.coerce.number().optional(),
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const parsed = QuerySchema.safeParse({
    q: searchParams.get('q') ?? '',
    limit: searchParams.get('limit') ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query' }, { status: 400 });
  }

  const { q, limit = 10 } = parsed.data;
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from('users')
    .select('id, username, full_name, avatar_url')
    .ilike('username', `%${q}%`)
    .limit(Math.min(limit, 25));

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 200 });
}

export const runtime = 'nodejs'; 