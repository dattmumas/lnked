'use client';

import { Send, Loader2, X } from 'lucide-react';
import {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
  useLayoutEffect,
} from 'react';

// import { useChat } from '@/lib/hooks/use-chat'; // Temporarily disabled due to server import issue

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUser } from '@/hooks/useUser';
import { useChatV2 } from '@/lib/hooks/use-chat-v2';

import { VirtualMessageList } from './virtual-message-list';

import type { MessageWithSender } from '@/lib/chat/types';

interface ChatPanelProps {
  conversationId: string;
  className?: string;
}

// Constants
const TYPING_DEBOUNCE_DELAY = 3000; // 3 seconds

// Loading state component
function LoadingSpinner({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="flex items-center gap-2">
        <div
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          role="status"
          aria-live="polite"
        />
        {children}
      </div>
    </div>
  );
}

// Empty state component
function EmptyState({
  variant,
}: {
  variant: 'no-conversation' | 'no-messages';
}): React.ReactElement {
  if (variant === 'no-conversation') {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <svg
            className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <p className="text-lg font-medium mb-2">No conversation selected</p>
          <p className="text-sm text-muted-foreground">
            Choose a conversation to start messaging
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center text-center p-8">
      <div>
        <p className="text-muted-foreground mb-2">No messages yet</p>
        <p className="text-sm text-muted-foreground">
          Start the conversation by sending a message below
        </p>
      </div>
    </div>
  );
}

