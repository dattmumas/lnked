import Link from 'next/link';
import React from 'react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border py-4 px-4 md:px-6">
        <div className="container mx-auto flex items-center justify-center">
          <Link
            href="/"
            className="text-2xl font-serif font-extrabold tracking-tight text-foreground"
          >
            Lnked
            <span
              className="ml-1 text-accent text-3xl leading-none"
              aria-hidden="true"
            >
              .
            </span>
          </Link>
        </div>
      </header>
      <main className="flex-1 container mx-auto flex items-center justify-center px-4 md:px-6 py-8">
        {children}
      </main>
    </div>
  );
}
