'use client';

import { MoreHorizontal, Loader2, AlertCircle } from 'lucide-react';
import { useState, useTransition } from 'react';

import { unsubscribeFromEntity } from '@/app/actions/subscriptionActions';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface SubscriptionInfo {
  dbId: string;
  stripeSubscriptionId: string;
  creatorName: string;
  planName: string;
  amount: number | null;
  currency: string | null;
  interval: string | null;
  renewalDate: string;
  targetEntityType: 'user' | 'collective';
  targetEntityId: string;
}

interface Props {
  subscriptions: SubscriptionInfo[];
}

export default function ActiveSubscriptionsClient({ subscriptions }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const selected = subscriptions.find((s) => s.dbId === openId);

  const handleCancel = () => {
    if (!selected) return;
    startTransition(async () => {
      const res = await unsubscribeFromEntity(
        selected.dbId,
        selected.stripeSubscriptionId,
      );
      if (!res.success) {
        setError(res.message ?? 'Failed to cancel subscription');
      } else {
        // Optimistically remove from list
        setOpenId(null);
        window.location.reload();
      }
    });
  };

  if (subscriptions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No active subscriptions</p>
    );
  }

  return (
    <>
      <ul className="divide-y border rounded-lg">
        {subscriptions.map((sub) => (
          <li
            key={sub.dbId}
            className="flex items-center justify-between p-3 hover:bg-accent/50 transition"
          >
            <div className="space-y-0.5">
              <p className="font-medium leading-none">{sub.creatorName}</p>
              <p className="text-sm text-muted-foreground">
                {sub.planName} • {sub.interval}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium whitespace-nowrap">
                {sub.amount != null && sub.amount > 0
                  ? `${(sub.amount / 100).toFixed(2)} ${sub.currency?.toUpperCase()}`
                  : 'Free'}
              </span>
              <span className="text-sm text-muted-foreground whitespace-nowrap hidden sm:inline-block">
                Renews {sub.renewalDate}
              </span>
              <button
                type="button"
                onClick={() => setOpenId(sub.dbId)}
                className="p-2 rounded-md hover:bg-accent"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </div>
          </li>
        ))}
      </ul>

      <Dialog open={openId !== null} onOpenChange={() => setOpenId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Subscription</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div>
                <p className="font-medium">{selected.creatorName}</p>
                <p className="text-sm text-muted-foreground">
                  {selected.planName}
                </p>
              </div>
              {error && (
                <div className="flex items-start gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 mt-0.5" />
                  {error}
                </div>
              )}
              <Button
                variant="destructive"
                disabled={isPending}
                onClick={handleCancel}
                className="w-full"
              >
                {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Cancel Subscription
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
