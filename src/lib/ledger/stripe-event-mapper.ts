import { PLATFORM_ACCOUNT_UUID } from '@/lib/constants/finance';

import type { LedgerInsert } from '../ledger';
import type Stripe from 'stripe';

/**
 * Map a Stripe event + parsed objects to the ledger insert batch required to
 * reflect the money movement.
 *
 * Currently supports:
 *   • invoice.payment_succeeded  → +net to creator, +fee to platform
 *   • charge.refunded / charge.dispute.funds_withdrawn → negative counterparts
 *
 * Returns an empty array for unsupported / non-money events so callers can
 * safely `await insertLedgerEntries(entries)` without additional checks.
 */
export function mapStripeEventToLedgerEntries(params: {
  eventType: string;
  creatorId: string | null; // null when we cannot determine (e.g., platform-only)
  invoice?: Stripe.Invoice;
  charge?: Stripe.Charge & {
    amount_refunded?: number;
    application_fee_amount?: number;
  };
}): LedgerInsert[] {
  const { eventType, creatorId, invoice, charge } = params;

  switch (eventType) {
    case 'invoice.payment_succeeded': {
      if (!invoice || !creatorId) return [];
      const gross = invoice.amount_paid ?? 0;
      const fee =
        (invoice as Stripe.Invoice & { application_fee_amount?: number | null })
          .application_fee_amount ?? 0;
      const net = gross - fee;
      return [
        {
          account_id: creatorId,
          stripe_object_id: String(invoice.id ?? ''),
          event_type: 'invoice.payment_succeeded',
          amount_cents: net,
          currency: String(invoice.currency ?? 'usd'),
          memo: { invoice: invoice.id },
        },
        {
          account_id: PLATFORM_ACCOUNT_UUID,
          stripe_object_id: String(invoice.id ?? ''),
          event_type: 'platform_fee',
          amount_cents: fee,
          currency: String(invoice.currency ?? 'usd'),
        },
      ];
    }
    case 'charge.refunded':
    case 'charge.dispute.funds_withdrawn': {
      if (!charge || !creatorId) return [];
      const amount = charge.amount_refunded ?? charge.amount ?? 0;
      const fee = charge.application_fee_amount ?? 0;
      return [
        {
          account_id: creatorId,
          stripe_object_id: charge.id,
          event_type: 'refund',
          amount_cents: -1 * (amount - fee),
          currency: String(charge.currency ?? 'usd'),
          memo: { refund: charge.id },
        },
        {
          account_id: PLATFORM_ACCOUNT_UUID,
          stripe_object_id: charge.id,
          event_type: 'platform_fee_refund',
          amount_cents: -1 * fee,
          currency: String(charge.currency ?? 'usd'),
        },
      ];
    }
    default:
      return [];
  }
}
