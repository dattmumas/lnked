import { redirect } from 'next/navigation';
import React from 'react';

import ChatInterface from '@/components/chat/ChatInterface';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function ChatPage(): Promise<React.ReactElement> {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/sign-in');
  }

  return (
    <div className="fixed inset-0 top-16 flex h-[calc(100vh-4rem)] w-full">
      {/* ChatInterface is a client component */}
      <ChatInterface userId={user.id} />
    </div>
  );
}
