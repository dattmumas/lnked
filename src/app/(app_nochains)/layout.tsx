import { SpeedInsights } from '@vercel/speed-insights/next';
import { redirect } from 'next/navigation';
import React from 'react';
import { Toaster } from 'sonner';

import { ContextualGlobalSidebar } from '@/components/app/nav/ContextualGlobalSidebar';
import ModernNavbar from '@/components/ModernNavbar';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { UserProvider, UserProfile } from '@/providers/UserContext';

export default async function AppNoChainsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/sign-in');
  }

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  return (
    <UserProvider user={user} profile={profile as UserProfile | null}>
      <div className="h-screen bg-background font-sans antialiased flex flex-col">
        <ModernNavbar />
        <main className="flex flex-1 md:ml-16 min-h-0">
          <ContextualGlobalSidebar />
          <div className="flex-1 min-h-0">{children}</div>
        </main>
        <Toaster />
        <SpeedInsights />
      </div>
    </UserProvider>
  );
}
