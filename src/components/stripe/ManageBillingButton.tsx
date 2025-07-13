'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'react-hot-toast';

import { Button } from '@/components/ui/button';

export default function ManageBillingButton({
  className,
}: {
  className?: string;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleClick = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/billing-portal', { method: 'POST' });
      const json = (await res.json()) as { url?: string; error?: string };
      if (json.url) {
        router.push(json.url);
      } else {
        toast.error(json.error ?? 'Failed to open billing portal');
        setLoading(false);
      }
    } catch {
      toast.error('Network error');
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={loading}
      variant="outline"
      className={className}
    >
      Manage Billing
    </Button>
  );
}
