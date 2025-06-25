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
    <div className="fixed inset-0 top-16 flex h-[calc(100vh-4rem)] w-full">
      {/* ChatInterface is a client component */}
      <TenantChatInterface userId={user.id} />
    </div>
  );
}
