'use client';

import { useState, useEffect } from 'react';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { usePathname, useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import type { User } from '@supabase/supabase-js';

interface Tier {
  id: string;
  unit_amount: number | null;
  interval: string | null;
  description: string | null;
}

interface SubscribeButtonProps {
  targetEntityType: 'user' | 'collective';
  targetEntityId: string;
  targetName: string; // Name of the user or collective for the button label
  tiers?: Tier[]; // available subscription tiers
  // TODO: Add initialIsSubscribed prop later for better UX
}

export default function SubscribeButton({
  targetEntityType,
  targetEntityId,
  targetName,
  tiers = [],
}: SubscribeButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = React.useTransition();
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const supabase = createSupabaseBrowserClient();
  const [showOptions, setShowOptions] = useState(false);

  const allTiers: Tier[] =
    tiers && tiers.length > 0
      ? tiers
      : [
          {
            id: process.env.NEXT_PUBLIC_STRIPE_DEFAULT_PRICE_ID || 'default',
            unit_amount: null,
            interval: null,
            description: null,
          },
        ];

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUser(user);
      setIsLoadingUser(false);
    };
    fetchUser();
  }, [supabase]);

  const handleSubscribe = async (priceId: string) => {
    if (!currentUser) {
      router.push(`/sign-in?redirect=${pathname}`);
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch('/api/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            priceId,
            targetEntityType,
            targetEntityId,
            redirectPath: pathname, // Redirect back to the current page after checkout
          }),
        });

        const session = await response.json();

        if (session.url) {
          router.push(session.url); // Redirect to Stripe Checkout
        } else if (session.error) {
          setError(`Subscription failed: ${session.error}`);
        } else {
          setError('Could not initiate subscription. Please try again.');
        }
      } catch (error) {
        console.error('Subscription request error:', error);
        setError('An unexpected error occurred.');
      }
    });
  };

  // For MVP, button is always active. Later, check if already subscribed.
  if (isLoadingUser) {
    return (
      <Button disabled className="animate-pulse">
        Loading...
      </Button>
    );
  }

  const formatLabel = (tier: Tier) => {
    const amount = tier.unit_amount ? (tier.unit_amount / 100).toFixed(2) : '';
    const interval = tier.interval || '';
    const name = tier.description || targetName;
    return `${name}${amount ? ` – $${amount}` : ''}${
      interval ? `/${interval}` : ''
    }`;
  };

  const primaryTier = allTiers[0];

  return (
    <div className="space-y-2">
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {showOptions && allTiers.length > 1 ? (
        <div className="space-y-2">
          {allTiers.map((tier) => (
            <Button
              key={tier.id}
              onClick={() => handleSubscribe(tier.id)}
              disabled={isPending || isLoadingUser}
            >
              {isPending ? 'Processing...' : formatLabel(tier)}
            </Button>
          ))}
          <Button
            variant="outline"
            onClick={() => setShowOptions(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
        </div>
      ) : (
        <Button
          onClick={() => {
            if (allTiers.length > 1) {
              setShowOptions(true);
            } else {
              handleSubscribe(primaryTier.id);
            }
          }}
          disabled={isPending || isLoadingUser}
          size="lg"
        >
          {isPending ? 'Processing...' : `Subscribe to ${targetName}`}
        </Button>
      )}
    </div>
  );
}
