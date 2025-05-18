import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { getStripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { Database } from "@/lib/database.types";

interface PlanRequestBody {
  name: string;
  amount: number; // in cents
  currency: string;
  interval: "month" | "year";
  trial_period_days?: number;
  description?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function POST(req: Request, context: any) {
  const collectiveId = context.params.collectiveId;
  if (!collectiveId) {
    return NextResponse.json(
      { error: "Missing collectiveId" },
      { status: 400 }
    );
  }

  // Auth: get user session
  const supabase = createRouteHandlerClient<Database>({ cookies });
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();
  if (sessionError || !session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  // Check ownership
  const { data: collective, error: collectiveError } = await supabaseAdmin
    .from("collectives")
    .select("id, owner_id, stripe_account_id")
    .eq("id", collectiveId)
    .single();
  if (collectiveError || !collective) {
    return NextResponse.json(
      { error: "Collective not found" },
      { status: 404 }
    );
  }
  if (collective.owner_id !== userId) {
    return NextResponse.json(
      { error: "Forbidden: Not the owner" },
      { status: 403 }
    );
  }
  if (!collective.stripe_account_id) {
    return NextResponse.json(
      { error: "Collective not onboarded to Stripe" },
      { status: 400 }
    );
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe not configured" },
      { status: 500 }
    );
  }

  const body = (await req.json()) as PlanRequestBody;
  const {
    name,
    amount,
    currency,
    interval,
    trial_period_days = 0,
    description,
  } = body;
  if (!name || !amount || !currency || !interval) {
    return NextResponse.json(
      { error: "Missing required plan fields" },
      { status: 400 }
    );
  }

  // 1. Create Stripe Product
  const product = await stripe.products.create({
    name,
    description,
    metadata: { collectiveId },
  });

  // 2. Create Stripe Price (recurring)
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: amount,
    currency,
    recurring: { interval },
    metadata: { collectiveId },
  });

  // 3. Store in DB
  const { error: productErr } = await supabaseAdmin.from("products").insert({
    id: product.id,
    name: product.name,
    description: product.description,
    collective_id: collectiveId,
    active: true,
  });
  if (productErr) {
    return NextResponse.json(
      { error: "Failed to save product" },
      { status: 500 }
    );
  }
  const { error: priceErr } = await supabaseAdmin.from("prices").insert({
    id: price.id,
    product_id: product.id,
    unit_amount: price.unit_amount,
    currency: price.currency,
    interval: price.recurring?.interval,
    trial_period_days: trial_period_days,
    active: true,
  });
  if (priceErr) {
    return NextResponse.json(
      { error: "Failed to save price" },
      { status: 500 }
    );
  }

  return NextResponse.json({ product, price });
}
