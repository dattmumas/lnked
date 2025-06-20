'use client';

import { usePathname, useRouter } from 'next/navigation';
import React, { useCallback, useMemo, useState, useEffect } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import supabase from '@/lib/supabase/browser';

import type { User } from '@supabase/supabase-js';

// Constants
const CENTS_TO_DOLLARS = 100;
const DECIMAL_PLACES = 2;

interface Tier {
  id: string;
  unit_amount: number | undefined;
  interval: string | undefined;
  description: string | undefined;
}

interface SubscriptionResponse {
  url?: string;
  error?: string;
}

// Default empty array to avoid re-creating on each render
const DEFAULT_TIERS: Tier[] = [];

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
  tiers = DEFAULT_TIERS,
}: SubscribeButtonProps): React.ReactElement {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = React.useTransition();
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const client = supabase;
  const [showOptions, setShowOptions] = useState(false);

  const allTiers: Tier[] = useMemo(
    () =>
      tiers !== undefined && tiers !== null && tiers.length > 0
        ? tiers
        : [
            {
              id:
                process.env.NEXT_PUBLIC_STRIPE_DEFAULT_PRICE_ID !== undefined &&
                process.env.NEXT_PUBLIC_STRIPE_DEFAULT_PRICE_ID !== null &&
                process.env.NEXT_PUBLIC_STRIPE_DEFAULT_PRICE_ID.length > 0
                  ? process.env.NEXT_PUBLIC_STRIPE_DEFAULT_PRICE_ID
                  : 'default',
              unit_amount: undefined,
              interval: undefined,
              description: undefined,
            },
          ],
    [tiers],
  );

  useEffect((): void => {
    const fetchUser = async (): Promise<void> => {
      const {
        data: { user },
      } = await client.auth.getUser();
      setCurrentUser(user ?? undefined);
      setIsLoadingUser(false);
    };
    void fetchUser();
  }, [client]);

  const handleSubscribe = useCallback(
    (priceId: string): void => {
      if (currentUser === undefined || currentUser === null) {
        void router.push(`/sign-in?redirect=${pathname}`);
        return;
      }

      startTransition(async (): Promise<void> => {
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

          const session = (await response.json()) as SubscriptionResponse;

          if (
            session.url !== undefined &&
            session.url !== null &&
            session.url.length > 0
          ) {
            void router.push(session.url); // Redirect to Stripe Checkout
          } else if (
            session.error !== undefined &&
            session.error !== null &&
            session.error.length > 0
          ) {
            setError(`Subscription failed: ${session.error}`);
          } else {
            setError('Could not initiate subscription. Please try again.');
          }
        } catch (error: unknown) {
          console.error('Subscription request error:', error);
          setError('An unexpected error occurred.');
        }
      });
    },
    [currentUser, router, pathname, targetEntityType, targetEntityId],
  );

  const formatLabel = useCallback(
    (tier: Tier): string => {
      const amount =
        tier.unit_amount !== undefined &&
        tier.unit_amount !== null &&
        tier.unit_amount > 0
          ? (tier.unit_amount / CENTS_TO_DOLLARS).toFixed(DECIMAL_PLACES)
          : '';
      const interval =
        tier.interval !== undefined &&
        tier.interval !== null &&
        tier.interval.length > 0
          ? tier.interval
          : '';
      const name =
        tier.description !== undefined &&
        tier.description !== null &&
        tier.description.length > 0
          ? tier.description
          : targetName;
      return `${name}${amount.length > 0 ? ` – $${amount}` : ''}${
        interval.length > 0 ? `/${interval}` : ''
      }`;
    },
    [targetName],
  );

  const handleHideOptions = useCallback((): void => {
    setShowOptions(false);
  }, []);

  const handleTierClick = useCallback(
    (tierId: string) => (): void => {
      void handleSubscribe(tierId);
    },
    [handleSubscribe],
  );

  const handlePrimaryTierClick = useCallback((): void => {
    if (allTiers.length > 1) {
      setShowOptions(true);
    } else {
      void handleSubscribe(allTiers[0].id);
    }
  }, [allTiers, handleSubscribe]);

  // For MVP, button is always active. Later, check if already subscribed.
  if (isLoadingUser) {
    return (
      <Button disabled className="animate-pulse">
        Loading...
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      {error !== undefined && error !== null && error.length > 0 && (
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
              onClick={handleTierClick(tier.id)}
              disabled={isPending || isLoadingUser}
            >
              {isPending ? 'Processing...' : formatLabel(tier)}
            </Button>
          ))}
          <Button
            variant="outline"
            onClick={handleHideOptions}
            disabled={isPending}
          >
            Cancel
          </Button>
        </div>
      ) : (
        <Button
          onClick={handlePrimaryTierClick}
          disabled={isPending || isLoadingUser}
          size="lg"
        >
          {isPending ? 'Processing...' : `Subscribe to ${targetName}`}
        </Button>
      )}
    </div>
  );
}
