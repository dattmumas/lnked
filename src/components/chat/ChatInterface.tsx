'use client';

import { useState } from 'react';
import { Sidebar } from './sidebar';
import { ConversationPanel } from './conversation-panel';
import { MessageInput } from './message-input';
import { useUser } from '@/hooks/useUser';

interface ChatInterfaceProps {
  userId: string;
}

type Channel = {
  id: string;
  title: string | null;
  isAnnouncement?: boolean | null;
};

export default function ChatInterface({ userId }: ChatInterfaceProps) {
  const { user } = useUser();
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);

  const collectiveId = (user as any)?.collective_id ?? userId;

  return (
    <div className="flex w-full h-full">
      <Sidebar
        collectiveId={collectiveId}
        selectedChannelId={activeChannel?.id}
        onSelectChannel={(ch: { id: string; title: string | null }) =>
          setActiveChannel(ch as Channel)
        }
      />

      <div className="flex flex-1 flex-col bg-background">
        {activeChannel ? (
          <>
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-lg font-semibold"># {activeChannel.title}</h2>
            </div>
            <ConversationPanel
              channelId={activeChannel.id}
              className="flex-1"
            />
            <MessageInput channelId={activeChannel.id} />
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-muted-foreground">
            Select a channel from the sidebar to start chatting
          </div>
        )}
      </div>
    </div>
  );
}
