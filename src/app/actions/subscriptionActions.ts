'use server';

import { revalidatePath } from 'next/cache';

import { getStripe } from '@/lib/stripe';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

import type { Database, Json } from '@/lib/database.types';
import type Stripe from 'stripe';

// Type aliases for cleaner code
type SubscriptionStatus = Database['public']['Enums']['subscription_status'];
type SubscriptionTargetType =
  Database['public']['Enums']['subscription_target_type'];

interface SubscriptionStatusResult {
  isSubscribed: boolean;
  dbSubscriptionId?: string; // id from your subscriptions table (which is stripe_subscription_id)
  status?: SubscriptionStatus | null;
  cancelAtPeriodEnd?: boolean | null;
  currentPeriodEnd?: string | null;
}

export async function getSubscriptionStatus(
  targetEntityType: SubscriptionTargetType,
  targetEntityId: string,
): Promise<SubscriptionStatusResult | undefined> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { isSubscribed: false };

  const { data: subscription, error } = await supabase
    .from('subscriptions')
    // Select only existing columns: id (is stripe_subscription_id), status, cancel_at_period_end, current_period_end
    .select('id, status, cancel_at_period_end, current_period_end')
    .eq('user_id', user.id)
    .eq('target_entity_type', targetEntityType)
    .eq('target_entity_id', targetEntityId)
    .in('status', ['active', 'trialing', 'past_due'])
    .maybeSingle();

  if (error) {
    console.error('Error fetching subscription status:', error.message);
    return undefined;
  }

  if (subscription) {
    return {
      isSubscribed: true,
      dbSubscriptionId: subscription.id, // id from table is the Stripe Subscription ID
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      ...(subscription.current_period_end
        ? {
            currentPeriodEnd: new Date(
              subscription.current_period_end,
            ).toLocaleDateString(),
          }
        : {}),
    };
  }
  return { isSubscribed: false };
}

interface UnsubscribeResult {
  success: boolean;
  message?: string;
}

export async function unsubscribeFromEntity(
  dbSubscriptionId: string, // ID from your public.subscriptions table
  stripeSubscriptionId: string,
): Promise<UnsubscribeResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user)
    return { success: false, message: 'User not authenticated.' };

  // Verify user owns this DB subscription record before proceeding
  const { data: subRecord, error: subFetchError } = await supabase
    .from('subscriptions')
    .select('id, user_id, target_entity_type, target_entity_id')
    .eq('id', dbSubscriptionId)
    .eq('user_id', user.id)
    .single();

  if (subFetchError || subRecord === null) {
    console.error(
      'Error fetching subscription for unsubscribe or permission denied:',
      subFetchError?.message,
    );
    return {
      success: false,
      message: 'Subscription not found or permission denied.',
    };
  }

  try {
    // Option 1: Cancel at period end (recommended)
    const stripe = getStripe();
    if (stripe === null) throw new Error('Stripe SDK not initialized');
    const updatedStripeSubscription = await stripe!.subscriptions.update(
      stripeSubscriptionId,
      {
        cancel_at_period_end: true,
      },
    );
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        'Stripe subscription set to cancel at period end:',
        updatedStripeSubscription.id,
      );
    }

    // Option 2: Delete immediately (more destructive)
    // await getStripe().subscriptions.del(stripeSubscriptionId);
    // console.log('Stripe subscription deleted immediately:', stripeSubscriptionId);

    // Webhooks should handle the DB update. For immediate UI feedback, client can update optimistically.
    // Or, you could update the local DB status here, but be mindful of race conditions with webhooks.
    // For now, rely on webhook for DB state.

    // Revalidate paths related to this subscription or user's content access
    if (subRecord.target_entity_type === 'collective') {
      // Need collective slug for path revalidation - this action doesn't have it.
      // This makes revalidation tricky from a generic action. Client might need to trigger specific revalidations.
      // Or, revalidate a broader path like the user's feed or dashboard.
      // For now, let's skip specific collective page revalidation from here.
    }
    revalidatePath('/'); // Revalidate home feed
    revalidatePath('/dashboard'); // Revalidate dashboard

    return {
      success: true,
      message: 'Subscription set to cancel at period end.',
    };
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown Stripe error';
    console.error('Stripe unsubscribe error:', errorMessage, error);
    return {
      success: false,
      message: `Failed to unsubscribe: ${errorMessage}`,
    };
  }
}

