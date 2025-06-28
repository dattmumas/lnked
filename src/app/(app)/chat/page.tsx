import { redirect } from 'next/navigation';
import React from 'react';

import TenantChatInterface from '@/components/chat/TenantChatInterface';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function ChatPage(): Promise<React.ReactElement> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user === null) {
    redirect('/sign-in');
  }

  // Fetch user profile for the chains sidebar
  const { data: profile } = await supabase
    .from('users')
    .select('id, username, full_name, avatar_url, bio')
    .eq('id', user.id)
    .single();

  return (
    <div className="h-full">
      {/* Main container with responsive grid */}
      <div className="h-full flex">
        {/* Chat Interface - responsive width */}
        <div className="flex-1 min-w-0">
          <TenantChatInterface />
        </div>
      </div>
    </div>
  );
}
