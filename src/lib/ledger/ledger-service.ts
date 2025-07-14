
import { insertLedgerEntries } from '@/lib/ledger';
import { mapStripeEventToLedgerEntries } from '@/lib/ledger/stripe-event-mapper';
import { webhookLogger } from '@/lib/utils/webhook-logger';

import type Stripe from 'stripe';

interface Params {
  eventType: string;
  creatorId: string | null;
  invoice?: Stripe.Invoice;
  charge?: Stripe.Charge & {
    amount_refunded?: number;
    application_fee_amount?: number;
  };
  context: Record<string, unknown>; // extra log info (eventId etc.)
}

/**
 * Convenience wrapper used by webhook to generate + insert ledger rows with
 * consistent error handling & telemetry.
 */
export async function processLedgerWrite({
  eventType,
  creatorId,
  invoice,
  charge,
  context,
}: Params): Promise<void> {
  // Skip entirely if feature flag is off
  if (!process.env['LEDGER_DUAL_WRITE']) return;

  const entries = mapStripeEventToLedgerEntries({
    eventType,
    creatorId,
    ...(invoice ? { invoice } : {}),
    ...(charge ? { charge } : {}),
  });

  if (entries.length === 0) return;

  try {
    await insertLedgerEntries(entries);
  } catch (err) {
    webhookLogger.error('ledger_insert_failed', err, context);

    // In ledger-only mode bubble up so webhook returns 500 → Stripe retry
    if (process.env['LEDGER_DUAL_WRITE'] === 'only') {
      throw err;
    }
  }
}