interface TierResult {
  success: boolean;
  error?: string;
}

export async function createPriceTier({
  collectiveId,
  amount,
  interval,
  tierName,
}: {
  collectiveId: string;
  amount: number;
  interval: 'month' | 'year';
  tierName?: string;
}): Promise<TierResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'User not authenticated.' };
  }

  const { data: collective, error: collError } = await supabase
    .from('collectives')
    .select('owner_id')
    .eq('id', collectiveId)
    .single();

  if (collError || collective === null) {
    return { success: false, error: 'Collective not found.' };
  }
  if (collective.owner_id !== user.id) {
    return { success: false, error: 'Only the owner can manage tiers.' };
  }

  // after verifying owner, fetch creator's stripe account id
  const { stripe_account_id: stripeAccountId } = user as unknown as {
    stripe_account_id?: string | null;
  };

  if (!stripeAccountId) {
    return {
      success: false,
      error: 'Stripe account not connected. Please complete onboarding.',
    };
  }

  const stripe = getStripe();
  if (!stripe) {
    return { success: false, error: 'Stripe not configured.' };
  }

  // Create a recurring price within the creator's connected account. We can
  // use product_data directly so we don't have to manage a separate Product
  // object in our DB.
  let createdPrice: Stripe.Price;
  try {
    createdPrice = await stripe.prices.create(
      {
        unit_amount: amount,
        currency: 'usd',
        recurring: { interval },
        product_data: {
          name:
            tierName && tierName.trim().length > 0
              ? tierName.trim()
              : 'Subscription',
          metadata: { collectiveId },
        },
        metadata: { collectiveId },
      },
      {
        stripeAccount: stripeAccountId,
      },
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Stripe price creation failed';
    console.error('[createPriceTier] Stripe error:', err);
    return { success: false, error: message };
  }

  // Persist to subscription_plans (lean schema)
  const { error: insertErr } = await supabaseAdmin
    .from('subscription_plans')
    .insert({
      owner_id: collectiveId,
      owner_type: 'collective',
      collective_id: collectiveId,
      stripe_price_id: createdPrice.id,
      price_snapshot: createdPrice as unknown as Json,
      active: true,
      benefits: null,
    });

  if (insertErr) {
    console.error('Failed to insert subscription_plan:', insertErr);
    return { success: false, error: 'Failed to save plan.' };
  }

  revalidatePath(`/dashboard/collectives/${collectiveId}/settings`);
  return { success: true };
}

export async function deactivatePriceTier({
  collectiveId,
  priceId,
}: {
  collectiveId: string;
  priceId: string;
}): Promise<TierResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'User not authenticated.' };
  }

  const { data: collective } = await supabase
    .from('collectives')
    .select('owner_id')
    .eq('id', collectiveId)
    .single();
  if (!collective || collective.owner_id !== user.id) {
    return { success: false, error: 'Only the owner can manage tiers.' };
  }

  const stripe = getStripe();
  if (!stripe) return { success: false, error: 'Stripe not configured.' };

  const { stripe_account_id: stripeAccountId } = user as unknown as {
    stripe_account_id?: string | null;
  };

  if (!stripeAccountId) {
    return {
      success: false,
      error: 'Stripe account not connected.',
    };
  }

  // Deactivate on Stripe (creator account context not needed for platform-side
  // price clones – we only store creator price IDs here)
  try {
    await stripe.prices.update(
      priceId,
      { active: false },
      { stripeAccount: stripeAccountId },
    );
  } catch (err) {
    console.error('Stripe deactivate price error:', err);
  }

  // Mark plan inactive in DB
  await supabaseAdmin
    .from('subscription_plans')
    .update({ active: false })
    .eq('stripe_price_id', priceId)
    .eq('owner_id', collectiveId);

  revalidatePath(`/dashboard/collectives/${collectiveId}/settings`);
  return { success: true };
}
