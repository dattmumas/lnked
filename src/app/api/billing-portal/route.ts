import { NextResponse } from 'next/server';

import { getStripe } from '@/lib/stripe';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: 'Stripe not configured' },
      { status: 500 },
    );
  }

  // Retrieve Stripe customer ID
  const { data: customerRow } = await supabaseAdmin
    .from('customers')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .maybeSingle();

  const stripeCustomerId = customerRow?.stripe_customer_id;
  if (!stripeCustomerId) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  }

  const baseUrlEnv = process.env['NEXT_PUBLIC_SITE_URL'];
  // Validate env URL – must include scheme
  const baseUrl =
    typeof baseUrlEnv === 'string' && /^https?:\/\//.test(baseUrlEnv)
      ? baseUrlEnv.replace(/\/$/, '')
      : new URL(req.url).origin; // fallback to request origin

  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${baseUrl}/settings/user/billing`,
  });

  return NextResponse.json({ url: session.url });
}
