'use client';

import { Search as SearchIcon, X } from 'lucide-react';
import React, { useState, useRef, useCallback } from 'react';

import { cn } from '@/lib/utils';

export default function MobileSearchBar(): React.ReactElement {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleToggle = useCallback((): void => {
    setOpen((prev) => !prev);
    setTimeout(() => {
      if (inputRef.current !== null) inputRef.current.focus();
    }, 50);
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>): void => {
      e.preventDefault();
      const query = inputRef.current?.value.trim();
      if (query && query.length > 0) {
        window.location.href = `/search?q=${encodeURIComponent(query)}`;
        setOpen(false);
      }
    },
    [],
  );

  return (
    <>
      {/* Floating search button */}
      <button
        type="button"
        onClick={handleToggle}
        aria-label="Search"
        className="fixed bottom-24 right-6 z-30 md:hidden p-3 rounded-full bg-background border border-border shadow-lg text-foreground hover:bg-muted transition-colors"
      >
        <SearchIcon className="h-5 w-5" />
      </button>

      {/* Overlay */}
      {open && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Close search"
          onKeyDown={(e) => e.key === 'Escape' && handleToggle()}
          onClick={handleToggle}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
        />
      )}

      {/* Search panel */}
      <form
        onSubmit={handleSubmit}
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50 p-4 bg-background border-t border-border flex gap-3 md:hidden transition-transform',
          open ? 'translate-y-0' : 'translate-y-full',
        )}
      >
        <input
          ref={inputRef}
          type="search"
          placeholder="Search…"
          className="flex-1 rounded-md border border-border bg-muted px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium"
        >
          Go
        </button>
        <button
          type="button"
          onClick={handleToggle}
          aria-label="Close"
          className="p-2"
        >
          <X className="h-5 w-5" />
        </button>
      </form>
    </>
  );
}
