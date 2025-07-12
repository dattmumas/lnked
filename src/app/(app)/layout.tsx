import { SpeedInsights } from '@vercel/speed-insights/next';
import { redirect } from 'next/navigation';
import { Toaster } from 'sonner';

import { ConditionalRightSidebar } from '@/components/app/layout/ConditionalRightSidebar';
import { ContextualGlobalSidebar } from '@/components/app/nav/ContextualGlobalSidebar';
import ModernNavbar from '@/components/ModernNavbar';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { UserProvider, UserProfile } from '@/providers/UserContext';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.ReactElement> {
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
      <div className="min-h-screen bg-background font-sans antialiased">
        <ModernNavbar />
        <div className="relative flex min-h-[calc(100vh-4rem)]">
          <ContextualGlobalSidebar />
          <div className="flex-1 transition-all duration-200 ease-in-out md:ml-16">
            <ConditionalRightSidebar user={user} profile={profile}>
              {children}
            </ConditionalRightSidebar>
          </div>
        </div>
        <Toaster />
        <SpeedInsights />
      </div>
    </UserProvider>
  );
}
