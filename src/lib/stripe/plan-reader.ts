import { getStripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

import type { Database, Json } from '@/lib/database.types';
import type Stripe from 'stripe';

export interface ResolvedPlan {
  id: string;
  stripe_price_id: string;
  price: Stripe.Price | null;
  benefits: Json | null;
  active: boolean | null;
  owner_id: string;
  owner_type: Database['public']['Enums']['subscription_target_type'];
}

/**
 * Fetch subscription plans for a given owner (user or collective) and hydrate
 * each plan with the live Stripe.Price object. If the Stripe call fails (e.g.
 * price deleted) the function falls back to the cached `price_snapshot` so
 * consumers still get amount / currency information.
 */
export async function fetchPlansForOwner(
  ownerType: Database['public']['Enums']['subscription_target_type'],
  ownerId: string,
): Promise<ResolvedPlan[]> {
  const { data: rows, error } = await supabaseAdmin
    .from('subscription_plans')
    .select(
      'id, stripe_price_id, price_snapshot, benefits, active, owner_id, owner_type',
    )
    .eq('owner_type', ownerType)
    .eq('owner_id', ownerId)
    .eq('active', true);

  if (error !== null) {
    console.error('[plan-reader] Failed to query subscription_plans', error);
    return [];
  }

  if (!rows || rows.length === 0) return [];

  const stripe = getStripe();
  if (!stripe) {
    console.warn('[plan-reader] Stripe not configured – using snapshots only');
    return rows.map((r) => {
      const snapshot: Stripe.Price | null = r.price_snapshot
        ? (r.price_snapshot as unknown as Stripe.Price)
        : null;
      return {
        id: r.id,
        stripe_price_id: r.stripe_price_id,
        price: snapshot,
        benefits: r.benefits,
        active: r.active,
        owner_id: r.owner_id,
        owner_type: r.owner_type,
      };
    }) as ResolvedPlan[];
  }

  // Retrieve prices in parallel – Stripe SDK lacks batch get so we do Promise.all
  const prices = await Promise.all(
    rows.map(async (r) => {
      try {
        const price = await stripe.prices.retrieve(r.stripe_price_id);
        return price as Stripe.Price;
      } catch (err) {
        console.warn('[plan-reader] Price retrieve failed – using snapshot', {
          priceId: r.stripe_price_id,
          err,
        });
        return r.price_snapshot
          ? (r.price_snapshot as unknown as Stripe.Price)
          : null;
      }
    }),
  );

  return rows.map((r, idx) => ({
    id: r.id,
    stripe_price_id: r.stripe_price_id,
    price: prices[idx],
    benefits: r.benefits,
    active: r.active,
    owner_id: r.owner_id,
    owner_type: r.owner_type,
  })) as ResolvedPlan[];
}
