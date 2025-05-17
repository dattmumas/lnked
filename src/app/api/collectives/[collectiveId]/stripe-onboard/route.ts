import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getStripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { Database } from "@/lib/database.types";

export async function POST(
  req: Request,
  { params }: { params: { collectiveId: string } }
) {
  const collectiveId = params.collectiveId;
  if (!collectiveId) {
    return NextResponse.json(
      { error: "Missing collectiveId" },
      { status: 400 }
    );
  }

  // Auth: get user session
  const cookieStore = await cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: () => cookieStore }
  );
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
    .select("id, stripe_account_id, owner_id")
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

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe not configured" },
      { status: 500 }
    );
  }

  let stripeAccountId = collective.stripe_account_id;
  if (!stripeAccountId) {
    // Create a new Stripe Connect Express account
    const account = await stripe.accounts.create({
      type: "express",
      metadata: { collectiveId },
    });
    stripeAccountId = account.id;
    // Save to DB
    const { error: updateError } = await supabaseAdmin
      .from("collectives")
      .update({ stripe_account_id: stripeAccountId })
      .eq("id", collectiveId);
    if (updateError) {
      return NextResponse.json(
        { error: "Failed to save Stripe account ID" },
        { status: 500 }
      );
    }
  }

  // Create an onboarding link
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const accountLink = await stripe.accountLinks.create({
    account: stripeAccountId,
    refresh_url: `${siteUrl}/dashboard/collectives/${collectiveId}/settings?stripe=refresh`,
    return_url: `${siteUrl}/dashboard/collectives/${collectiveId}/settings?stripe=return`,
    type: "account_onboarding",
  });

  return NextResponse.json({ url: accountLink.url });
}
