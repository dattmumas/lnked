"use client";

import { useState, useTransition, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { usePathname, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { User } from "@supabase/supabase-js";

interface SubscribeButtonProps {
  targetEntityType: "user" | "collective";
  targetEntityId: string;
  targetName: string; // Name of the user or collective for the button label
  // TODO: Add initialIsSubscribed prop later for better UX
}

export default function SubscribeButton({
  targetEntityType,
  targetEntityId,
  targetName,
}: SubscribeButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const supabase = createSupabaseBrowserClient();

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

  const handleSubscribe = async () => {
    if (!currentUser) {
      router.push(`/sign-in?redirect=${pathname}`);
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            priceId:
              process.env.NEXT_PUBLIC_STRIPE_DEFAULT_PRICE_ID || "default", // Use a default or make this configurable
            targetEntityType,
            targetEntityId,
            redirectPath: pathname, // Redirect back to the current page after checkout
          }),
        });

        const session = await response.json();

        if (session.url) {
          router.push(session.url); // Redirect to Stripe Checkout
        } else if (session.error) {
          alert(`Subscription failed: ${session.error}`); // Basic error handling
        } else {
          alert("Could not initiate subscription. Please try again.");
        }
      } catch (error) {
        console.error("Subscription request error:", error);
        alert("An unexpected error occurred.");
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

  return (
    <Button
      onClick={handleSubscribe}
      disabled={isPending || isLoadingUser}
      size="lg"
    >
      {isPending ? "Processing..." : `Subscribe to ${targetName}`}
    </Button>
  );
}
