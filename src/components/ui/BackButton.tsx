'use client';

import { ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React from 'react';

import { Button } from '@/components/ui/button';

export default function BackButton({
  fallback = '/home',
  className,
}: {
  fallback?: string;
  className?: string;
}): React.ReactElement {
  const router = useRouter();

  const handleClick = (): void => {
    if (
      document.referrer &&
      document.referrer.startsWith(window.location.origin)
    ) {
      router.back();
    } else {
      router.push(fallback);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      className={className ? `gap-2 ${className}` : 'gap-2'}
    >
      <ChevronLeft className="h-4 w-4" />
      Back
    </Button>
  );
}
