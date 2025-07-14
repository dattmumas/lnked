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

  // Fetch aggregated monthly earnings from accounting view
  interface EarningsRow {
    month: string;
    gross_cents: number;
    net_cents: number;
    currency: string;
  }

  const { data: rawRows, error } = await supabase
    .from('accounting.v_monthly_creator_earnings' as unknown as never)
    .select('month, gross_cents, net_cents, currency')
    .eq('creator_id', creatorId)
    .order('month', { ascending: false });

  const rows: EarningsRow[] = (rawRows ?? []) as EarningsRow[];

  if (error) {
    return NextResponse.json(
      { error: 'Failed to fetch earnings' },
      { status: 500 },
    );
  }

  // Aggregate totals from view rows
  const totals = rows.reduce(
    (acc, r) => {
      acc.gross += r.gross_cents;
      acc.net += r.net_cents;
      return acc;
    },
    { gross: 0, net: 0 },
  );

  return NextResponse.json({
    totalGross: totals.gross,
    totalNet: totals.net,
    currency: rows[0]?.currency ?? 'usd',
    monthly: rows.map((r) => ({
      month: r.month,
      gross: r.gross_cents,
      net: r.net_cents,
    })),
  });
}
