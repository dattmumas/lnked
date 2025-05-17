"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database, Enums } from "@/lib/database.types";
import { stripe } from "@/lib/stripe";
import { revalidatePath } from "next/cache";

interface SubscriptionStatusResult {
  isSubscribed: boolean;
  dbSubscriptionId?: string; // id from your subscriptions table (which is stripe_subscription_id)
  status?: Enums<"subscription_status"> | null;
  cancelAtPeriodEnd?: boolean | null;
  currentPeriodEnd?: string | null;
}

export async function getSubscriptionStatus(
  targetEntityType: Enums<"subscription_target_type">,
  targetEntityId: string
): Promise<SubscriptionStatusResult | null> {
  const cookieStore = await cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: cookieStore }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { isSubscribed: false };

  const { data: subscription, error } = await supabase
    .from("subscriptions")
    // Select only existing columns: id (is stripe_subscription_id), status, cancel_at_period_end, current_period_end
    .select("id, status, cancel_at_period_end, current_period_end")
    .eq("user_id", user.id)
    .eq("target_entity_type", targetEntityType)
    .eq("target_entity_id", targetEntityId)
    .in("status", ["active", "trialing", "past_due"])
    .maybeSingle();

  if (error) {
    console.error("Error fetching subscription status:", error.message);
    return null;
  }

  if (subscription) {
    return {
      isSubscribed: true,
      dbSubscriptionId: subscription.id, // id from table is the Stripe Subscription ID
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      currentPeriodEnd: subscription.current_period_end
        ? new Date(subscription.current_period_end).toLocaleDateString()
        : null,
    };
  }
  return { isSubscribed: false };
}

interface UnsubscribeResult {
  success: boolean;
  message?: string;
}

export async function unsubscribeFromEntity(
  dbSubscriptionId: string, // ID from your public.subscriptions table
  stripeSubscriptionId: string
): Promise<UnsubscribeResult> {
  const cookieStore = await cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: cookieStore }
  );
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user)
    return { success: false, message: "User not authenticated." };

  // Verify user owns this DB subscription record before proceeding
  const { data: subRecord, error: subFetchError } = await supabase
    .from("subscriptions")
    .select("id, user_id, target_entity_type, target_entity_id")
    .eq("id", dbSubscriptionId)
    .eq("user_id", user.id)
    .single();

  if (subFetchError || !subRecord) {
    console.error(
      "Error fetching subscription for unsubscribe or permission denied:",
      subFetchError?.message
    );
    return {
      success: false,
      message: "Subscription not found or permission denied.",
    };
  }

  try {
    // Option 1: Cancel at period end (recommended)
    const updatedStripeSubscription = await stripe.subscriptions.update(
      stripeSubscriptionId,
      {
        cancel_at_period_end: true,
      }
    );
    console.log(
      "Stripe subscription set to cancel at period end:",
      updatedStripeSubscription.id
    );

    // Option 2: Delete immediately (more destructive)
    // await stripe.subscriptions.del(stripeSubscriptionId);
    // console.log('Stripe subscription deleted immediately:', stripeSubscriptionId);

    // Webhooks should handle the DB update. For immediate UI feedback, client can update optimistically.
    // Or, you could update the local DB status here, but be mindful of race conditions with webhooks.
    // For now, rely on webhook for DB state.

    // Revalidate paths related to this subscription or user's content access
    if (subRecord.target_entity_type === "user") {
      revalidatePath(`/newsletters/${subRecord.target_entity_id}`);
    } else if (subRecord.target_entity_type === "collective") {
      // Need collective slug for path revalidation - this action doesn't have it.
      // This makes revalidation tricky from a generic action. Client might need to trigger specific revalidations.
      // Or, revalidate a broader path like the user's feed or dashboard.
      // For now, let's skip specific collective page revalidation from here.
    }
    revalidatePath("/"); // Revalidate home feed
    revalidatePath("/dashboard"); // Revalidate dashboard

    return {
      success: true,
      message: "Subscription set to cancel at period end.",
    };
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown Stripe error";
    console.error("Stripe unsubscribe error:", errorMessage, error);
    return {
      success: false,
      message: `Failed to unsubscribe: ${errorMessage}`,
    };
  }
}
