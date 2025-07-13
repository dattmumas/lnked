'use client';

import { CreditCard } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

import AddCardDialog from '@/components/stripe/AddCardDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface PaymentMethodInfo {
  id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
  isDefault: boolean;
}

export default function PaymentMethodsClient({
  methods,
}: {
  methods: PaymentMethodInfo[];
}) {
  const router = useRouter();

  return (
    <div className="space-y-3">
      {methods.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No saved payment methods
        </p>
      )}

      {methods.map((pm) => (
        <div
          key={pm.id}
          className="flex items-center justify-between p-3 rounded-lg border"
        >
          <div className="flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">•••• •••• •••• {pm.last4}</p>
              <p className="text-sm text-muted-foreground">
                Expires {pm.exp_month}/{pm.exp_year}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {pm.isDefault && <Badge variant="secondary">Default</Badge>}
            {!pm.isDefault && (
              <Button
                variant="ghost"
                size="icon"
                onClick={async () => {
                  const { deletePaymentMethod } = await import(
                    '@/app/stripe-actions/billing'
                  );
                  const result = await deletePaymentMethod(pm.id);
                  if ('success' in result) {
                    router.refresh();
                  } else {
                    toast.error(result.error);
                  }
                }}
              >
                ✕
              </Button>
            )}
          </div>
        </div>
      ))}

      <AddCardDialog onAdded={() => router.refresh()} />
    </div>
  );
}
