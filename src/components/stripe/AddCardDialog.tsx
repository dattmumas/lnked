'use client';

import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useState } from 'react';
import { toast } from 'sonner';

import {
  createSetupIntent,
  setDefaultPaymentMethod,
} from '@/app/stripe-actions/billing';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';

// Lazy-load Stripe to avoid SSR issues
const stripePromise = loadStripe(
  process.env['NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'] as string,
);

interface InnerFormProps {
  clientSecret: string;
  onSuccess: () => void;
}

function AddCardForm({ clientSecret, onSuccess }: InnerFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!stripe || !elements) return;

    setSubmitting(true);
    const card = elements.getElement(CardElement);
    if (!card) return;

    const { setupIntent, error } = await stripe.confirmCardSetup(clientSecret, {
      payment_method: {
        card,
      },
    });

    if (error) {
      toast.error(error.message ?? 'Failed to add card');
      setSubmitting(false);
      return;
    }

    if (setupIntent && setupIntent.payment_method) {
      const result = await setDefaultPaymentMethod(
        setupIntent.payment_method as string,
      );
      if ('success' in result) {
        toast.success('Card added successfully');
        onSuccess();
      } else {
        toast.error(result.error);
      }
    }
    setSubmitting(false);
  };

  return (
    <div className="space-y-4">
      <CardElement
        options={{ hidePostalCode: true }}
        className="p-2 border rounded-md"
      />
      <DialogFooter>
        <Button onClick={handleSubmit} disabled={isSubmitting || !stripe}>
          {isSubmitting ? 'Saving…' : 'Save Card'}
        </Button>
      </DialogFooter>
    </div>
  );
}

export default function AddCardDialog({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const handleOpenChange = async (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen && !clientSecret) {
      const res = await createSetupIntent();
      if ('clientSecret' in res) {
        setClientSecret(res.clientSecret);
      } else {
        toast.error(res.error);
        setOpen(false);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          Add Payment Method
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a new card</DialogTitle>
        </DialogHeader>
        {clientSecret && (
          <Elements options={{ clientSecret }} stripe={stripePromise}>
            <AddCardForm
              clientSecret={clientSecret}
              onSuccess={() => {
                setOpen(false);
                onAdded();
              }}
            />
          </Elements>
        )}
      </DialogContent>
    </Dialog>
  );
}
