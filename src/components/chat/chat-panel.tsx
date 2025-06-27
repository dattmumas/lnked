'use client';

import { Send, Smile, X } from 'lucide-react';
import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/useToast';
import { cn } from '@/lib/utils/cn';

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
}: ChatPanelProps): React.JSX.Element {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSendMessage = useCallback(async () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || isSending) return;

    setIsSending(true);
    const originalMessage = message;
    setMessage('');

    try {
      await onSendMessage(trimmedMessage, replyTarget?.id);
    } catch (error) {
      toast('Failed to send message. Please try again.');
      setMessage(originalMessage);
    } finally {
      setIsSending(false);
      textareaRef.current?.focus();
    }
  }, [message, isSending, onSendMessage, replyTarget?.id, toast]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        void handleSendMessage();
      }
    },
    [handleSendMessage],
  );

  useLayoutEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  return (
    <div className={cn('flex flex-col h-full min-h-0', className)}>
      <div className="flex-1 relative">
        <VirtualMessageList
          messages={messages}
          currentUserId={currentUserId}
          conversationId={conversationId}
          onLoadMore={fetchNextPage}
          hasMore={hasNextPage}
          isLoading={isFetchingNextPage}
        />
      </div>

      <div className="p-4 border-t border-border bg-background/80 backdrop-blur-sm">
        {replyTarget && (
          <div className="relative mb-2 rounded-md bg-muted p-2 text-sm">
            <p className="text-muted-foreground">
              Replying to{' '}
              <strong className="text-foreground">
                {replyTarget.sender?.username ?? '...'}
              </strong>
            </p>
            <p className="truncate italic text-muted-foreground/80">
              {replyTarget.content}
            </p>
            <button
              type="button"
              onClick={onReplyCancel}
              className="absolute top-1 right-1 p-1 rounded-full hover:bg-muted-foreground/20"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="relative flex items-end gap-2">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 resize-none bg-muted/50 border-border pr-20"
          />
          <div className="absolute right-2 bottom-2 flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground"
            >
              <Smile className="h-5 w-5" />
            </Button>
            <Button
              size="icon"
              onClick={handleSendMessage}
              disabled={!message.trim() || isSending}
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