// Error state component
function ErrorState({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}): React.ReactElement {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <p className="text-destructive mb-2">Error: {error}</p>
        <button
          onClick={onRetry}
          className="text-sm text-primary hover:underline"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

// Custom hook for typing indicator
function useTypingIndicator(chat: ReturnType<typeof useChatV2>): {
  isTyping: boolean;
  startTyping: () => void;
  stopTyping: () => void;
} {
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const startTyping = useCallback((): void => {
    // Clear any existing timeout first to avoid double scheduling
    if (typingTimeoutRef.current !== null) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    // Start typing if not already typing
    if (!isTyping) {
      setIsTyping(true);
      void chat.startTyping();
    }

    // Set debounced stop timeout
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      void chat.stopTyping();
      typingTimeoutRef.current = null;
    }, TYPING_DEBOUNCE_DELAY);
  }, [isTyping, chat]);

  const stopTyping = useCallback((): void => {
    if (typingTimeoutRef.current !== null) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    if (isTyping) {
      setIsTyping(false);
      void chat.stopTyping();
    }
  }, [isTyping, chat]);

  // Cleanup on unmount
  useEffect(() => {
    return (): void => {
      if (typingTimeoutRef.current !== null) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return { isTyping, startTyping, stopTyping };
}

export function ChatPanel({
  conversationId,
  className,
}: ChatPanelProps): React.ReactElement {
  const { user } = useUser();
  const chat = useChatV2();
  const { startTyping, stopTyping } = useTypingIndicator(chat);

  const [message, setMessage] = useState('');
  const [replyTarget, setReplyTarget] = useState<MessageWithSender | null>(
    null,
  );

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const didSendRef = useRef(false);

  // Get conversation details and data
  const conversation = chat.activeConversation;

  // Efficient message deduplication using Set
  const messages = useMemo(() => {
    const rawMessages = chat.messages;
    if (
      rawMessages === null ||
      rawMessages === undefined ||
      rawMessages.length === 0
    ) {
      return [];
    }

    const seen = new Set<string>();
    return rawMessages.filter((message) => {
      if (seen.has(message.id)) {
        return false;
      }
      seen.add(message.id);
      return true;
    });
  }, [chat.messages]);

  const isLoading = chat.isLoadingMessages;
  const { isLoadingConversations, isSendingMessage, error } = chat;

  // Load initial conversation when conversationId changes
  // Extract setActiveConversation to avoid including entire chat object in deps
  const { setActiveConversation } = chat;

  useEffect(() => {
    if (conversationId && conversation?.id !== conversationId) {
      void setActiveConversation(conversationId);
    }
  }, [conversationId, conversation?.id, setActiveConversation]);

  // Handle focus management after message sends - runs after DOM commit but before paint
  useLayoutEffect(() => {
    if (didSendRef.current) {
      inputRef.current?.focus();
      didSendRef.current = false;
    }
  });

  const handleSendMessage = useCallback(async (): Promise<void> => {
    if (!message.trim() || conversation === null || conversation === undefined)
      return;

    const trimmedMessage = message.trim();
    setMessage('');
    stopTyping();
    didSendRef.current = true; // Mark that we just sent a message

    try {
      const result = await chat.sendMessage({
        content: trimmedMessage,
        message_type: 'text',
        ...(replyTarget ? { reply_to_id: replyTarget.id } : {}),
      });

      if (result) {
        // Clear reply target on successful send
        setReplyTarget(null);
      } else {
        // Restore message if send failed
        setMessage(trimmedMessage);
        didSendRef.current = true; // Still want to refocus on failure
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      // Restore message on error
      setMessage(trimmedMessage);
      didSendRef.current = true; // Still want to refocus on error
    }
  }, [message, conversation, replyTarget, chat, stopTyping]);

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent): void => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        void handleSendMessage();
      } else if (e.key === 'Escape' && replyTarget) {
        setReplyTarget(null);
      }
    },
    [handleSendMessage, replyTarget],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
      const { value } = e.target;
      setMessage(value);

      // Clear reply target on manual edit if send failed previously
      if (replyTarget && value.length === 0) {
        setReplyTarget(null);
      }

      if (value.length > 0) {
        startTyping();
      } else {
        stopTyping();
      }
    },
    [replyTarget, startTyping, stopTyping],
  );

  const handleLoadMore = useCallback((): void => {
    if (chat.hasMoreMessages && !chat.isLoadingMessages) {
      void chat.loadMoreMessages();
    }
  }, [chat.hasMoreMessages, chat.isLoadingMessages, chat.loadMoreMessages]);

  const handleMessageInView = useCallback((messageId: string): void => {
    // Mark message as read when it comes into view
    // TODO: Implement message tracking logic when message comes into view
    // This would typically mark the message as read and update read receipts
    void messageId; // Acknowledge parameter to avoid unused parameter warning
  }, []);

  const clearReply = useCallback((): void => {
    setReplyTarget(null);
    didSendRef.current = true; // Trigger focus via useLayoutEffect
  }, []);

  const handleRetry = useCallback((): void => {
    chat.clearError();
  }, [chat]);

  const handleSendClick = useCallback((): void => {
    void handleSendMessage();
  }, [handleSendMessage]);

  // Error display
  if (error !== null && error !== undefined) {
    return (
      <div className={className}>
        <ErrorState error={error} onRetry={handleRetry} />
      </div>
    );
  }

  // Loading state for conversations
  if (isLoadingConversations) {
    return (
      <div className={className}>
        <LoadingSpinner>Loading conversations...</LoadingSpinner>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className={className}>
        <EmptyState variant="no-conversation" />
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full min-h-0 ${className ?? ''}`}>
      {/* Messages - Virtual List */}
      <VirtualMessageList
        messages={messages}
        currentUserId={user?.id ?? ''}
        conversationId={conversationId}
        onLoadMore={handleLoadMore}
        hasMore={chat.hasMoreMessages}
        isLoading={isLoading}
        onMessageInView={handleMessageInView}
      />

      {/* Input */}
      <div className="shrink-0 border-t bg-background/95 backdrop-blur-sm">
        {/* Reply preview */}
        {replyTarget && (
          <div
            className="px-4 py-2 bg-muted/50 border-b flex items-center justify-between cursor-pointer hover:bg-muted/70 transition-colors"
            onClick={clearReply}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                clearReply();
              }
            }}
            aria-label="Reply preview. Click to cancel or press Escape"
          >
            <div className="flex-1 min-w-0 pointer-events-none">
              <p className="text-xs text-muted-foreground">
                Replying to{' '}
                <span className="font-medium">
                  {replyTarget.sender?.username ??
                    replyTarget.sender?.full_name ??
                    'Unknown'}
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
                clearReply();
              }}
              className="h-8 w-8 p-0 hover:bg-muted-foreground/20"
              aria-label="Cancel reply"
              title="Cancel reply (Esc)"
            >
              <X className="h-4 w-4" />
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
                disabled={isSendingMessage}
                aria-label="Message input"
                rows={1}
                style={{
                  height: 'auto',
                  minHeight: '48px',
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
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
              onClick={handleSendClick}
              disabled={!message.trim() || isSendingMessage}
              size="icon"
              className="h-12 w-12 rounded-full"
              aria-label="Send message"
            >
              {isSendingMessage ? (
                <Loader2
                  className="h-5 w-5 animate-spin"
                  role="status"
                  aria-live="polite"
                />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
