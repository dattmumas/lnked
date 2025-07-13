import { getStripe } from '@/lib/stripe';

import type Stripe from 'stripe';

/**
 * Fetch the default PaymentMethod for a given platform‐level customer.
 * Returns null when none exists or on retrieval errors.
 */
export async function fetchDefaultPaymentMethod(
  stripeCustomerId: string,
): Promise<Stripe.PaymentMethod | null> {
  const stripe = getStripe();
  if (!stripe) throw new Error('Stripe not configured');

  try {
    const cust = (await stripe.customers.retrieve(stripeCustomerId, {
      expand: ['invoice_settings.default_payment_method', 'default_source'],
    })) as Stripe.Customer;

    const defaultIdRaw =
      typeof cust.invoice_settings?.default_payment_method === 'string'
        ? (cust.invoice_settings.default_payment_method)
        : // could be object
          ((
            cust.invoice_settings
              ?.default_payment_method
          )?.id ??
          (typeof cust.default_source === 'string'
            ? (cust.default_source)
            : (cust.default_source as { id?: string } | null)?.id));

    if (!defaultIdRaw) return null;

    // Retrieve full PaymentMethod to inspect fingerprint/brand if needed
    const pm = (await stripe.paymentMethods.retrieve(
      defaultIdRaw,
    )) as Stripe.PaymentMethod;

    return pm;
  } catch {
    return null; // tolerate errors; caller can fallback to Checkout
  }
}
