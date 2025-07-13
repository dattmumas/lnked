import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { HttpStatusCode, WEBHOOK_CONSTANTS } from '@/lib/constants/errors';
import {
  checkoutSessionMetadataSchema,
  subscriptionMetadataSchema,
  parseStripeSignature,
  validateWebhookTimestamp,
  getStripeSignatureHeader,
  type CheckoutSessionMetadata,
  type SubscriptionMetadata,
  type SubscriptionStatus,
} from '@/lib/schemas/webhook-validation';
import { getStripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { webhookLogger, createWebhookTimer } from '@/lib/utils/webhook-logger';

import type Stripe from 'stripe';

const relevantEvents = new Set([
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'account.updated',
]);

export const runtime = 'nodejs';

interface SubscriptionUpdateData {
  id: string;
  user_id: string;
  status: SubscriptionStatus;
  stripe_price_id: string;
  target_entity_type: string;
  target_entity_id: string;
  quantity: number | null | undefined;
  cancel_at_period_end: boolean;
  created: string;
  current_period_start: string;
  current_period_end: string;
  ended_at: string | null;
  cancel_at: string | null;
  canceled_at: string | null;
  trial_start: string | null;
  trial_end: string | null;
  metadata: Record<string, unknown> | null;
  updated_at: string;
}

interface AccountUpdateData {
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
  requirements: Record<string, unknown> | undefined;
  type: string;
  email: string;
}

/**
 * Enhanced webhook event processor with idempotency and security
 */
async function processWebhookEvent(
  eventId: string,
  eventType: string,
  timer: ReturnType<typeof createWebhookTimer>,
): Promise<{ processed: boolean; fromCache: boolean }> {
  // Check if event already processed (idempotency)
  const { data: existingEvent } = await supabaseAdmin
    .from('api_cache')
    .select('data')
    .eq('cache_key', `webhook_event:${eventId}`)
    .maybeSingle();

  if (existingEvent !== null) {
    webhookLogger.info('Webhook event already processed', {
      eventId,
      eventType,
      processingTimeMs: timer.end(),
    });
    return { processed: true, fromCache: true };
  }

  // Mark event as processing
  await supabaseAdmin.from('api_cache').upsert({
    cache_key: `webhook_event:${eventId}`,
    data: {
      status: 'processed',
      eventType,
      processedAt: new Date().toISOString(),
    },
  });

  return { processed: false, fromCache: false };
}

/**
 * Selective subscription update - only update changed fields
 */
async function updateSubscriptionSelectively(
  subscriptionId: string,
  newData: SubscriptionUpdateData,
): Promise<{ error: unknown }> {
  // Get current subscription data
  const { data: currentSub } = await supabaseAdmin
    .from('subscriptions')
    .select('*')
    .eq('id', subscriptionId)
    .maybeSingle();

  if (currentSub === null) {
    // New subscription - insert all data
    const { error } = await supabaseAdmin
      .from('subscriptions')
      .upsert(newData as never, { onConflict: 'id' });
    return { error };
  }

  // Compare and update only changed fields
  const updates: Partial<SubscriptionUpdateData> = {};
  const fieldsToCheck: Array<keyof SubscriptionUpdateData> = [
    'status',
    'cancel_at_period_end',
    'current_period_start',
    'current_period_end',
    'ended_at',
    'cancel_at',
    'canceled_at',
    'trial_start',
    'trial_end',
    'metadata',
  ];

  for (const field of fieldsToCheck) {
    const newValue = newData[field];
    const currentValue = currentSub[field];
    if (newValue !== currentValue) {
      (updates as Record<string, unknown>)[field] =
        newValue === null ? undefined : newValue;
    }
  }

  if (Object.keys(updates).length === 0) {
    return { error: null }; // No changes needed
  }

  updates.updated_at = new Date().toISOString();

  const { error } = await supabaseAdmin
    .from('subscriptions')
    .update(updates as never)
    .eq('id', subscriptionId);

  return { error };
}

/**
 * Idempotent customer upsert to handle race conditions
 */
async function upsertCustomerSafely(
  userId: string,
  stripeCustomerId: string,
): Promise<{ error: unknown }> {
  // Use upsert with proper conflict resolution
  const { error } = await supabaseAdmin.from('customers').upsert(
    {
      id: userId,
      stripe_customer_id: stripeCustomerId,
    },
    {
      onConflict: 'id',
      ignoreDuplicates: false,
    },
  );

  return { error };
}

// -- Removed legacy collective Stripe updater --

export async function POST(req: Request): Promise<NextResponse> {
  const timer = createWebhookTimer();

  const stripe = getStripe();
  if (!stripe) {
    webhookLogger.warn('Stripe not configured', { source: 'webhook' });
    return NextResponse.json(
      { ignored: true, reason: 'Stripe not configured' },
      { status: HttpStatusCode.OK },
    );
  }

  // Enhanced header retrieval with fallback
  const sig = getStripeSignatureHeader(req.headers);
  const rawBody = await req.text();
  const webhookSecret = process.env['STRIPE_WEBHOOK_SECRET'];

  if (
    sig === null ||
    sig === undefined ||
    webhookSecret === null ||
    webhookSecret === undefined
  ) {
    webhookLogger.error('Missing webhook signature or secret', undefined, {
      hasSignature: sig !== null,
      hasSecret: webhookSecret !== null,
    });
    return NextResponse.json(
      { error: 'Webhook signature or secret missing.' },
      { status: HttpStatusCode.BadRequest },
    );
  }

  // Parse and validate signature timestamp
  const parsedSig = parseStripeSignature(sig);
  if (parsedSig.t === undefined || parsedSig.v1 === undefined) {
    webhookLogger.error('Invalid signature format', undefined, {
      hasTimestamp: parsedSig.t !== undefined,
      hasSignature: parsedSig.v1 !== undefined,
    });
    return NextResponse.json(
      { error: 'Invalid signature format.' },
      { status: HttpStatusCode.BadRequest },
    );
  }

  // Validate timestamp to prevent replay attacks
  const timestampValidation = validateWebhookTimestamp(
    parsedSig.t,
    WEBHOOK_CONSTANTS.MAX_TIMESTAMP_AGE_SECONDS,
  );

  if (!timestampValidation.valid) {
    webhookLogger.error('Webhook timestamp validation failed', undefined, {
      error: timestampValidation.error,
      timestamp: parsedSig.t,
    });
    return NextResponse.json(
      { error: timestampValidation.error },
      { status: HttpStatusCode.BadRequest },
    );
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : 'Unknown webhook signature error';
    webhookLogger.error('Webhook signature verification failed', err);
    return NextResponse.json(
      { error: `Webhook Error: ${errorMessage}` },
      { status: HttpStatusCode.BadRequest },
    );
  }

  webhookLogger.debug('Webhook event received', {
    eventId: event.id,
    eventType: event.type,
  });

  if (relevantEvents.has(event.type)) {
    try {
      // Check for idempotency
      const { processed, fromCache } = await processWebhookEvent(
        event.id,
        event.type,
        timer,
      );

      if (processed && fromCache) {
        return NextResponse.json({ received: true, cached: true });
      }

      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object;

          if (
            session.mode === 'subscription' &&
            session.customer !== null &&
            session.customer !== undefined &&
            session.subscription !== null &&
            session.subscription !== undefined &&
            session.metadata !== null &&
            session.metadata !== undefined
          ) {
            try {
              // Validate metadata with Zod
              const validatedMetadata: CheckoutSessionMetadata =
                checkoutSessionMetadataSchema.parse(session.metadata);

              const stripeCustomerId =
                typeof session.customer === 'string'
                  ? session.customer
                  : session.customer.id;

              // Idempotent customer upsert
              const { error: customerErr } = await upsertCustomerSafely(
                validatedMetadata.userId,
                stripeCustomerId,
              );

              if (customerErr !== null) {
                webhookLogger.error('Failed to upsert customer', customerErr, {
                  eventId: event.id,
                  userId: validatedMetadata.userId,
                });
                // Return 500 so Stripe retries
                return NextResponse.json(
                  { error: 'Customer processing failed' },
                  { status: HttpStatusCode.InternalServerError },
                );
              }

              // Track checkout session for webhook reconciliation
              await supabaseAdmin.from('checkout_sessions').upsert(
                {
                  stripe_session_id: session.id,
                  user_id: validatedMetadata.userId,
                  target_entity_type: validatedMetadata.targetEntityType,
                  target_entity_id: validatedMetadata.targetEntityId,
                  status: 'completed',
                  stripe_subscription_id:
                    typeof session.subscription === 'string'
                      ? session.subscription
                      : session.subscription.id,
                  completed_at: new Date().toISOString(),
                },
                { onConflict: 'stripe_session_id' },
              );

              timer.endAndLog('Checkout session processed successfully', {
                eventId: event.id,
                userId: validatedMetadata.userId,
              });
            } catch (validationError) {
              if (validationError instanceof ZodError) {
                webhookLogger.error(
                  'Checkout session metadata validation failed',
                  validationError,
                  {
                    eventId: event.id,
                    validationErrors: validationError.errors,
                  },
                );
                return NextResponse.json(
                  { error: 'Invalid checkout session metadata' },
                  { status: HttpStatusCode.BadRequest },
                );
              }
              throw validationError;
            }
          } else {
            webhookLogger.warn('Checkout session missing required fields', {
              eventId: event.id,
              hasMode: session.mode !== undefined,
              hasCustomer: session.customer !== null,
              hasSubscription: session.subscription !== null,
              hasMetadata: session.metadata !== null,
            });
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

          if (
            subscriptionObject.metadata === null ||
            subscriptionObject.metadata === undefined
          ) {
            webhookLogger.error('Subscription missing metadata', undefined, {
              eventId: event.id,
              subscriptionId: subscriptionObject.id,
            });
            return NextResponse.json(
              { error: 'Subscription metadata missing' },
              { status: HttpStatusCode.BadRequest },
            );
          }

          try {
            // Validate metadata with Zod
            const validatedMetadata: SubscriptionMetadata =
              subscriptionMetadataSchema.parse(subscriptionObject.metadata);

            const priceItem = subscriptionObject.items.data[0];
            if (
              priceItem === null ||
              priceItem === undefined ||
              priceItem.price === null ||
              priceItem.price === undefined
            ) {
              webhookLogger.error(
                'Subscription missing price information',
                undefined,
                {
                  eventId: event.id,
                  subscriptionId: subscriptionObject.id,
                },
              );
              return NextResponse.json(
                { error: 'Subscription price data missing' },
                { status: HttpStatusCode.BadRequest },
              );
            }

            const stripePriceId =
              typeof priceItem.price === 'string'
                ? priceItem.price
                : priceItem.price.id;

            const subscriptionData = {
              id: subscriptionObject.id,
              user_id: validatedMetadata.userId,
              status: subscriptionObject.status as SubscriptionStatus,
              stripe_price_id: stripePriceId,
              target_entity_type: validatedMetadata.targetEntityType,
              target_entity_id: validatedMetadata.targetEntityId,
              quantity: priceItem.quantity,
              cancel_at_period_end: subscriptionObject.cancel_at_period_end,
              created: new Date(
                subscriptionObject.created *
                  WEBHOOK_CONSTANTS.MILLISECONDS_PER_SECOND,
              ).toISOString(),
              current_period_start: new Date(
                subscriptionObject.current_period_start *
                  WEBHOOK_CONSTANTS.MILLISECONDS_PER_SECOND,
              ).toISOString(),
              current_period_end: new Date(
                subscriptionObject.current_period_end *
                  WEBHOOK_CONSTANTS.MILLISECONDS_PER_SECOND,
              ).toISOString(),
              ended_at:
                subscriptionObject.ended_at !== null &&
                subscriptionObject.ended_at !== undefined &&
                subscriptionObject.ended_at !== 0
                  ? new Date(
                      subscriptionObject.ended_at *
                        WEBHOOK_CONSTANTS.MILLISECONDS_PER_SECOND,
                    ).toISOString()
                  : null,
              cancel_at:
                subscriptionObject.cancel_at !== null &&
                subscriptionObject.cancel_at !== undefined &&
                subscriptionObject.cancel_at !== 0
                  ? new Date(
                      subscriptionObject.cancel_at *
                        WEBHOOK_CONSTANTS.MILLISECONDS_PER_SECOND,
                    ).toISOString()
                  : null,
              canceled_at:
                subscriptionObject.canceled_at !== null &&
                subscriptionObject.canceled_at !== undefined &&
                subscriptionObject.canceled_at !== 0
                  ? new Date(
                      subscriptionObject.canceled_at *
                        WEBHOOK_CONSTANTS.MILLISECONDS_PER_SECOND,
                    ).toISOString()
                  : null,
              trial_start:
                subscriptionObject.trial_start !== null &&
                subscriptionObject.trial_start !== undefined &&
                subscriptionObject.trial_start !== 0
                  ? new Date(
                      subscriptionObject.trial_start *
                        WEBHOOK_CONSTANTS.MILLISECONDS_PER_SECOND,
                    ).toISOString()
                  : null,
              trial_end:
                subscriptionObject.trial_end !== null &&
                subscriptionObject.trial_end !== undefined &&
                subscriptionObject.trial_end !== 0
                  ? new Date(
                      subscriptionObject.trial_end *
                        WEBHOOK_CONSTANTS.MILLISECONDS_PER_SECOND,
                    ).toISOString()
                  : null,
              metadata: subscriptionObject.metadata,
              updated_at: new Date().toISOString(),
            };

            // Selective subscription update
            const { error: upsertErr } = await updateSubscriptionSelectively(
              subscriptionObject.id,
              subscriptionData,
            );

            if (upsertErr !== null) {
              webhookLogger.error('Failed to update subscription', upsertErr, {
                eventId: event.id,
                subscriptionId: subscriptionObject.id,
              });
              // Return 500 so Stripe retries
              return NextResponse.json(
                { error: 'Subscription processing failed' },
                { status: HttpStatusCode.InternalServerError },
              );
            }

            timer.endAndLog('Subscription processed successfully', {
              eventId: event.id,
              subscriptionId: subscriptionObject.id,
              userId: validatedMetadata.userId,
            });
          } catch (validationError) {
            if (validationError instanceof ZodError) {
              webhookLogger.error(
                'Subscription metadata validation failed',
                validationError,
                {
                  eventId: event.id,
                  subscriptionId: subscriptionObject.id,
                  validationErrors: validationError.errors,
                },
              );
              return NextResponse.json(
                { error: 'Invalid subscription metadata' },
                { status: HttpStatusCode.BadRequest },
              );
            }
            throw validationError;
          }
          break;
        }

        case 'account.updated': {
          const account = event.data.object;

          const {
            id: accountId,
            charges_enabled,
            payouts_enabled,
            type,
          } = account;

          const { error: updateErr } = await supabaseAdmin
            .from('users')
            .update({
              stripe_charges_enabled: charges_enabled,
              stripe_payouts_enabled: payouts_enabled,
              stripe_account_type: type,
            } as never)
            .eq('stripe_account_id', accountId);

          if (updateErr) {
            webhookLogger.error(
              'Failed to update user stripe flags',
              updateErr,
              {
                accountId,
              },
            );
            return NextResponse.json(
              { error: 'Failed to update user flags' },
              { status: HttpStatusCode.InternalServerError },
            );
          }

          timer.endAndLog('Account flags updated', {
            accountId,
            charges_enabled,
            payouts_enabled,
          });
          break;
        }

        // account.updated no longer relevant – collectives do not have Stripe accounts
        default:
          webhookLogger.warn('Unhandled webhook event type', {
            eventId: event.id,
            eventType: event.type,
          });
          break;
      }
    } catch (err: unknown) {
      webhookLogger.error('Error processing webhook event', err, {
        eventId: event.id,
        eventType: event.type,
      });
      // Return 500 so Stripe retries
      return NextResponse.json(
        { error: 'Webhook processing failed' },
        { status: HttpStatusCode.InternalServerError },
      );
    }
  }

  return NextResponse.json({ received: true });
}
