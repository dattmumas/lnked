import Link from 'next/link';
import React from 'react';

export default function NotFound(): React.ReactElement {
  return (
    <div className="flex flex-col items-center justify-center h-screen font-sans">
      <h1 className="text-3xl font-bold mb-4">404 - Page Not Found</h1>
      <p className="mb-8 text-muted-foreground">
        Sorry, the page you are looking for does not exist.
      </p>
      <Link
        href="/"
        className="text-accent hover:text-accent/80 underline transition-colors"
      >
        Return to Homepage
      </Link>
    </div>
  );
}
