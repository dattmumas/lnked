'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';

export function FloatingCreateButton(): React.JSX.Element {
  const router = useRouter();

  const handleClick = useCallback((): void => {
    router.push('/create');
  }, [router]);

  return (
    <Button
      aria-label="Create new post"
      className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground p-0 shadow-lg hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-offset-2 lg:hidden"
      onClick={handleClick}
    >
      <Plus className="h-6 w-6" />
    </Button>
  );
}
