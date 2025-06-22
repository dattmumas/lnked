import { Plus } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import React from 'react';

import DashboardCollectiveCard from '@/components/app/dashboard/collectives/DashboardCollectiveCard';
import { Button } from '@/components/ui/button';
import { Database } from '@/lib/database.types';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// Extend CollectiveRow for owned collectives to include subscriber count
type OwnedCollectiveWithStats =
  Database['public']['Tables']['collectives']['Row'] & {
    subscriptions: { count: number }[] | null; // Supabase returns count as an array
  };

type Membership = {
  id: string;
  role: string;
  collective: Database['public']['Tables']['collectives']['Row'] | null;
};

export default async function MyCollectivesPage(): Promise<React.ReactElement> {
  const supabase = createServerSupabaseClient();

  const {
    data: { session },
    error: authErrorSession,
  } = await supabase.auth.getSession();

  if (
    authErrorSession !== null ||
    session === null ||
    session === undefined ||
    session.user === null ||
    session.user === undefined
  ) {
    redirect('/sign-in');
  }

  const userId = session.user.id;

  // 1. Fetch collectives OWNED by the user, including active subscriber count
  const { data: ownedCollectivesData, error: ownedError } = await supabase
    .from('collectives')
    .select('id, name, slug, description, subscriptions(count)') // Assuming RLS allows count on subscriptions or it's a public view/join
    // Ideally, filter subscriptions by status='active' here if possible with Supabase syntax,
    // e.g., subscriptions!inner(count, status.eq.active). Or filter post-fetch.
    // For now, fetching all subscriptions and assuming we might filter or that count implies active.
    .eq('owner_id', userId)
    .order('name', { ascending: true });

  const ownedCollectives = ownedCollectivesData as
    | OwnedCollectiveWithStats[]
    | null;

  if (ownedError) {
    console.error('Error fetching owned collectives:', ownedError.message);
    // Handle error appropriately
  }

  // Fetch subscription price (e.g., from env or DB). For now, assume a fixed price in cents.

  // 2. Fetch collectives JOINED by the user (where they are a member but not owner)
  const { data: memberships } = (await supabase
    .from('collective_members')
    .select('id, role, collective:collectives!collective_id(*)')
    .eq('user_id', userId)) as { data: Membership[] | null };

  const eligibleMemberships = (memberships ?? []).filter(
    (member) =>
      member.collective !== null &&
      member.collective !== undefined &&
      member.collective.owner_id !== userId,
  );

  const hasCollectives =
    (ownedCollectives !== null &&
      ownedCollectives !== undefined &&
      ownedCollectives.length > 0) ||
    (eligibleMemberships !== null &&
      eligibleMemberships !== undefined &&
      eligibleMemberships.length > 0);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
        <h1 className="text-2xl font-serif font-semibold">My Collectives</h1>
        <Button asChild size="sm" className="w-full md:w-auto">
          <Link href="/collectives/new">
            <Plus className="h-4 w-4 mr-2" /> Create New Collective
          </Link>
        </Button>
      </div>

      {!hasCollectives && (
        <div className="text-center py-10 border border-dashed rounded-lg">
          <h2 className="text-xl font-semibold mb-2">No Collectives Yet</h2>
          <p className="text-muted-foreground mb-4">
            You haven&apos;t created or joined any collectives.
          </p>
          <Button asChild>
            <Link href="/collectives/new">Create Your First Collective</Link>
          </Button>
          <p className="text-sm text-muted-foreground mt-4">
            Or{' '}
            <Link href="/discover" className="underline hover:text-accent">
              explore collectives
            </Link>{' '}
            to join.
          </p>
        </div>
      )}

      {ownedCollectives !== null &&
        ownedCollectives !== undefined &&
        ownedCollectives.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold mb-4">Collectives I Own</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {ownedCollectives.map((collective: OwnedCollectiveWithStats) => {
                const subscriberCount =
                  (collective.subscriptions?.[0]?.count ?? 0) > 0
                    ? (collective.subscriptions?.[0]?.count ?? 0)
                    : 0;
                // Note: This assumes all subscriptions are active. For accuracy, filter by status='active'.
                // If subscriptions is null or empty array, count is 0.
                return (
                  <DashboardCollectiveCard
                    key={collective.id}
                    collective={collective}
                    userRole="owner"
                    subscriberCount={subscriberCount}
                  />
                );
              })}
            </div>
          </section>
        )}

      {eligibleMemberships !== null &&
        eligibleMemberships !== undefined &&
        eligibleMemberships.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold mb-4">
              Collectives I Contribute To
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {eligibleMemberships.map((membership: Membership) =>
                membership.collective !== null &&
                membership.collective !== undefined ? (
                  <DashboardCollectiveCard
                    key={membership.id}
                    collective={membership.collective}
                    userRole={
                      membership.role as 'admin' | 'editor' | 'author' | 'owner'
                    }
                    memberId={membership.id}
                  />
                ) : undefined,
              )}
            </div>
          </section>
        )}
    </div>
  );
}
