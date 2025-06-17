'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { selectAdapter } from '@/lib/chat/realtime-adapter';
import type {
  MessageWithSender as Message,
  TypingIndicator,
} from '@/lib/chat/types';
import clsx from 'clsx';
import { MessageInput } from './message-input';

const realTime = selectAdapter();

interface Props {
  channelId?: string;
  className?: string;
}

export function ConversationPanel({ channelId, className }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingIndicator[]>([]);
  const listRef = useRef<HTMLUListElement>(null);
  const queryClient = useQueryClient();

  // Helper to keep scroll at bottom when user near bottom
  const scrollToBottom = useCallback(() => {
    const ul = listRef.current;
    if (!ul) return;
    ul.scrollTop = ul.scrollHeight;
  }, []);

  // Initial fetch
  useEffect(() => {
    if (!channelId) return;
    (async () => {
      try {
        const res = await fetch(`/api/channels/${channelId}/messages?limit=50`);
        if (!res.ok) throw new Error('Failed to fetch messages');
        const data: Message[] = await res.json();
        setMessages(data);
        // Cache in React Query for quick channel switching
        queryClient.setQueryData(['channel-messages', channelId], data);
        scrollToBottom();
      } catch (err) {
        console.error(err);
      }
    })();
  }, [channelId, queryClient, scrollToBottom]);

  // Real-time subscription
  useEffect(() => {
    if (!channelId) return;
    const unsubPromise = realTime.subscribe(channelId, {
      onMessage: (newMsg: Message) => {
        setMessages((prev) => [...prev, newMsg]);
        scrollToBottom();
      },
      onMessageUpdate: (updated: Message) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === updated.id ? updated : m)),
        );
      },
      onMessageDelete: (deletedId: string) => {
        setMessages((prev) => prev.filter((m) => m.id !== deletedId));
      },
      onTyping: (typing: TypingIndicator[]) => {
        setTypingUsers(typing);
      },
    } as any);
    return () => {
      void unsubPromise.then((unsub) => unsub?.());
    };
  }, [channelId, scrollToBottom]);

  // Load older on scroll top
  useEffect(() => {
    const ul = listRef.current;
    if (!ul) return;

    const handleScroll = () => {
      if (ul.scrollTop === 0 && messages.length) {
        void (async () => {
          const oldest = messages[0].created_at;
          if (!oldest) return;
          try {
            const res = await fetch(
              `/api/chat/${channelId}/messages?before=${encodeURIComponent(oldest)}&limit=50`,
            );
            if (!res.ok) return;
            const older: Message[] = await res.json();
            if (older.length) {
              setMessages((prev) => [...older, ...prev]);
              // maintain scroll position after prepending
              ul.scrollTop = ul.scrollHeight - ul.clientHeight - 1;
            }
          } catch (err) {
            console.error(err);
          }
        })();
      }
    };

    ul.addEventListener('scroll', handleScroll);
    return () => ul.removeEventListener('scroll', handleScroll);
  }, [messages, channelId]);

  return (
    <div className={clsx('flex flex-col h-full', className)}>
      <ul ref={listRef} className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
        {messages.map((msg) => (
          <li key={msg.id} className="text-sm">
            <span className="font-medium mr-2">
              {msg.sender?.username ?? 'Anon'}
            </span>
            <span>{msg.content}</span>
          </li>
        ))}
      </ul>
      {typingUsers.length > 0 && (
        <div className="px-4 py-1 text-xs text-muted-foreground">
          {typingUsers.map((t) => t.user_id).join(', ')} typing…
        </div>
      )}
      <MessageInput channelId={channelId!} />
    </div>
  );
}
