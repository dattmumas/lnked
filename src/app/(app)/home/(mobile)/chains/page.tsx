'use client';

import { useRouter } from 'next/navigation';
import React, { useEffect } from 'react';

import RightSidebarFeed from '@/components/app/chains/RightSidebarFeed';
import { useUser } from '@/providers/UserContext';

export default function ChainsMobilePage(): React.ReactElement {
  const { user, profile } = useUser();
  const router = useRouter();

  // If desktop viewport, redirect back to posts
  useEffect(() => {
    if (window.matchMedia('(min-width: 1024px)').matches) {
      router.replace('/home');
    }
  }, [router]);

  if (!user) return <div className="flex-1" />;

  return (
    <div className="flex flex-col h-screen pt-14 pb-16 overscroll-contain">
      <div className="flex-1 min-h-0 h-full overflow-y-hidden">
        <RightSidebarFeed
          user={{ id: user.id, ...(user.email ? { email: user.email } : {}) }}
          profile={profile ?? null}
        />
      </div>
    </div>
  );
}
