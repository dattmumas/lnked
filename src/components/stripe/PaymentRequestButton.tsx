import { PaymentRequestButtonElement, Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';

import type { Stripe } from '@stripe/stripe-js';


type StripePaymentRequest = ReturnType<Stripe['paymentRequest']>;

type PaymentRequestDynamic<T = unknown> = {
  on: (event: string, handler: (event: T) => void) => void;
};

interface StripePaymentMethodEvent {
  complete: (status: 'success' | 'fail' | 'unknown') => void;
  paymentMethod: { id: string };
}

const stripePromise = loadStripe(
  process.env['NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'] as string,
);

interface Props {
  amount: number; // cents
  currency: string; // lowercase iso, e.g. 'usd'
  onSuccess: (paymentIntentId: string) => void;
}

export default function PaymentRequestButton({
  amount,
  currency,
  onSuccess,
}: Props) {
  const [paymentRequest, setPaymentRequest] =
    useState<StripePaymentRequest | null>(null);

  useEffect(() => {
    void (async () => {
      const stripe = await stripePromise;
      if (!stripe) return;
      const pr = stripe.paymentRequest({
        country: 'US',
        currency,
        total: { label: 'Total', amount },
        requestPayerName: true,
        requestPayerEmail: true,
      });
      const result = await pr.canMakePayment();
      if (result) {
        setPaymentRequest(pr);
      }
    })();
  }, [amount, currency]);

  if (!paymentRequest) return null;

  return (
    <Elements stripe={stripePromise}>
      <PaymentRequestButtonElement
        options={{
          paymentRequest,
          style: {
            paymentRequestButton: {
              type: 'default',
              theme: 'dark',
              height: '40px',
            },
          },
        }}
        onReady={() => {
          (
            paymentRequest as unknown as PaymentRequestDynamic<StripePaymentMethodEvent>
          ).on('paymentmethod', (ev: StripePaymentMethodEvent) => {
            ev.complete('success');
            onSuccess(ev.paymentMethod.id);
          });
        }}
      />
    </Elements>
  );
}
