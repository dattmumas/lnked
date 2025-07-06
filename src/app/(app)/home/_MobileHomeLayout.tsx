'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import React, { useRef, useCallback } from 'react';

import MobileBottomNav from '@/components/app/nav/MobileBottomNav';
import MobileTenantSwitcher from '@/components/app/nav/MobileTenantSwitcher';
import MobileTopSearchBar from '@/components/app/nav/MobileTopSearchBar';
import { cn } from '@/lib/utils';
import { useUser } from '@/providers/UserContext';

/**
 * Mobile-only navigation + any other touch-optimised chrome.
 */
export default function MobileHomeLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const { user } = useUser();

  const router = useRouter();
  const searchParams = useSearchParams();

  const isChainsRoute = searchParams.get('tab') === 'chains';

  const touchStartX = useRef<number | null>(null);

  const isMobileViewport = useCallback((): boolean => {
    return (
      typeof window !== 'undefined' &&
      window.matchMedia('(pointer:coarse) and (max-width: 767px)').matches
    );
  }, []);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent): void => {
      if (!isMobileViewport() || e.touches.length !== 1) return;
      const first = e.touches[0];
      if (!first) return;
      touchStartX.current = first.clientX;
    },
    [isMobileViewport],
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent): void => {
      if (!isMobileViewport() || e.changedTouches.length !== 1) return;
      if (touchStartX.current === null) return;
      const first = e.changedTouches[0];
      if (!first) return;
      const dx = first.clientX - touchStartX.current;
      // Dynamic threshold – 25% of viewport, up to 120px
      const threshold = Math.min(window.innerWidth * 0.25, 120);

      if (dx < -threshold && !isChainsRoute) {
        router.replace('/home?tab=chains', { scroll: false });
      }
      if (dx > threshold && isChainsRoute) {
        router.replace('/home', { scroll: false });
      }
    },
    [isChainsRoute, router, isMobileViewport],
  );

  return (
    <div
      className="flex flex-col min-h-screen overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <MobileTopSearchBar />
      <MobileTenantSwitcher />

      {/* Page indicator */}
      <div className="flex justify-center gap-6 py-2 mt-12 text-xs font-medium text-muted-foreground bg-transparent">
        <button
          type="button"
          onClick={(): void => router.replace('/home', { scroll: false })}
          className={cn(
            'transition-colors',
            !isChainsRoute ? 'font-semibold text-foreground' : '',
          )}
        >
          Posts
        </button>
        <button
          type="button"
          onClick={(): void =>
            router.replace('/home?tab=chains', { scroll: false })
          }
          className={cn(
            'transition-colors',
            isChainsRoute ? 'font-semibold text-foreground' : '',
          )}
        >
          Chains
        </button>
      </div>

      <main
        className={cn(
          'flex-1 pt-2 pb-16 overscroll-contain',
          isChainsRoute ? 'min-h-0 overflow-y-auto' : 'overflow-y-auto',
        )}
      >
        {children}
      </main>

      {/* Bottom navigation */}
      <MobileBottomNav />
    </div>
  );
}
