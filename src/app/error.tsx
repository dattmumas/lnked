'use client';

import React, { useCallback } from 'react';

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

  return (
    <div className="container mx-auto p-8 text-center">
      <h1 className="text-4xl font-bold mb-4">Something went wrong</h1>
      <p className="text-muted-foreground mb-4">{error.message}</p>
      <button
        className="rounded bg-accent px-4 py-2 text-accent-foreground"
        onClick={handleReset}
      >
        Try again
      </button>
    </div>
  );
}
