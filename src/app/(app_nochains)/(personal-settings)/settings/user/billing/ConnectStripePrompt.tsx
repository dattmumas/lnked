'use client';

import { Package } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';

export default function ConnectStripePrompt(): React.JSX.Element {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleConnect = async (): Promise<void> => {
    setLoading(true);
    try {
      const res = await fetch('/api/stripe-connect', { method: 'POST' });
      const json: { url?: string; error?: string } = await res.json();

      if (json.url) {
        router.push(json.url);
      } else {
        toast.error(json.error ?? 'Stripe link failed');
        setLoading(false);
      }
    } catch (err) {
      toast.error((err as Error).message);
      setLoading(false);
    }
  };

  // Poll flags when coming back from Stripe return
  React.useEffect(() => {
    if (searchParams.get('stripe') !== 'return') return;

    let attempts = 0;
    const poll = async (): Promise<void> => {
      const res = await fetch('/api/self/stripe-flags');
      const json: { stripe_payouts_enabled?: boolean } = await res.json();
      if (json.stripe_payouts_enabled) {
        router.refresh();
      } else if (attempts < 10) {
        attempts += 1;
        setTimeout(poll, 1000);
      }
    };

    void poll();
  }, [searchParams, router]);

  return (
    <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
      <Package className="h-10 w-10 text-muted-foreground" />
      <p className="text-sm text-muted-foreground max-w-xs">
        Connect your Stripe account and finish onboarding to start earning
        subscription revenue.
      </p>
      <Button onClick={handleConnect} disabled={loading}>
        {loading ? 'Redirecting…' : 'Connect with Stripe'}
      </Button>
    </div>
  );
}
