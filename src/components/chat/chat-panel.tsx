'use client';

import type { MessageWithSender } from '@/lib/chat/types';
import { ConversationPanel } from './conversation-panel';

type Channel = {
  id: string;
  title: string | null;
  isAnnouncement?: boolean | null;
  type?: string;
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
        <h2 className="text-lg font-semibold">
          {channel.type === 'direct' ? (
            <span className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              {channel.title}
            </span>
          ) : (
            <>
              <span className="text-muted-foreground">#</span> {channel.title}
            </>
          )}
        </h2>
      </div>
      {/* Messages - ConversationPanel already includes MessageInput at the bottom */}
      <ConversationPanel channelId={channel.id} className="flex-1" />
    </div>
  );
}
