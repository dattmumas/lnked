import { headers } from 'next/headers';
import React from 'react';

import RightSidebarSwitcher from '@/components/app/layout/RightSidebarSwitcher';
import { cn } from '@/lib/utils/cn';

import ResizableSidebarClient from './ResizableSidebarClient';

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

export async function ConditionalRightSidebar({
  user,
  profile,
  children,
}: ConditionalRightSidebarProps): Promise<React.ReactElement> {
  const pathname = (await headers()).get('x-matched-path') ?? '';

  // Check if current route should hide the sidebar
  const shouldHideSidebar = ROUTES_WITHOUT_SIDEBAR.some((route) =>
    pathname.startsWith(route),
  );

  return (
    <div
      className={cn(
        'grid flex-1 min-w-0 md:ml-16',
        shouldHideSidebar
          ? 'grid-cols-1'
          : 'xl:[grid-template-columns:minmax(0,1fr)_var(--rsb-width,_640px)]',
      )}
    >
      {/* Main content */}
      <main className="overflow-y-auto min-h-screen">{children}</main>

      {/* Right sidebar desktop only - conditionally rendered */}
      {!shouldHideSidebar && (
        <ResizableSidebarClient initialWidth={640}>
          <RightSidebarSwitcher user={user} profile={profile} />
        </ResizableSidebarClient>
      )}
    </div>
  );
}
