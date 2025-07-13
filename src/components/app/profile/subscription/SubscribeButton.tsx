'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

type Plan = {
  id: string;
  name: string;
  monthlyCost: number;
  stripe_price_id: string;
};

export default function SubscribeButton({
  targetUserId,
  targetName,
}: {
  targetUserId: string;
  targetName?: string;
}): React.JSX.Element | null {
  const router = useRouter();
  const statusQuery = useQuery({
    queryKey: ['subscriptionStatus', targetUserId],
    queryFn: async () => {
      const res = await fetch(
        `/api/subscription-status?targetId=${targetUserId}`,
      );
      return (await res.json()) as {
        subscribed: boolean;
        stripePriceId: string | null;
      };
    },
  });

  const plansQuery = useQuery({
    queryKey: ['plans', targetUserId],
    queryFn: async () => {
      const res = await fetch(`/api/plans/${targetUserId}`);
      if (!res.ok) throw new Error('Failed to fetch plans');
      const json = (await res.json()) as { plans?: Plan[]; error?: string };
      if (json.error) throw new Error(json.error);
      return json.plans ?? [];
    },
  });

  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const subscribed = statusQuery.data?.subscribed ?? false;
  const plans = plansQuery.data ?? [];

  const startCheckout = async (priceId: string): Promise<void> => {
    try {
      setLoading(true);
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        body: JSON.stringify({
          priceId,
          targetEntityType: 'user',
          targetEntityId: targetUserId,
          redirectPath: window.location.pathname,
        }),
      });
      const json: { url?: string; subscriptionId?: string; error?: string } =
        await res.json();

      if (json.url) {
        router.push(json.url);
      } else if (json.subscriptionId) {
        toast.success('Subscribed!');
        router.refresh();
      } else {
        toast.error(json.error ?? 'Failed to initiate checkout');
        setLoading(false);
      }
    } catch (err: unknown) {
      toast.error('Subscription failed');
      setLoading(false);
    }
  };

  const handleSubscribe = (): void => {
    if (plans.length === 0) {
      toast.error('Creator has no active plans');
      return;
    }
    setOpen(true);
  };

  if (subscribed) {
    return (
      <Button
        variant="secondary"
        onClick={() => router.push('/settings/user/billing')}
      >
        Manage Subscription
      </Button>
    );
  }

  // Button label logic – always show "Subscribe" until a specific plan is chosen
  const priceLabel = 'Subscribe';

  // Determine UI states
  if (statusQuery.isLoading || plansQuery.isLoading) {
    return (
      <Button disabled variant="secondary">
        Loading…
      </Button>
    );
  }

  if (plansQuery.isError) {
    return (
      <Button
        variant="secondary"
        onClick={() => toast.error('Unable to load subscription plans')}
      >
        Subscribe
      </Button>
    );
  }

  // When no plans available
  if (plans.length === 0) {
    return (
      <Button
        variant="secondary"
        onClick={() => toast.error('Creator has no active plans yet')}
      >
        Subscribe
      </Button>
    );
  }

  return (
    <>
      <Button disabled={loading} onClick={handleSubscribe} variant="secondary">
        {loading ? 'Redirecting…' : priceLabel}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl rounded-2xl shadow-xl bg-white dark:bg-zinc-900 backdrop-blur supports-[backdrop-filter]:bg-white/70 dark:supports-[backdrop-filter]:bg-zinc-900/80 p-6 sm:p-8">
          <DialogHeader>
            <DialogTitle>Subscribe to {targetName ?? 'creator'}</DialogTitle>
            <DialogDescription>
              Choose a plan to support this creator and access subscriber-only
              benefits.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2 py-2 divide-y divide-border">
            {plans.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between p-4 first:rounded-t-lg last:rounded-b-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex flex-col">
                  <span className="font-medium">{p.name}</span>
                  <span className="text-sm text-muted-foreground">
                    ${Number(p.monthlyCost).toFixed(2)}/month
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="default"
                  disabled={loading}
                  onClick={() => {
                    setOpen(false);
                    void startCheckout(p.stripe_price_id);
                  }}
                >
                  {loading ? 'Loading…' : 'Select'}
                </Button>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
