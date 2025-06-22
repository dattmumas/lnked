'use client';

import { Send, Loader2, X } from 'lucide-react';
import {
  useState,
  useRef,
  useCallback,
  useEffect,
  useLayoutEffect,
} from 'react';
import { Button } from '@/components/ui/button';
import { useUser } from '@/hooks/useUser';
import { VirtualMessageList } from './virtual-message-list';
import { useChatUIStore } from '@/lib/stores/chat-ui-store';
import { useConversation } from '@/lib/hooks/chat/use-conversations';
import { useMessages, useSendMessage } from '@/lib/hooks/chat/use-messages';
import { useMarkAsRead } from '@/lib/hooks/chat/use-conversations';

interface ChatPanelProps {
  conversationId: string;
  className?: string;
}

// Track which conversations have been marked as read globally
const markedAsReadConversations = new Set<string>();

export function ChatPanel({
  conversationId,
  className,
}: ChatPanelProps): React.ReactElement {
  const { user } = useUser();
  const [message, setMessage] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const didSendRef = useRef(false);

  // UI State from Zustand
  const { setActiveConversation, getReplyTarget, setReplyTarget } =
    useChatUIStore();

  // Server state from React Query
  const conversation = useConversation(conversationId);
  const {
    messages,
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useMessages(conversationId);

  const sendMessage = useSendMessage();
  const markAsRead = useMarkAsRead();

  // Get reply target from UI store
  const replyTargetId = getReplyTarget(conversationId);
  const replyTarget = messages.find((m) => m.id === replyTargetId) || null;

  // Set active conversation when component mounts or conversationId changes
  useEffect(() => {
    setActiveConversation(conversationId);
    return () => {
      // Don't clear active conversation on unmount to prevent flicker
    };
  }, [conversationId, setActiveConversation]);

  // Mark conversation as read when first viewing
  useEffect(() => {
    if (!conversationId || !conversation) return;

    // Check if we've already marked this conversation globally
    if (markedAsReadConversations.has(conversationId)) {
      console.log(
        `[ChatPanel] Already marked ${conversationId} as read, skipping`,
      );
      return;
    }

    console.log(`[ChatPanel] Marking conversation ${conversationId} as read`);
    markedAsReadConversations.add(conversationId);

    // Call the mutation directly without timeout
    markAsRead.mutate(conversationId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]); // Only depend on conversationId, not the mutation object

  // Handle focus management after message sends
  useLayoutEffect(() => {
    if (didSendRef.current) {
      inputRef.current?.focus();
      didSendRef.current = false;
    }
  });

  const handleSendMessage = useCallback(async (): Promise<void> => {
    if (!message.trim() || !conversation) return;

    const trimmedMessage = message.trim();
    setMessage('');
    didSendRef.current = true;

    try {
      await sendMessage.mutateAsync({
        content: trimmedMessage,
        message_type: 'text',
        ...(replyTargetId ? { reply_to_id: replyTargetId } : {}),
      });

      // Clear reply target on success
      setReplyTarget(conversationId, null);
    } catch (error) {
      // Restore message on error
      setMessage(trimmedMessage);
      console.error('Failed to send message:', error);
    }
  }, [
    message,
    conversation,
    conversationId,
    replyTargetId,
    sendMessage,
    setReplyTarget,
  ]);

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent): void => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        void handleSendMessage();
      } else if (e.key === 'Escape' && replyTargetId) {
        setReplyTarget(conversationId, null);
      }
    },
    [handleSendMessage, replyTargetId, conversationId, setReplyTarget],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
      setMessage(e.target.value);
    },
    [],
  );

  const handleLoadMore = useCallback((): void => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleMessageInView = useCallback((messageId: string): void => {
    // This could be used for read receipts
    void messageId;
  }, []);

  const clearReply = useCallback((): void => {
    setReplyTarget(conversationId, null);
    didSendRef.current = true;
  }, [conversationId, setReplyTarget]);

  // Loading state
  if (!conversation && isLoading) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading...
        </div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="text-center">
          <p className="text-lg font-medium mb-2">No conversation selected</p>
          <p className="text-sm text-muted-foreground">
            Choose a conversation to start messaging
          </p>
        </div>
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
        hasMore={hasNextPage}
        isLoading={isFetchingNextPage}
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
                disabled={sendMessage.isPending}
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
              onClick={() => void handleSendMessage()}
              disabled={!message.trim() || sendMessage.isPending}
              size="icon"
              className="h-12 w-12 rounded-full"
              aria-label="Send message"
            >
              {sendMessage.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
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
