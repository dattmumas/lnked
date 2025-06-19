'use client';

import { Send, Loader2, X } from 'lucide-react';
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';

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

// Loading state component
function LoadingSpinner({ children }: { children: React.ReactNode }) {
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
}) {
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
}) {
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
function useTypingIndicator(chat: ReturnType<typeof useChatV2>) {
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const startTyping = useCallback(() => {
    if (!isTyping) {
      setIsTyping(true);
      chat.startTyping();
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      chat.stopTyping();
    }, 3000);
  }, [isTyping, chat]);

  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (isTyping) {
      setIsTyping(false);
      chat.stopTyping();
    }
  }, [isTyping, chat]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return { isTyping, startTyping, stopTyping };
}

export function ChatPanel({ conversationId, className }: ChatPanelProps) {
  const { user } = useUser();
  const chat = useChatV2();
  const { isTyping, startTyping, stopTyping } = useTypingIndicator(chat);

  const [message, setMessage] = useState('');
  const [replyTarget, setReplyTarget] = useState<MessageWithSender | null>(
    null,
  );

  const inputRef = useRef<HTMLInputElement>(null);

  // Get conversation details and data
  const conversation = chat.activeConversation;
  const rawMessages = chat.messages || [];

  // Efficient message deduplication using Set
  const messages = useMemo(() => {
    const seen = new Set<string>();
    return rawMessages.filter((message) => {
      if (seen.has(message.id)) {
        return false;
      }
      seen.add(message.id);
      return true;
    });
  }, [rawMessages]);

  const isLoading = chat.isLoadingMessages;
  const { isLoadingConversations, isSendingMessage, error } = chat;
  const typingUsers = chat.typingUsers || [];

  // Load initial conversation when conversationId changes
  // Using conversationId directly in deps to avoid function dependency issues
  useEffect(() => {
    if (conversationId && conversation?.id !== conversationId) {
      console.log('Setting active conversation:', conversationId);
      chat.setActiveConversation(conversationId);
    }
  }, [conversationId, conversation?.id]); // Removed chat.setActiveConversation from deps

  const handleSendMessage = useCallback(async () => {
    if (!message.trim() || !conversation) return;

    const trimmedMessage = message.trim();
    setMessage('');
    stopTyping();

    try {
      const result = await chat.sendMessage({
        content: trimmedMessage,
        message_type: 'text',
        ...(replyTarget ? { reply_to_id: replyTarget.id } : {}),
      });

      if (result) {
        // Clear reply target and focus input on successful send
        setReplyTarget(null);
        inputRef.current?.focus();
      } else {
        // Restore message if send failed
        setMessage(trimmedMessage);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      // Restore message on error
      setMessage(trimmedMessage);
    }
  }, [message, conversation, replyTarget, chat, stopTyping]);

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      } else if (e.key === 'Escape' && replyTarget) {
        setReplyTarget(null);
      }
    },
    [handleSendMessage, replyTarget],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
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

  const handleLoadMore = useCallback(() => {
    if (chat.hasMoreMessages && !chat.isLoadingMessages) {
      chat.loadMoreMessages();
    }
  }, [chat]);

  const handleMessageInView = useCallback(
    (messageId: string) => {
      // Mark message as read when it comes into view
      const messageItem = messages.find(
        (m: MessageWithSender) => m.id === messageId,
      );
      if (messageItem && conversation) {
        console.log('Message in view:', messageId);
      }
    },
    [messages, conversation],
  );

  const handleReply = useCallback((msg: MessageWithSender) => {
    setReplyTarget(msg);
    inputRef.current?.focus();
  }, []);

  const clearReply = useCallback(() => {
    setReplyTarget(null);
    inputRef.current?.focus();
  }, []);

  const handleRetry = useCallback(() => {
    chat.clearError();
  }, [chat]);

  // Error display
  if (error) {
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
    <div className={`flex flex-col h-full ${className}`}>
      {/* Messages - Only Virtual List */}
      <VirtualMessageList
        messages={messages}
        currentUserId={user?.id || ''}
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
          <div className="px-4 py-2 bg-muted/50 border-b flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">
                Replying to{' '}
                <span className="font-medium">
                  {replyTarget.sender?.username ||
                    replyTarget.sender?.full_name ||
                    'Unknown'}
                </span>
              </p>
              <p className="text-sm truncate">{replyTarget.content}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearReply}
              className="h-6 w-6 p-0"
              aria-label="Cancel reply"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}

        {/* Message input */}
        <div className="p-4">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={message}
              onChange={handleInputChange}
              onKeyDown={handleKeyPress}
              placeholder={
                replyTarget
                  ? `Reply to ${replyTarget.sender?.username || 'message'}...`
                  : 'Type a message...'
              }
              className="flex-1"
              disabled={isSendingMessage}
              aria-label="Message input"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!message.trim() || isSendingMessage}
              size="icon"
              aria-label="Send message"
            >
              {isSendingMessage ? (
                <Loader2
                  className="h-4 w-4 animate-spin"
                  role="status"
                  aria-live="polite"
                />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
