 
'use client';

import React from 'react';

import { RightSidebar } from '@/components/app/chains/RightSidebar';
import { CenterFeed } from '@/components/app/home/CenterFeed';
import { FloatingCreateButton } from '@/components/app/home/FloatingCreateButton';

import type { HomePageClientProps } from '@/types/home/types';


export default function HomePageClient({
  user,
  profile,
}: HomePageClientProps): React.JSX.Element {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 p-4">
        <main className="lg:col-span-8 space-y-6">
          <CenterFeed user={user} />
        </main>
        <aside className="hidden lg:block lg:col-span-4">
          <RightSidebar user={user} profile={profile} />
        </aside>
      </div>
      <FloatingCreateButton />
    </div>
  );
}
