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

  return (
    <div className="flex flex-col h-full items-center">
      <div className="w-full max-w-6xl h-full">
        <TenantChatInterface />
      </div>
    </div>
  );
}
