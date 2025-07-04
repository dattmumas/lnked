import { SpeedInsights } from '@vercel/speed-insights/next';
import { redirect } from 'next/navigation';
import React from 'react';

import { ConditionalRightSidebar } from '@/components/app/layout/ConditionalRightSidebar';
import { GlobalSidebar } from '@/components/app/nav/GlobalSidebar';
import ModernNavbar from '@/components/ModernNavbar';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { UserProvider, UserProfile } from '@/providers/UserContext';

// TODO: Build out the shared authenticated layout here.
// 1. Fetch `user` & `profile` with `createServerSupabaseClient`.
// 2. Render global chrome (navbar, GlobalSidebar, RightSidebar).
// 3. Expose `user` / `profile` via context or props.
// 4. Wrap children appropriately.

// Define routes where RightSidebar should be hidden
const ROUTES_WITHOUT_SIDEBAR = [
  '/chat',
  '/settings',
  '/videos/upload',
  '/posts/new',
  '/collectives/new',
];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.ReactElement> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect unauthenticated visitors to sign-in
  if (user === null) {
    redirect('/sign-in?redirect=/');
  }

  let profile: UserProfile | null = null;
  if (user !== null) {
    const { data } = await supabase
      .from('users')
      .select('id, username, full_name, avatar_url, bio')
      .eq('id', user.id)
      .single();
    profile = (data ?? null) as UserProfile | null;
  }

  return (
    <UserProvider user={user} profile={profile}>
      <SpeedInsights />
      <div className="flex min-h-screen flex-col">
        {/* Global navbar (desktop & tablet) */}
        <header className="hidden md:block shrink-0 sticky top-0 z-50 bg-background backdrop-blur-md border-b border-border/50">
          <ModernNavbar />
        </header>

        <div className="flex flex-1">
          {/* app-wide sidebar (desktop only) */}
          <div className="hidden md:block">
            <GlobalSidebar />
          </div>

          {/* Main content and conditional right sidebar */}
          <ConditionalRightSidebar user={user} profile={profile}>
            {children}
          </ConditionalRightSidebar>
        </div>
      </div>
    </UserProvider>
  );
}
