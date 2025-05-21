'use client';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  return (
    <html>
      <body className="container mx-auto p-8 text-center">
        <h1 className="text-4xl font-bold mb-4">Something went wrong</h1>
        <p className="text-muted-foreground mb-4">{error.message}</p>
        <button
          className="rounded bg-primary px-4 py-2 text-primary-foreground"
          onClick={() => reset()}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
