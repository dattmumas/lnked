'use client';

import React from 'react';

import { RightSidebar } from '@/components/app/chains/RightSidebar';
import { CenterFeed } from '@/components/app/home/CenterFeed';
import { FloatingCreateButton } from '@/components/app/home/FloatingCreateButton';
import { Separator } from '@/components/ui/separator';

import type { HomePageClientProps } from '@/types/home/types';

export default function HomePageClient({
  user,
  profile,
}: HomePageClientProps): React.JSX.Element {
  return (
    <div className="h-full w-full flex flex-col">
      <div className="grid flex-1 grid-cols-12 min-h-0">
        <div className="col-span-12 lg:col-span-8 overflow-y-auto h-full">
          <div className="p-6">
            <CenterFeed user={user} />
          </div>
        </div>
        <div className="hidden lg:block lg:col-span-4 border-l h-full">
          <RightSidebar user={user} profile={profile} />
        </div>
      </div>
      <FloatingCreateButton />
    </div>
  );
}
