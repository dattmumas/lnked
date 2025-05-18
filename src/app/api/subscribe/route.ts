import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { getStripe } from "@/lib/stripe";
import Stripe from "stripe"; // Explicitly import Stripe namespace
import { supabaseAdmin } from "@/lib/supabaseAdmin"; // Updated import path
import type { Database } from "@/lib/database.types";

interface SubscribeRequestBody {
  priceId: string;
  redirectPath?: string; // e.g., /dashboard/billing, defaults to '/'
  targetEntityType: "user" | "collective"; // New field
  targetEntityId: string; // New field (UUID for user or collective)
}

// Define a type for common Stripe error shapes
interface StripeErrorLike {
  type: string;
  message: string;
  statusCode?: number;
  code?: string;
  // Add other common Stripe error fields if needed by your error handling logic
}

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient<Database>({ cookies });

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe not configured" },
      { status: 500 }
    );
  }

  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      console.error(
        "Error getting session for subscription:",
        sessionError.message
      );
      return NextResponse.json(
        { error: "Failed to authenticate session" },
        { status: 500 }
      );
    }

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized: No active session" },
        { status: 401 }
      );
    }

    const user = session.user;
    if (!user || !user.id || !user.email) {
      console.error("User data missing in session:", user);
      return NextResponse.json(
        { error: "Unauthorized: Incomplete user data in session" },
        { status: 401 }
      );
    }

    const requestBody = (await request.json()) as SubscribeRequestBody;
    const {
      priceId,
      redirectPath = "/",
      targetEntityType,
      targetEntityId,
    } = requestBody;

    if (!priceId || !targetEntityType || !targetEntityId) {
      return NextResponse.json(
        { error: "priceId, targetEntityType, and targetEntityId are required" },
        { status: 400 }
      );
    }

    // Use STRIPE_PRICE_ID from env if priceId from request is explicitly 'default' or for fallback logic
    const targetPriceId =
      priceId === "default" ? process.env.STRIPE_PRICE_ID : priceId;

    if (!targetPriceId) {
      return NextResponse.json(
        { error: "Stripe Price ID is not configured." },
        { status: 400 }
      );
    }

    let stripeCustomerId: string;

    // 1. Check if user already has a Stripe customer ID in our `customers` table.
    const { data: customerData, error: customerError } = await supabaseAdmin
      .from("customers")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    if (customerError && customerError.code !== "PGRST116") {
      // PGRST116: PostgREST error for 'no rows found'
      console.error("Error fetching customer from DB:", customerError.message);
      return NextResponse.json(
        { error: "Database error fetching customer data" },
        { status: 500 }
      );
    }

    if (customerData?.stripe_customer_id) {
      stripeCustomerId = customerData.stripe_customer_id;
    } else {
      // 2. Create a new Stripe customer if one doesn't exist.
      // Ensure email is passed for Stripe customer creation.
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.user_metadata?.full_name, // Assumes full_name is in user_metadata from Supabase Auth
        metadata: {
          userId: user.id, // Link Supabase user ID in Stripe customer metadata
        },
      });
      stripeCustomerId = customer.id;

      // 3. Store the new Stripe customer ID in our `customers` table.
      const { error: insertCustomerError } = await supabaseAdmin
        .from("customers")
        .insert({ id: user.id, stripe_customer_id: stripeCustomerId });

      if (insertCustomerError) {
        console.error(
          "Error inserting new customer into DB:",
          insertCustomerError.message
        );
        // This is a critical error for data consistency. Handle appropriately.
        // For now, we'll proceed with checkout but this inconsistency should be addressed (e.g., retry, alerting).
        // return NextResponse.json({ error: 'Database error saving customer data' }, { status: 500 });
      }
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    // Add a query param to success_url to identify the session for post-checkout handling if needed.
    const successUrl = `${siteUrl}${
      redirectPath.startsWith("/") ? redirectPath : "/" + redirectPath
    }?stripe_session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${siteUrl}${
      redirectPath.startsWith("/") ? redirectPath : "/" + redirectPath
    }`;

    // --- Stripe Connect logic for collectives ---
    let transferData: { destination: string } | undefined = undefined;
    if (targetEntityType === "collective") {
      // Fetch the collective's stripe_account_id
      const { data: collective, error: collectiveError } = await supabaseAdmin
        .from("collectives")
        .select("stripe_account_id")
        .eq("id", targetEntityId)
        .single();
      if (collectiveError || !collective?.stripe_account_id) {
        return NextResponse.json(
          { error: "Collective is not onboarded to Stripe." },
          { status: 400 }
        );
      }
      transferData = { destination: collective.stripe_account_id };
    }

    // 4. Create Stripe Checkout Session for the subscription.
    const checkoutSessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: stripeCustomerId,
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [
        {
          price: targetPriceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        metadata: {
          userId: user.id, // The subscriber's ID
          targetEntityType: targetEntityType, // What they are subscribing to
          targetEntityId: targetEntityId, // The ID of what they are subscribing to
        },
        ...(transferData ? { transfer_data: transferData } : {}),
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    };

    const checkoutSession = await stripe.checkout.sessions.create(
      checkoutSessionParams
    );

    if (!checkoutSession.url) {
      console.error(
        "Error creating Stripe checkout session: No URL returned from Stripe."
      );
      return NextResponse.json(
        { error: "Could not create Stripe checkout session" },
        { status: 500 }
      );
    }

    // 5. Return the checkout session URL to redirect the client.
    return NextResponse.json({ url: checkoutSession.url });
  } catch (error: unknown) {
    let errorMessage = "An unexpected error occurred.";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    console.error("Stripe Subscription API Error:", errorMessage, error);

    // Type guard for Stripe-like errors
    const isStripeError = (e: unknown): e is StripeErrorLike => {
      return (
        typeof e === "object" &&
        e !== null &&
        "type" in e &&
        typeof (e as StripeErrorLike).type === "string" &&
        (e as StripeErrorLike).type.startsWith("Stripe")
      );
    };

    if (isStripeError(error)) {
      return NextResponse.json(
        { error: `Stripe error: ${error.message}` },
        { status: error.statusCode || 500 }
      );
    }
    return NextResponse.json(
      { error: `Internal server error: ${errorMessage}` },
      { status: 500 }
    );
  }
}
