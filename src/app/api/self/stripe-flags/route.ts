import { NextResponse } from 'next/server';

import { HttpStatusCode } from '@/lib/constants/errors';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(): Promise<NextResponse> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: HttpStatusCode.Unauthorized },
    );
  }

  const { data, error } = await supabase
    .from('users')
    .select('stripe_account_id, stripe_charges_enabled, stripe_payouts_enabled')
    .eq('id', user.id)
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: HttpStatusCode.InternalServerError },
    );
  }

  return NextResponse.json({
    stripe_account_id: data?.stripe_account_id,
    stripe_charges_enabled: data?.stripe_charges_enabled,
    stripe_payouts_enabled: data?.stripe_payouts_enabled,
  });
}
