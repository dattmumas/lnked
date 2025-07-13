'use server';

import { getStripe } from '@/lib/stripe';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

import type Stripe from 'stripe';

interface ActionError {
  error: string;
}

interface SetupIntentSuccess {
  clientSecret: string;
}

/**
 * Create a Stripe SetupIntent for the current authenticated user. The
 * client-secret is returned so the front-end can collect card details via
 * Stripe Elements.
 */
export async function createSetupIntent(): Promise<
  SetupIntentSuccess | ActionError
> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'User not authenticated.' };
  }

  const stripe = getStripe();
  if (!stripe) {
    return { error: 'Stripe is not configured.' };
  }

  // 1. Determine Stripe customer ID.
  let stripeCustomerId: string | undefined = (
    user as unknown as { stripe_customer_id?: string }
  ).stripe_customer_id;

  if (!stripeCustomerId) {
    // Check customers table
    const { data: customerRow } = await supabaseAdmin
      .from('customers')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .maybeSingle();

    stripeCustomerId = customerRow?.stripe_customer_id;
  }

  if (!stripeCustomerId) {
    // Create new Customer in Stripe
    const customer = await stripe.customers.create({
      email: user.email as string, // Stripe typings require string
      metadata: { supabaseUserId: user.id },
    });

    stripeCustomerId = customer.id;

    // Persist mapping (users table & customers mapping table)
    await supabaseAdmin
      .from('customers')
      .upsert(
        { id: user.id, stripe_customer_id: stripeCustomerId },
        { onConflict: 'id' },
      );

    // Optional: store on users table for convenience
    await supabaseAdmin
      .from('users')
      .update({ stripe_customer_id: stripeCustomerId })
      .eq('id', user.id);
  }

  // 2. Create the SetupIntent
  const setupIntent = await stripe.setupIntents.create({
    customer: stripeCustomerId,
    usage: 'off_session',
    payment_method_types: ['card'],
  });

  return { clientSecret: setupIntent.client_secret as string };
}

/**
 * After confirming the SetupIntent on the client side, call this action to
 * attach the new payment method to the customer and set it as default.
 */
export async function setDefaultPaymentMethod(
  paymentMethodId: string,
): Promise<{ success: true } | ActionError> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'User not authenticated.' };

  const stripe = getStripe();
  if (!stripe) return { error: 'Stripe is not configured.' };

  // Load Stripe customer
  const { data: customerRow } = await supabaseAdmin
    .from('customers')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .maybeSingle();

  const stripeCustomerId = customerRow?.stripe_customer_id;
  if (!stripeCustomerId) return { error: 'Stripe customer not found.' };

  // Attach PM to customer (if not already) and set as default
  await stripe.paymentMethods.attach(paymentMethodId, {
    customer: stripeCustomerId,
  });
  await stripe.customers.update(stripeCustomerId, {
    invoice_settings: { default_payment_method: paymentMethodId },
  });

  return { success: true };
}

/**
 * Detach a payment method from the authenticated user and clear default if matches.
 */
export async function deletePaymentMethod(
  paymentMethodId: string,
): Promise<{ success: true } | ActionError> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'User not authenticated.' };

  const stripe = getStripe();
  if (!stripe) return { error: 'Stripe is not configured.' };

  const { data: customerRow } = await supabaseAdmin
    .from('customers')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .maybeSingle();

  const stripeCustomerId = customerRow?.stripe_customer_id;
  if (!stripeCustomerId) return { error: 'Stripe customer not found.' };

  try {
    // Verify ownership before detach
    const pm = (await stripe.paymentMethods.retrieve(
      paymentMethodId,
    )) as Stripe.PaymentMethod;

    if (pm.customer !== stripeCustomerId) {
      return { error: 'Payment method does not belong to current customer.' };
    }

    await stripe.paymentMethods.detach(paymentMethodId);

    return { success: true };
  } catch (err) {
    return { error: (err as Error).message };
  }
}
