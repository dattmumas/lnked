'use client';

import React, { useCallback, useEffect } from 'react';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({
  error,
  reset,
}: GlobalErrorProps): React.ReactElement {
  const handleReset = useCallback((): void => {
    reset();
  }, [reset]);

  // Handle specific Supabase subscription errors
  useEffect(() => {
    if (error.message?.includes('tried to subscribe multiple times')) {
      console.warn(
        'Supabase subscription error detected, attempting recovery...',
      );
      // Auto-reset after a short delay for subscription errors
      const timer = setTimeout(() => {
        reset();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [error, reset]);

  // Don't show error UI for subscription errors, just log and recover
  if (error.message?.includes('tried to subscribe multiple times')) {
    return (
      <div className="container mx-auto p-8 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-4" />
        <p className="text-muted-foreground">Reconnecting...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8 text-center">
      <h1 className="text-4xl font-bold mb-4">Something went wrong</h1>
      <p className="text-muted-foreground mb-4">{error.message}</p>
      <button
        type="button"
        className="rounded bg-accent px-4 py-2 text-accent-foreground"
        onClick={handleReset}
      >
        Try again
      </button>
    </div>
  );
}
