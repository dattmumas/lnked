'use client';

import { useEffect, useState, useRef } from 'react';
import { selectAdapter } from '@/lib/chat/realtime-adapter';
import clsx from 'clsx';

const realTime = selectAdapter();

interface Props {
  channelId: string;
  className?: string;
}

export function MessageInput({ channelId, className }: Props) {
  const [text, setText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const lastSentRef = useRef<number>(0);

  // Debounce typing stop
  useEffect(() => {
    if (!channelId) return;
    if (isTyping) {
      realTime.broadcastTyping(channelId, true);
      const timeout = setTimeout(() => {
        setIsTyping(false);
        void Promise.resolve(realTime.broadcastTyping(channelId, false)).catch(
          console.error,
        );
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [isTyping, channelId]);

  const handleSend = async () => {
    const content = text.trim();
    if (!content) return;
    setText('');
    setIsTyping(false);

    try {
      await fetch(`/api/chat/${channelId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      lastSentRef.current = Date.now();
    } catch (err) {
      console.error('Failed to send message', err);
    }
  };

  return (
    <div
      className={clsx(
        'flex items-center gap-2 border-t border-border p-2',
        className,
      )}
    >
      <input
        type="text"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setIsTyping(true);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            void handleSend();
          }
        }}
        placeholder="Type a message…"
        className="flex-1 rounded border bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
      />
      <button
        type="button"
        onClick={() => handleSend()}
        className="rounded bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/80 disabled:opacity-50"
        disabled={!text.trim()}
      >
        Send
      </button>
    </div>
  );
}
