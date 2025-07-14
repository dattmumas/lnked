import { mapStripeEventToLedgerEntries } from '../../lib/ledger/stripe-event-mapper';
import type Stripe from 'stripe';

function sum(entries: { amount_cents: number }[]): number {
  return entries.reduce((acc, e) => acc + e.amount_cents, 0);
}

describe('Ledger balance sanity', () => {
  const creatorId = 'creator-uuid';

  it.each([
    ['refund after payment', 'charge.refunded'],
    ['chargeback funds withdrawn', 'charge.dispute.funds_withdrawn'],
  ])('net zero for %s', (_, eventType) => {
    const invoice = {
      id: 'in_123',
      amount_paid: 2000,
      application_fee_amount: 200,
      currency: 'usd',
    } as unknown as Stripe.Invoice;

    const paymentEntries = mapStripeEventToLedgerEntries({
      eventType: 'invoice.payment_succeeded',
      creatorId,
      invoice,
    });

    const charge = {
      id: 'ch_123',
      amount_refunded: 2000,
      application_fee_amount: 200,
      currency: 'usd',
    } as any;

    const refundEntries = mapStripeEventToLedgerEntries({
      eventType,
      creatorId,
      charge,
    });

    const creatorBalance =
      sum(paymentEntries.filter((e) => e.account_id === creatorId)) +
      sum(refundEntries.filter((e) => e.account_id === creatorId));

    expect(creatorBalance).toBe(0);
  });
});
