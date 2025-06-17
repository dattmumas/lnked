'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChannelSidebar } from '@/components/chat/channel-sidebar';
import { ConversationPanel } from '@/components/chat/conversation-panel';
import { MessageInput } from '@/components/chat/message-input';
import { QueryProvider } from '@/components/providers/query-provider';
import { useUser } from '@/hooks/useUser';

interface ChannelMinimal {
  id: string;
  title: string | null;
  isAnnouncement?: boolean | null;
  description?: string | null;
}

export default function ChatPage() {
  const router = useRouter();
  const { user, loading } = useUser();
  const [activeChannel, setActiveChannel] = useState<ChannelMinimal | null>(
    null,
  );

  if (loading) return null;

  if (!user) {
    router.push('/sign-in');
    return null;
  }

  const collectiveId = (user as any).collective_id ?? user.id;

  return (
    <QueryProvider>
      <div className="chat-page flex h-screen">
        {/* Sidebar */}
        <div className="w-64 bg-muted/80 border-r border-border">
          <ChannelSidebar
            collectiveId={collectiveId}
            selectedChannelId={activeChannel?.id}
            onSelectChannel={(ch) =>
              setActiveChannel(ch as unknown as ChannelMinimal)
            }
            className="h-full"
          />
        </div>

        {/* Main */}
        <div className="flex-1 flex flex-col bg-background">
          {activeChannel ? (
            <>
              <div className="border-b border-border px-4 py-3">
                <h2 className="text-lg font-semibold">
                  # {activeChannel.title}
                </h2>
              </div>
              <ConversationPanel
                channelId={activeChannel.id}
                className="flex-1"
              />
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-muted-foreground">
              Select a channel from the sidebar to start chatting
            </div>
          )}
          {/* Composer visible when channel selected */}
          {activeChannel && <MessageInput channelId={activeChannel.id} />}
        </div>
      </div>
    </QueryProvider>
  );
}
