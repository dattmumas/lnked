import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import type Stripe from 'stripe';
import type { Database } from '@/lib/database.types';

const relevantEvents = new Set([
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'account.updated',
]);

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const stripe = getStripe();

  if (!stripe) {
    // Stripe not set up: acknowledge so Stripe won't retry (HTTP 200)
    return NextResponse.json(
      { ignored: true, reason: 'Stripe not configured' },
      { status: 200 },
    );
  }

  const sig = req.headers.get('stripe-signature');
  const rawBody = await req.text();

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    console.error('Stripe webhook error: Missing signature or secret.');
    return NextResponse.json(
      { error: 'Webhook signature or secret missing.' },
      { status: 400 },
    );
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : 'Unknown webhook signature error';
    console.error(
      `Stripe webhook signature verification failed: ${errorMessage}`,
    );
    return NextResponse.json(
      { error: `Webhook Error: ${errorMessage}` },
      { status: 400 },
    );
  }

  if (process.env.NODE_ENV === 'development') {
    console.info(`Received event in Next.js route: ${event.type}`);
  }

  if (relevantEvents.has(event.type)) {
    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          if (
            session.mode === 'subscription' &&
            session.customer &&
            session.subscription &&
            session.metadata?.userId &&
            session.metadata?.targetEntityType &&
            session.metadata?.targetEntityId
          ) {
            const {userId} = session.metadata;
            const stripeCustomerId =
              typeof session.customer === 'string'
                ? session.customer
                : session.customer.id;
            const { error: customerErr } = await supabaseAdmin
              .from('customers')
              .upsert(
                { id: userId, stripe_customer_id: stripeCustomerId },
                { onConflict: 'id' },
              );
            if (customerErr)
              console.error(
                `Error upserting customer for user ${userId} (Next API):`,
                customerErr.message,
              );
            else if (process.env.NODE_ENV === 'development')
              console.info(
                `Customer mapping for user ${userId} updated (Next API).`,
              );

            if (process.env.NODE_ENV === 'development')
              console.info(
                `Checkout session completed for user ${userId}, target: ${session.metadata.targetEntityType} - ${session.metadata.targetEntityId}`,
              );
          } else {
            console.warn(
              'checkout.session.completed missing crucial metadata (userId, targetEntityType, targetEntityId) or not subscription (Next API):',
              session.metadata,
            );
          }
          break;
        }
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted': {
          const subscriptionObject = event.data
            .object as Stripe.Subscription & {
            current_period_start: number;
            current_period_end: number;
          };

          const subscriberUserId = subscriptionObject.metadata?.userId;
          const targetEntityTypeFromMeta = subscriptionObject.metadata
            ?.targetEntityType as
            | Database['public']['Enums']['subscription_target_type']
            | undefined;
          const targetEntityIdFromMeta = subscriptionObject.metadata
            ?.targetEntityId as string | undefined;

          if (
            !subscriberUserId ||
            !targetEntityTypeFromMeta ||
            !targetEntityIdFromMeta
          ) {
            console.error(
              `CRITICAL: Subscription ${subscriptionObject.id} metadata missing userId, targetEntityType, or targetEntityId (Next API). Cannot map subscription.`,
            );
            return NextResponse.json(
              { error: 'Subscription metadata incomplete.' },
              { status: 400 },
            );
          }

          const priceItem = subscriptionObject.items.data[0];
          if (!priceItem || !priceItem.price) {
            console.error(
              `CRITICAL: Subscription ${subscriptionObject.id} has no items or price info (Next API).`,
            );
            return NextResponse.json(
              { error: 'Subscription item or price data missing.' },
              { status: 400 },
            );
          }
          const stripePriceId =
            typeof priceItem.price === 'string'
              ? priceItem.price
              : priceItem.price.id;

          const subscriptionData = {
            id: subscriptionObject.id,
            user_id: subscriberUserId,
            status:
              subscriptionObject.status as Database['public']['Enums']['subscription_status'],
            stripe_price_id: stripePriceId,
            target_entity_type: targetEntityTypeFromMeta,
            target_entity_id: targetEntityIdFromMeta,
            quantity: priceItem.quantity,
            cancel_at_period_end: subscriptionObject.cancel_at_period_end,
            created: new Date(subscriptionObject.created * 1000).toISOString(),
            current_period_start: new Date(
              subscriptionObject.current_period_start * 1000,
            ).toISOString(),
            current_period_end: new Date(
              subscriptionObject.current_period_end * 1000,
            ).toISOString(),
            ended_at: subscriptionObject.ended_at
              ? new Date(subscriptionObject.ended_at * 1000).toISOString()
              : null,
            cancel_at: subscriptionObject.cancel_at
              ? new Date(subscriptionObject.cancel_at * 1000).toISOString()
              : null,
            canceled_at: subscriptionObject.canceled_at
              ? new Date(subscriptionObject.canceled_at * 1000).toISOString()
              : null,
            trial_start: subscriptionObject.trial_start
              ? new Date(subscriptionObject.trial_start * 1000).toISOString()
              : null,
            trial_end: subscriptionObject.trial_end
              ? new Date(subscriptionObject.trial_end * 1000).toISOString()
              : null,
            metadata: subscriptionObject.metadata,
            updated_at: new Date().toISOString(),
          };
          const { error: upsertErr } = await supabaseAdmin
            .from('subscriptions')
            .upsert(subscriptionData, { onConflict: 'id' });
          if (upsertErr) {
            console.error(
              `Error upserting subscription ${subscriptionObject.id} (Next API):`,
              upsertErr.message,
            );
          } else {
            if (process.env.NODE_ENV === 'development')
              console.info(
                `Subscription ${subscriptionObject.id} upserted for user ${subscriberUserId} (Next API).`,
              );
          }
          break;
        }
        case 'account.updated': {
          const account = event.data.object as Stripe.Account;
          // Find the collective with this stripe_account_id
          const { data: collective, error: fetchError } = await supabaseAdmin
            .from('collectives')
            .select('id')
            .eq('stripe_account_id', account.id)
            .maybeSingle();
          if (fetchError) {
            console.error(
              'Error fetching collective for Stripe account:',
              fetchError.message,
            );
            break;
          }
          if (collective) {
            const { error: updateError } = await supabaseAdmin
              .from('collectives')
              .update({
                stripe_charges_enabled: account.charges_enabled,
                stripe_payouts_enabled: account.payouts_enabled,
                stripe_details_submitted: account.details_submitted,
                stripe_requirements: account.requirements,
                stripe_account_type: account.type,
                stripe_account_email: account.email,
              })
              .eq('id', collective.id);
            if (updateError) {
              console.error(
                'Error updating collective Stripe status:',
                updateError.message,
              );
            } else {
              if (process.env.NODE_ENV === 'development')
                console.info(
                  `Collective ${collective.id} Stripe status updated from webhook.`,
                );
            }
          } else {
            console.warn(
              `No collective found for Stripe account ID ${account.id}`,
            );
          }
          break;
        }
        default:
          // This should not happen as we filter by relevantEvents, but handle it gracefully
          console.warn(`Unhandled Stripe webhook event type: ${event.type}`);
          break;
      }
    } catch (err) {
      console.error('Error handling Stripe webhook event:', err);
      return NextResponse.json(
        { error: 'Error handling Stripe webhook event.' },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ received: true });
}
