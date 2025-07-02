'use client';

import { usePathname } from 'next/navigation';
import React from 'react';

import { RightSidebar } from '@/components/app/chains/RightSidebar';
import { cn } from '@/lib/utils/cn';

interface ConditionalRightSidebarProps {
  user: {
    id: string;
    email?: string;
  };
  profile: {
    id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
    bio: string | null;
  } | null;
  children: React.ReactNode;
}

// Define routes where RightSidebar should be hidden
const ROUTES_WITHOUT_SIDEBAR = [
  '/chat',
  '/settings',
  '/videos/upload',
  '/posts/new',
  '/collectives/new',
];

export function ConditionalRightSidebar({
  user,
  profile,
  children,
}: ConditionalRightSidebarProps): React.ReactElement {
  const pathname = usePathname();

  // Check if current route should hide the sidebar
  const shouldHideSidebar = ROUTES_WITHOUT_SIDEBAR.some((route) =>
    pathname.startsWith(route),
  );

  return (
    <div
      className={cn(
        'grid flex-1 min-w-0 ml-16',
        shouldHideSidebar
          ? 'grid-cols-1'
          : 'grid-cols-1 xl:grid-cols-[minmax(0,1fr)_32rem]',
      )}
    >
      {/* Main content */}
      <main className="overflow-y-auto min-h-screen">{children}</main>

      {/* Right sidebar desktop only - conditionally rendered */}
      {!shouldHideSidebar && (
        <aside className="hidden xl:block w-[32rem] flex-shrink-0 sticky top-16 h-[calc(100vh_-_4rem)] overflow-y-auto">
          <RightSidebar user={user} profile={profile} />
        </aside>
      )}
    </div>
  );
}
