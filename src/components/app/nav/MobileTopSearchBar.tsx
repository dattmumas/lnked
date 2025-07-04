'use client';

import { Search as SearchIcon } from 'lucide-react';
import React, { useCallback, useRef } from 'react';

import { cn } from '@/lib/utils';

/**
 * MobileTopSearchBar – an always-visible search bar for mobile views.
 * Appears at the very top of the viewport and stays sticky while scrolling.
 */
export default function MobileTopSearchBar(): React.ReactElement {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>): void => {
      e.preventDefault();
      const query = inputRef.current?.value.trim();
      if (query && query.length > 0) {
        // Use client-side navigation when available
        window.location.href = `/search?q=${encodeURIComponent(query)}`;
      }
    },
    [],
  );

  return (
    <div
      className={cn(
        'fixed top-0 left-0 z-30 w-full bg-background/60 supports-[backdrop-filter]:bg-background/40',
        'md:hidden',
      )}
    >
      <form
        onSubmit={handleSubmit}
        className="mx-auto flex w-10/12 max-w-xs items-center gap-2 px-4 py-2"
      >
        <div className="relative flex-1">
          <SearchIcon
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            type="search"
            placeholder="Search…"
            aria-label="Search"
            className="w-full h-9 rounded-full border border-white/20 bg-white/10 backdrop-blur-sm shadow-sm
    pl-10 pr-4 text-sm placeholder:text-muted-foreground
    focus:outline-none focus:ring-2 focus:ring-ring
    dark:bg-white/5 dark:border-white/10
  "
          />
        </div>
      </form>
    </div>
  );
}
