'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from './sidebar';
import { ConversationPanel } from './conversation-panel';
import { MessageInput } from './message-input';
import { useUser } from '@/hooks/useUser';
import { useCollectiveMemberships } from '@/hooks/posts/useCollectiveMemberships';

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
  const { data: memberships = [], isLoading: loadingMemberships } =
    useCollectiveMemberships(true);

  const [activeCollectiveId, setActiveCollectiveId] = useState<string | null>(
    null,
  );
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);

  // Pick the first collective membership as default once loaded
  useEffect(() => {
    if (!activeCollectiveId && memberships.length > 0) {
      setActiveCollectiveId(memberships[0].id);
    }
  }, [memberships, activeCollectiveId]);

  if (loadingMemberships && !activeCollectiveId) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  // If user has no collective memberships yet, display a friendly prompt.
  if (!activeCollectiveId) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground p-8 text-center">
        You're not a member of any collectives yet. Join a collective first to
        access channels.
      </div>
    );
  }

  return (
    <div className="flex w-full h-full">
      <Sidebar
        collectiveId={activeCollectiveId}
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
