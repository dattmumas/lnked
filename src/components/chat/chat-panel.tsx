'use client';

import type { MessageWithSender } from '@/lib/chat/types';
import { ConversationPanel } from './conversation-panel';
import { MessageInput } from './message-input';

type Channel = {
  id: string;
  title: string | null;
  isAnnouncement?: boolean | null;
};

interface ChatPanelProps {
  channel: Channel | null;
}

export function ChatPanel({ channel }: ChatPanelProps) {
  if (!channel) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        Select a conversation or channel
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-lg font-semibold"># {channel.title}</h2>
      </div>
      {/* Messages */}
      <ConversationPanel channelId={channel.id} className="flex-1" />
      {/* Composer */}
      <MessageInput channelId={channel.id} />
    </div>
  );
}
