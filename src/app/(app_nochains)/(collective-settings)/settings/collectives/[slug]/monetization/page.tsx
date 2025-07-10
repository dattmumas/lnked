import { Suspense } from 'react';

import { getCollectiveStripeStatus } from '@/app/actions/collectiveActions';
import { createServerSupabaseClient } from '@/lib/supabase/server';

import { MonetizationSettingsClient } from './MonetizationSettingsClient';

import type { Database } from '@/lib/database.types';

function MonetizationSkeleton() {
  return <div>Loading monetization settings...</div>;
}

export default async function MonetizationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: collective } = await supabase
    .from('collectives')
    .select('id')
    .eq('slug', slug)
    .single();

  if (!collective) {
    return <div>Collective not found.</div>;
  }

  const stripeStatus = await getCollectiveStripeStatus(collective.id);

  // Fetch subscription price tiers associated with this collective
  // 1. Find all Stripe products linked to the collective
  const { data: products } = await supabase
    .from('products')
    .select('id')
    .eq('collective_id', collective.id);

  let initialPrices: Database['public']['Tables']['prices']['Row'][] = [];

  if (products && products.length > 0) {
    const productIds = products.map((p) => p.id);
    const { data: prices } = await supabase
      .from('prices')
      .select('*')
      .in('product_id', productIds)
      .order('unit_amount', { ascending: true });

    if (prices) {
      initialPrices = prices;
    }
  }

  // Fetch members for revenue sharing
  const { data: members } = await supabase
    .from('collective_members')
    .select('*, users(*)')
    .eq('collective_id', collective.id);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Monetization</h1>
      <Suspense fallback={<MonetizationSkeleton />}>
        <MonetizationSettingsClient
          collectiveId={collective.id}
          stripeStatus={stripeStatus}
          initialPrices={initialPrices}
          members={members || []}
        />
      </Suspense>
    </div>
  );
}
