import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { HttpStatusCode } from '@/lib/constants/errors';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const QuerySchema = z.object({ targetId: z.string().uuid() });

export async function GET(req: NextRequest): Promise<NextResponse> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthenticated' },
      { status: HttpStatusCode.Unauthorized },
    );
  }

  const qs = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parse = QuerySchema.safeParse(qs);
  if (!parse.success) {
    return NextResponse.json(
      { error: 'targetId required' },
      { status: HttpStatusCode.BadRequest },
    );
  }

  const { targetId } = parse.data;

  const { data, error } = await supabase
    .from('subscriptions')
    .select('id, stripe_price_id')
    .eq('user_id', user.id)
    .eq('target_entity_type', 'user')
    .eq('target_entity_id', targetId)
    .eq('status', 'active')
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: HttpStatusCode.InternalServerError },
    );
  }

  return NextResponse.json({
    subscribed: Boolean(data),
    subscriptionId: data?.id ?? null,
    stripePriceId: data?.stripe_price_id ?? null,
  });
}
