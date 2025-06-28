'use client';

import { Home, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

import SearchBar from '@/components/app/nav/SearchBar';
import { UserNav } from '@/components/app/nav/UserNav';
import TenantSwitcher from '@/components/app/tenant/TenantSwitcher';
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown';
import { NavIcon } from '@/components/ui/icon';
import { useUser } from '@/hooks/useUser';

import ModeToggle from './app/nav/ModeToggle';

export default function ModernNavbar(): React.ReactElement {
  const { user } = useUser();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 md:px-6 lg:px-8">
        {/* Left: Navigation icons */}
        <div className="flex items-center gap-3">
          {user && (
            <Link
              href="/home"
              className="flex items-center justify-center h-12 w-12 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors duration-200 group"
              aria-label="Home"
            >
              <NavIcon icon={Home} />
            </Link>
          )}

          {user && (
            <Link
              href="/chat"
              className="flex items-center justify-center h-12 w-12 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors duration-200 group"
              aria-label="Chat"
            >
              <NavIcon icon={MessageCircle} />
            </Link>
          )}
        </div>

        {/* Center: Search bar - takes available space */}
        <div className="flex-1 max-w-2xl mx-6">
          <SearchBar className="w-full" />
        </div>

        {/* Right: User actions */}
        <div className="flex items-center gap-3">
          <ModeToggle />
          <NotificationDropdown />
          {user && <TenantSwitcher />}
          <UserNav />
        </div>
      </div>
    </header>
  );
}
