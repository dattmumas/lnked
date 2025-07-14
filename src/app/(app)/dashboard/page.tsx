import dynamicImport from 'next/dynamic';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import React from 'react';

import { Card } from '@/components/primitives/Card';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const revalidate = 300; // 5-minute ISR
export const dynamic = 'force-dynamic';

interface MonthlyDatum {
  month: string;
  gross: number;
  net: number;
  fee: number;
  followers: number;
  subscribers: number;
}

export default async function CreatorAnalyticsDashboard(): Promise<React.ReactElement> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    redirect('/sign-in?redirect=/dashboard');
  }

  const { data: earningsRows, error } = await supabase
    .from('creator_earnings')
    .select('amount_gross, net_amount, created_at, currency')
    .eq('creator_id', session.user.id)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error('Failed to load earnings');
  }

  let totalGross = 0;
  let totalNet = 0;
  let totalFees = 0;
  const monthlyMap: Record<
    string,
    {
      gross: number;
      net: number;
      fee: number;
      followers: number;
      subscribers: number;
    }
  > = {};

  earningsRows.forEach((r) => {
    totalGross += r.amount_gross;
    totalNet += r.net_amount;
    totalFees += r.amount_gross - r.net_amount;
    const monthKey = new Date(r.created_at as string).toISOString().slice(0, 7);
    monthlyMap[monthKey] ||= {
      gross: 0,
      net: 0,
      fee: 0,
      followers: 0,
      subscribers: 0,
    };
    monthlyMap[monthKey].gross += r.amount_gross;
    monthlyMap[monthKey].net += r.net_amount;
    monthlyMap[monthKey].fee += r.amount_gross - r.net_amount;
  });

  // Fetch followers created_at
  const { data: followerRows } = await supabase
    .from('follows')
    .select('created_at')
    .eq('following_id', session.user.id)
    .eq('following_type', 'user');

  followerRows?.forEach((f) => {
    const monthKey = new Date(f.created_at).toISOString().slice(0, 7);
    monthlyMap[monthKey] ||= {
      gross: 0,
      net: 0,
      fee: 0,
      followers: 0,
      subscribers: 0,
    };
    monthlyMap[monthKey].followers += 1;
  });

  // Fetch subscriptions created_at
  const { data: subRows } = await supabase
    .from('subscriptions')
    .select('created')
    .eq('target_entity_type', 'user')
    .eq('target_entity_id', session.user.id);

  subRows?.forEach((s) => {
    const monthKey = new Date(s.created).toISOString().slice(0, 7);
    monthlyMap[monthKey] ||= {
      gross: 0,
      net: 0,
      fee: 0,
      followers: 0,
      subscribers: 0,
    };
    monthlyMap[monthKey].subscribers += 1;
  });

  const monthly: MonthlyDatum[] = Object.entries(monthlyMap)
    .map(([month, v]) => ({
      month,
      gross: v.gross,
      net: v.net,
      fee: v.fee,
      followers: v.followers,
      subscribers: v.subscribers,
    }))
    .sort((a, b) => (a.month < b.month ? -1 : 1));

  const currency = earningsRows[0]?.currency?.toUpperCase() ?? 'USD';

  const EarningsChart = dynamicImport(
    () => import('@/components/charts/EarningsChart.client'),
  );

  // Fetch active subscriber count
  const { count: subscriberCount } = await supabase
    .from('subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('target_entity_type', 'user')
    .eq('target_entity_id', session.user.id)
    .in('status', ['active', 'trialing']);

  // Check for past_due subscriptions in grace period
  const { data: pastDueRow } = await supabase
    .from('subscriptions')
    .select('grace_period_expires_at')
    .eq('target_entity_type', 'user')
    .eq('target_entity_id', session.user.id)
    .eq('status', 'past_due')
    .gt('grace_period_expires_at', new Date().toISOString())
    .order('grace_period_expires_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  const graceDeadline = pastDueRow?.grace_period_expires_at ?? null;

  return (
    <div className="max-w-4xl mx-auto py-10 space-y-8">
      <h1 className="text-3xl font-semibold">Creator Dashboard</h1>

      {graceDeadline && (
        <div className="p-4 border border-destructive text-destructive rounded-md bg-destructive/10">
          <p className="font-medium">
            Payment failed – update your payment method before{' '}
            {new Date(graceDeadline).toLocaleDateString()} to avoid subscription
            cancellation.
          </p>
          <Link
            href="/settings/user/billing"
            className="underline text-destructive hover:text-destructive/80"
          >
            Manage Billing
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
        <Card className="p-6 flex flex-col gap-2">
          <span className="text-sm text-muted-foreground">Total Gross</span>
          <span className="text-2xl font-bold">
            {currency} {(totalGross / 100).toFixed(2)}
          </span>
        </Card>
        <Card className="p-6 flex flex-col gap-2">
          <span className="text-sm text-muted-foreground">Total Net</span>
          <span className="text-2xl font-bold">
            {currency} {(totalNet / 100).toFixed(2)}
          </span>
        </Card>
        <Card className="p-6 flex flex-col gap-2">
          <span className="text-sm text-muted-foreground">
            Active Subscribers
          </span>
          <span className="text-2xl font-bold">{subscriberCount ?? 0}</span>
        </Card>
        <Card className="p-6 flex flex-col gap-2">
          <span className="text-sm text-muted-foreground">Total Fees</span>
          <span className="text-2xl font-bold">
            {currency} {(totalFees / 100).toFixed(2)}
          </span>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-medium mb-4">Monthly Earnings</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground border-b">
              <th className="py-2">Month</th>
              <th className="py-2">Gross</th>
              <th className="py-2">Net</th>
              <th className="py-2">Fees</th>
            </tr>
          </thead>
          <tbody>
            {monthly.map((m) => (
              <tr key={m.month} className="border-b last:border-none">
                <td className="py-2">{m.month}</td>
                <td className="py-2">
                  {(m.gross / 100).toFixed(2)} {currency}
                </td>
                <td className="py-2">
                  {(m.net / 100).toFixed(2)} {currency}
                </td>
                <td className="py-2">
                  {(m.fee / 100).toFixed(2)} {currency}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Chart */}
      <Card className="p-6">
        <h2 className="text-lg font-medium mb-4">Earnings Trend</h2>
        <EarningsChart data={monthly} currency={currency} />
      </Card>
    </div>
  );
}
