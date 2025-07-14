import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createServerSupabaseClient } from '@/lib/supabase/server';

const QuerySchema = z.object({
  creatorId: z.string().uuid().optional(),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await createServerSupabaseClient();
  const { searchParams } = new URL(request.url);
  const parseResult = QuerySchema.safeParse({
    creatorId: searchParams.get('creatorId') ?? undefined,
  });
  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Invalid query params' },
      { status: 400 },
    );
  }

  // Auth
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const creatorId = parseResult.data.creatorId ?? user.id;
  if (creatorId !== user.id) {
    // Prevent fetching others' data for now
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Fetch earnings rows (limit 1000 for now)
  const { data: rows, error } = await supabase
    .from('creator_earnings')
    .select('amount_gross, net_amount, created_at, currency')
    .eq('creator_id', creatorId)
    .order('created_at', { ascending: false })
    .limit(1000);

  if (error) {
    return NextResponse.json(
      { error: 'Failed to fetch earnings' },
      { status: 500 },
    );
  }

  // Aggregate totals & monthly breakdown
  let totalGross = 0;
  let totalNet = 0;
  const monthly: Record<string, { gross: number; net: number }> = {};

  for (const r of rows) {
    totalGross += r.amount_gross;
    totalNet += r.net_amount;
    const monthKey = new Date(r.created_at as string).toISOString().slice(0, 7);
    if (!monthly[monthKey]) {
      monthly[monthKey] = { gross: 0, net: 0 };
    }
    monthly[monthKey].gross += r.amount_gross;
    monthly[monthKey].net += r.net_amount;
  }

  return NextResponse.json({
    totalGross,
    totalNet,
    currency: rows[0]?.currency ?? 'usd',
    monthly: Object.entries(monthly).map(([month, data]) => ({
      month,
      gross: data.gross,
      net: data.net,
    })),
  });
}
