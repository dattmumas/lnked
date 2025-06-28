'use client';

import { CenterFeed } from '@/components/app/home/CenterFeed';
import { FloatingCreateButton } from '@/components/app/home/FloatingCreateButton';
import { useUser } from '@/providers/UserContext';

export default function HomePageClient(): React.JSX.Element {
  const { user } = useUser();
  return (
    <div className="relative flex h-full">
      {/* Center feed – scrollable */}
      <main className="flex-1 w-0 min-w-0 overflow-y-auto p-6 min-h-screen">
        {user && <CenterFeed user={user} />}
      </main>

      {/* Floating action button (mobile only) */}
      <FloatingCreateButton />
    </div>
  );
}
