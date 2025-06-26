'use client';

import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';

import { VirtualMessageList } from './virtual-message-list';

import type { MessageWithSender } from '@/lib/chat/types';

interface ChatPanelProps {
  conversationId: string;
  messages: MessageWithSender[];
  isLoading: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  isFetchingNextPage: boolean;
  onSendMessage: (content: string, replyToId?: string) => Promise<void>;
  replyTarget?: MessageWithSender | null;
  onReplyCancel?: () => void;
  currentUserId: string;
  className?: string;
}

const MAX_TEXTAREA_HEIGHT = 120;

export function ChatPanel({
  conversationId,
  messages,
  isLoading,
  hasNextPage,
  fetchNextPage,
  isFetchingNextPage,
  onSendMessage,
  replyTarget,
  onReplyCancel,
  currentUserId,
  className,
}: ChatPanelProps): React.ReactElement {
  const [message, setMessage] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const didSendRef = useRef(false);

  useLayoutEffect(() => {
    if (didSendRef.current) {
      inputRef.current?.focus();
      didSendRef.current = false;
    }
  });

  const handleSendMessage = useCallback(async () => {
    const trimmed = message.trim();
    if (!trimmed) return;
    setMessage('');
    didSendRef.current = true;
    await onSendMessage(trimmed, replyTarget?.id);
  }, [message, onSendMessage, replyTarget?.id]);

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        void handleSendMessage();
      } else if (e.key === 'Escape' && replyTarget && onReplyCancel) {
        onReplyCancel();
      }
    },
    [handleSendMessage, replyTarget, onReplyCancel],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setMessage(e.target.value);
    },
    [],
  );

  if (isLoading) {
    return (
      <div
        className={`flex items-center justify-center h-full ${className ?? ''}`}
      >
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="animate-spin h-4 w-4 border-2 border-t-transparent border-gray-400 rounded-full" />
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full min-h-0 ${className ?? ''}`}>
      {/* Messages - Virtual List */}
      <VirtualMessageList
        conversationId={conversationId}
        messages={messages}
        currentUserId={currentUserId}
        onLoadMore={fetchNextPage}
        hasMore={hasNextPage}
        isLoading={isFetchingNextPage}
      />

      {/* Input */}
      <div className="shrink-0 border-t bg-background/95 backdrop-blur-sm">
        {/* Reply preview */}
        {replyTarget && (
          <div
            className="px-4 py-2 bg-muted/50 border-b flex items-center justify-between cursor-pointer hover:bg-muted/70 transition-colors"
            onClick={onReplyCancel}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onReplyCancel?.();
              }
            }}
            aria-label="Reply preview. Click to cancel or press Escape"
          >
            <div className="flex-1 min-w-0 pointer-events-none">
              <p className="text-xs text-muted-foreground">
                Replying to{' '}
                <span className="font-medium">
                  {replyTarget.sender?.username ?? 'Unknown'}
                </span>
                <span className="ml-2 text-xs opacity-60">(Esc to cancel)</span>
              </p>
              <p className="text-sm truncate">{replyTarget.content}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onReplyCancel?.();
              }}
              className="h-8 w-8 p-0 hover:bg-muted-foreground/20"
              aria-label="Cancel reply"
              title="Cancel reply (Esc)"
            >
              <span className="text-lg">×</span>
            </Button>
          </div>
        )}

        {/* Message input */}
        <div className="p-4">
          <div className="flex gap-3 items-end">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={message}
                onChange={handleInputChange}
                onKeyDown={handleKeyPress}
                placeholder={
                  replyTarget
                    ? `Reply to ${replyTarget.sender?.username ?? 'message'}...`
                    : 'Type a message...'
                }
                className="w-full min-h-[48px] max-h-[120px] resize-none rounded-2xl bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Message input"
                rows={1}
                style={{
                  height: 'auto',
                  minHeight: '48px',
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = `${Math.min(target.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
                }}
              />
              {/* Emoji picker button */}
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                title="Add emoji"
              >
                😊
              </button>
            </div>
            <Button
              onClick={() => void handleSendMessage()}
              disabled={message.trim().length === 0}
              size="icon"
              className="h-12 w-12 rounded-full"
              aria-label="Send message"
            >
              <span className="text-lg">➤</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
