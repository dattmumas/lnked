'use server';

import Stripe from 'stripe';
import { z } from 'zod';

import { getStripe } from '@/lib/stripe';
import { fetchPlansForOwner } from '@/lib/stripe/plan-reader';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getOrCreateExpressAccount } from '@/services/stripe/userOnboarding';

import type { Json } from '@/lib/database.types';

// Schema for validating incoming payload
const createPlanSchema = z.object({
  name: z.string().min(1).max(100),
  monthlyCost: z.number().positive().max(10_000), // USD dollars
  benefits: z.record(z.any()).optional(),
});

export type CreatePlanInput = z.infer<typeof createPlanSchema>;

interface ActionError {
  error: string;
}

interface CreatePlanSuccess {
  id: string;
  stripePriceId: string;
}

/**
 * Create a personal subscription plan for the authenticated user.
 *
 * Workflow:
 * 1. Ensure the user is authenticated.
 * 2. Ensure/obtain a Stripe Express account for the user (Connect).
 * 3. Create a Product + Price in the user's connected account.
 * 4. Persist the plan to `subscription_plans` (owner_type = 'user').
 */
export async function createPersonalSubscriptionPlan(
  rawInput: CreatePlanInput,
): Promise<CreatePlanSuccess | ActionError> {
  // Validate input
  const parseResult = createPlanSchema.safeParse(rawInput);
  if (!parseResult.success) {
    return { error: parseResult.error.message };
  }
  const { name, monthlyCost, benefits } = parseResult.data;

  // 1. Authenticated user check
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'User not authenticated.' };

  // Ensure Stripe payouts are enabled before allowing plan creation
  const { data: creatorFlags } = await supabaseAdmin
    .from('users')
    .select('stripe_account_id, stripe_charges_enabled, stripe_payouts_enabled')
    .eq('id', user.id)
    .single();

  const payoutReady =
    creatorFlags?.stripe_account_id &&
    creatorFlags.stripe_charges_enabled &&
    creatorFlags.stripe_payouts_enabled;

  if (!payoutReady) {
    return {
      error: 'Connect Stripe and finish onboarding before creating plans.',
    };
  }

  // 2. Stripe init
  const stripe = getStripe();
  if (!stripe) return { error: 'Stripe is not configured.' };

  // 3. Ensure Stripe account for the user (Connect Express)
  const connectedAccountId = await getOrCreateExpressAccount(user.id);

  // 4. Create Product in connected account
  let productId: string;
  try {
    const product = await stripe.products.create(
      { name },
      { stripeAccount: connectedAccountId },
    );
    productId = product.id;
  } catch (err) {
    return {
      error: `Stripe product creation failed: ${(err as Error).message}`,
    };
  }

  // 5. Create Price (recurring monthly)
  let price: Stripe.Price;
  try {
    price = await stripe.prices.create(
      {
        product: productId,
        currency: 'usd',
        unit_amount: Math.round(monthlyCost * 100), // cents
        recurring: { interval: 'month', interval_count: 1 },
      },
      { stripeAccount: connectedAccountId },
    );
  } catch (err) {
    return { error: `Stripe price creation failed: ${(err as Error).message}` };
  }

  const { error: insertErr, data: insertedRow } = await supabaseAdmin
    .from('subscription_plans')
    .insert({
      owner_type: 'user',
      owner_id: user.id,
      stripe_price_id: price.id,
      benefits: benefits ?? {},
      active: true,
      price_snapshot: price as unknown as Json,
    })
    .select('id')
    .single();

  if (insertErr) {
    return {
      error: `Failed to persist subscription plan: ${insertErr.message}`,
    };
  }

  return { id: insertedRow.id, stripePriceId: price.id };
}

// -----------------------------------------------------------------------------
// Fetch existing personal plans for authenticated user
// -----------------------------------------------------------------------------
export async function listPersonalSubscriptionPlans(): Promise<
  | {
      plans: Array<{
        id: string;
        name: string;
        monthlyCost: number;
        active: boolean;
      }>;
    }
  | ActionError
> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'User not authenticated.' };

  const resolved = await fetchPlansForOwner('user', user.id);

  return {
    plans: resolved.map((p) => {
      const amountCents = p.price?.unit_amount ?? 0;
      const name =
        typeof p.price?.product === 'object' && p.price?.product
          ? ((p.price.product as { name?: string }).name ?? 'Plan')
          : 'Plan';

      return {
        id: p.id,
        active: p.active ?? true,
        name,
        monthlyCost: amountCents / 100,
      };
    }),
  };
}
