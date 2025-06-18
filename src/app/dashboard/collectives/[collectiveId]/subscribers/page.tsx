import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Enums } from '@/lib/database.types';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

// Helper to map subscription status to badge variant
const getStatusBadgeVariant = (
  status: string,
  cancelAtPeriodEnd: boolean,
): 'default' | 'secondary' | 'destructive' | 'outline' => {
  if (status === 'active' && !cancelAtPeriodEnd) return 'default';
  if (status === 'trialing') return 'secondary';
  if (status === 'canceled' || cancelAtPeriodEnd) return 'destructive';
  return 'outline';
};

type Subscriber = { id: string; full_name: string | null };
type SubscriptionRow = {
  id: string;
  status: string;
  created: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  subscriber: Subscriber | null;
};

export default async function SubscribersPage({
  params,
}: {
  params: Promise<{ collectiveId: string }>;
}) {
  const { collectiveId } = await params;
  const supabase = createServerSupabaseClient();

  const {
    data: { user: currentUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !currentUser) {
    redirect('/sign-in');
  }

  // 1. Fetch collective details and verify ownership
  const { data: collective, error: collectiveError } = await supabase
    .from('collectives')
    .select('id, name, owner_id')
    .eq('id', collectiveId)
    .single();

  if (collectiveError || !collective) {
    console.error(
      `Error fetching collective ${collectiveId}:`,
      collectiveError?.message,
    );
    notFound();
  }

  if (collective.owner_id !== currentUser.id) {
    // Or show a more specific "access denied" page
    console.warn(
      `User ${currentUser.id} tried to access subscribers for collective ${collectiveId} they do not own.`,
    );
    notFound();
  }

  // 2. Fetch subscribers to this collective
  const { data: subscriptions, error: subsError } = await supabase
    .from('subscriptions')
    .select(
      `
      id,
      status,
      created,
      current_period_end,
      cancel_at_period_end,
      subscriber:users!user_id(id, full_name) 
    `,
    )
    .eq('target_entity_type', 'collective' as Enums<'subscription_target_type'>)
    .eq('target_entity_id', collective.id)
    .order('created', { ascending: false });

  if (subsError) {
    console.error(
      `Error fetching subscribers for collective ${collective.id}:`,
      subsError.message,
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">
          Subscribers for {collective.name}
        </h1>
        <p className="text-muted-foreground">
          Users subscribed to this collective.
        </p>
      </header>

      {(!subscriptions || subscriptions.length === 0) && (
        <div className="p-6 border rounded-lg bg-card text-card-foreground shadow-sm text-center">
          <p className="text-muted-foreground">
            This collective currently has no subscribers.
          </p>
        </div>
      )}

      {subscriptions && subscriptions.length > 0 && (
        <Table>
          <TableCaption>
            A list of subscribers for {collective.name}.
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[250px]">Subscriber Name</TableHead>
              {/* <TableHead>Email</TableHead> */}
              <TableHead>Status</TableHead>
              <TableHead>Subscribed On</TableHead>
              <TableHead className="text-right">Current Period End</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subscriptions.map((sub: SubscriptionRow) => {
              const {subscriber} = sub;
              return (
                <TableRow key={sub.id}>
                  <TableCell className="font-medium">
                    {subscriber?.full_name || 'N/A'}
                  </TableCell>
                  {/* <TableCell>{(subscriber as any)?.email || 'N/A'}</TableCell> */}
                  <TableCell>
                    <Badge
                      variant={getStatusBadgeVariant(
                        sub.status,
                        sub.cancel_at_period_end,
                      )}
                      className="capitalize"
                    >
                      {sub.status}
                    </Badge>
                    {sub.cancel_at_period_end && sub.status === 'active' && (
                      <span className="text-xs text-muted-foreground ml-1">
                        (ends {formatDate(sub.current_period_end)})
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{formatDate(sub.created)}</TableCell>
                  <TableCell className="text-right">
                    {formatDate(sub.current_period_end)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
      <div className="mt-8">
        <Button variant="outline" asChild>
          <Link href="/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
