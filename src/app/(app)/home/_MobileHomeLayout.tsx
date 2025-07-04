'use client';

import React from 'react';

import MobileBottomNav from '@/components/app/nav/MobileBottomNav';
import MobileTenantSwitcher from '@/components/app/nav/MobileTenantSwitcher';
import MobileTopSearchBar from '@/components/app/nav/MobileTopSearchBar';

/**
 * Mobile-only navigation + any other touch-optimised chrome.
 */
export default function MobileHomeLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="flex flex-col min-h-screen">
      <MobileTopSearchBar />
      <MobileTenantSwitcher />
      <main className="flex-1 overflow-y-auto pt-14 pb-16">{children}</main>

      {/* Bottom navigation */}
      <MobileBottomNav />
    </div>
  );
}
