import { redirect } from 'next/navigation';
import React from 'react';

import TenantChatInterface from '@/components/chat/TenantChatInterface';
import { loadChatData } from '@/lib/data-loaders/chat-loader';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function ChatPage(): Promise<React.ReactElement> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user === null) {
    redirect('/sign-in?redirect=/chat');
  }

  // Load initial chat data server-side
  const chatData = await loadChatData(user.id);

  return (
    <div className="h-full">
      {/* Main container with responsive grid */}
      <div className="h-full flex">
        {/* Chat Interface - responsive width */}
        <div className="flex-1 min-w-0">
          <TenantChatInterface initialData={chatData} userId={user.id} />
        </div>
      </div>
    </div>
  );
}
