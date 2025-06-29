import React from 'react';

import Footer from '@/components/ui/Footer';
import PublicNavBar from '@/components/ui/PublicNavBar';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { UserProvider, type UserProfile } from '@/providers/UserContext';

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.ReactElement> {
  // Retrieve the currently authenticated user (if any) server-side so that
  // client components rendered under `(public)` routes can access the same
  // user context that authenticated app routes receive from `(app)`.
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch a lightweight user profile to expose via context. We only need a
  // subset of fields that UI components rely on (mirrors AppLayout logic).
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
      <div className="min-h-screen flex flex-col">
        {/* Public navigation bar */}
        <PublicNavBar />

        {/* Page content */}
        <main className="flex-1 container mx-auto px-4 md:px-6 py-8">
          {children}
        </main>

        {/* Footer sticks to the bottom when content is short */}
        <div className="mt-auto">
          <Footer />
        </div>
      </div>
    </UserProvider>
  );
}
