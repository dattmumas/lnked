import React from 'react';

export default function PublicNavBar(): React.ReactElement {
  return (
    <header className="w-full border-b border-border bg-background">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand / Logo */}
        <a
          href="/"
          className="text-lg font-semibold text-foreground hover:text-accent transition-colors"
        >
          Lnked
        </a>

        {/* Auth CTA */}
        <nav>
          <a
            href="/sign-in"
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Sign&nbsp;in
          </a>
        </nav>
      </div>
    </header>
  );
}
