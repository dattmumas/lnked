'use client';

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useLayoutEffect,
} from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ArrowDown, MessageSquare } from 'lucide-react';
import type { MessageWithSender } from '@/lib/chat/types';

interface VirtualMessageListProps {
  messages: MessageWithSender[];
  currentUserId: string;
  conversationId: string;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoading?: boolean;
  lastReadAt?: string | null;
  onMessageInView?: (messageId: string) => void;
}

const LOAD_MORE_THRESHOLD = 200; // pixels from top to trigger load more
const SCROLL_TO_BOTTOM_THRESHOLD = 600; // pixels from bottom to show scroll button

export function VirtualMessageList({
  messages,
  currentUserId,
  conversationId,
  onLoadMore,
  hasMore = false,
  isLoading = false,
  lastReadAt,
  onMessageInView,
}: VirtualMessageListProps): React.JSX.Element {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const isAutoScrolling = useRef(false);
  const loadMoreTriggeredRef = useRef(false);

  // Virtual list setup with better size estimation
  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: useCallback(
      (index: number) => {
        // Estimate based on whether messages are grouped and have avatars
        const message = messages[index];
        const previousMessage = messages[index - 1];
        const isGrouped =
          previousMessage &&
          previousMessage.sender?.id === message?.sender?.id &&
          message?.created_at &&
          previousMessage.created_at &&
          new Date(message.created_at).getTime() -
            new Date(previousMessage.created_at).getTime() <
            2 * 60 * 1000;

        // Base height + extra for ungrouped messages (avatar, username, spacing)
        return isGrouped ? 50 : 90;
      },
      [messages],
    ),
    overscan: 5,
  });

  const virtualItems = virtualizer.getVirtualItems();

  // Find first unread message index
  const firstUnreadIndex = React.useMemo(() => {
    if (!lastReadAt) return -1;
    const lastReadTime = new Date(lastReadAt).getTime();
    return messages.findIndex(
      (msg) =>
        msg.created_at && new Date(msg.created_at).getTime() > lastReadTime,
    );
  }, [messages, lastReadAt]);

  const unreadCount =
    firstUnreadIndex >= 0 ? messages.length - firstUnreadIndex : 0;

  // Handle scroll events
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current || isAutoScrolling.current) return;

    const { scrollTop, scrollHeight, clientHeight } =
      scrollContainerRef.current;
    const scrollBottom = scrollHeight - scrollTop - clientHeight;

    // Show/hide scroll to bottom button
    setShowScrollButton(scrollBottom > SCROLL_TO_BOTTOM_THRESHOLD);

    // Trigger load more when near top
    if (
      scrollTop < LOAD_MORE_THRESHOLD &&
      hasMore &&
      !isLoading &&
      !loadMoreTriggeredRef.current &&
      onLoadMore
    ) {
      loadMoreTriggeredRef.current = true;
      onLoadMore();
    }
  }, [hasMore, isLoading, onLoadMore]);

  // Reset load more trigger when loading completes
  useEffect(() => {
    if (!isLoading) {
      loadMoreTriggeredRef.current = false;
    }
  }, [isLoading]);

  // Scroll to bottom on initial load or conversation change
  useLayoutEffect(() => {
    if (messages.length > 0 && scrollContainerRef.current) {
      isAutoScrolling.current = true;
      scrollContainerRef.current.scrollTop =
        scrollContainerRef.current.scrollHeight;
      requestAnimationFrame(() => {
        isAutoScrolling.current = false;
      });
    }
  }, [conversationId]);

  // Auto-scroll when new messages arrive (only if already at bottom)
  useLayoutEffect(() => {
    if (!scrollContainerRef.current || messages.length === 0) return;

    const { scrollTop, scrollHeight, clientHeight } =
      scrollContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

    if (isNearBottom) {
      isAutoScrolling.current = true;
      scrollContainerRef.current.scrollTop =
        scrollContainerRef.current.scrollHeight;
      requestAnimationFrame(() => {
        isAutoScrolling.current = false;
      });
    }
  }, [messages.length]);

  // Handle message visibility for read receipts
  useEffect(() => {
    if (!onMessageInView) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const messageId = entry.target.getAttribute('data-message-id');
            if (messageId) {
              onMessageInView(messageId);
            }
          }
        });
      },
      { threshold: 0.5 },
    );

    // Observe visible messages
    virtualItems.forEach((virtualItem) => {
      const element = document.querySelector(
        `[data-message-id="${messages[virtualItem.index]?.id}"]`,
      );
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, [virtualItems, messages, onMessageInView]);

  const scrollToBottom = useCallback(() => {
    if (scrollContainerRef.current) {
      isAutoScrolling.current = true;
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
      setTimeout(() => {
        isAutoScrolling.current = false;
      }, 500);
    }
  }, []);

  const scrollToFirstUnread = useCallback(() => {
    if (firstUnreadIndex >= 0) {
      virtualizer.scrollToIndex(firstUnreadIndex, {
        align: 'center',
        behavior: 'smooth',
      });
    }
  }, [firstUnreadIndex, virtualizer]);

  return (
    <div className="relative flex-1 overflow-hidden min-h-0">
      <div
        ref={scrollContainerRef}
        className="h-full overflow-y-auto scroll-smooth bg-[#F7F7F9]"
        onScroll={handleScroll}
      >
        {/* Loading indicator */}
        {isLoading && hasMore && (
          <div className="sticky top-0 left-0 right-0 flex justify-center p-3 z-20 bg-gradient-to-b from-[#F7F7F9] to-transparent">
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-background/95 backdrop-blur-md px-4 py-2 rounded-full shadow-sm border">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ••• Loading earlier messages
            </div>
          </div>
        )}

        {/* Virtual list container */}
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualItems.map((virtualItem) => {
            const message = messages[virtualItem.index];
            if (!message) return null;

            return (
              <MessageRow
                key={message.id}
                message={message}
                messages={messages}
                virtualItem={virtualItem}
                currentUserId={currentUserId}
                firstUnreadIndex={firstUnreadIndex}
                measureElement={virtualizer.measureElement}
              />
            );
          })}
        </div>
      </div>

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <div className="absolute bottom-4 right-4 flex flex-col items-end gap-2">
          {unreadCount > 0 && (
            <Button
              size="sm"
              onClick={scrollToFirstUnread}
              className="shadow-lg"
            >
              <MessageSquare className="h-4 w-4 mr-1" />
              {unreadCount} new {unreadCount === 1 ? 'message' : 'messages'}
            </Button>
          )}

          <Button
            size="icon"
            variant="secondary"
            onClick={scrollToBottom}
            className="rounded-full shadow-lg"
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

// Simplified message row component
interface MessageRowProps {
  message: MessageWithSender;
  messages: MessageWithSender[];
  virtualItem: { index: number; start: number; size: number };
  currentUserId: string;
  firstUnreadIndex: number;
  measureElement: (el: HTMLElement | null) => void;
}

const MessageRow = React.memo(
  ({
    message,
    messages,
    virtualItem,
    currentUserId,
    firstUnreadIndex,
    measureElement,
  }: MessageRowProps) => {
    const isFromCurrentUser = message.sender?.id === currentUserId;
    const previousMessage = messages[virtualItem.index - 1];
    const showUnreadDivider = virtualItem.index === firstUnreadIndex;

    // Message grouping logic
    const shouldGroup = React.useMemo(() => {
      if (
        !previousMessage ||
        previousMessage.sender?.id !== message.sender?.id
      ) {
        return false;
      }
      const timeDiff =
        message.created_at && previousMessage.created_at
          ? new Date(message.created_at).getTime() -
            new Date(previousMessage.created_at).getTime()
          : Infinity;
      return timeDiff < 2 * 60 * 1000; // 2 minutes
    }, [message, previousMessage]);

    const showAvatar = !shouldGroup && !isFromCurrentUser;
    const showUsername = !shouldGroup && !isFromCurrentUser;

    return (
      <div
        ref={measureElement}
        data-message-id={message.id}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          transform: `translateY(${virtualItem.start}px)`,
        }}
        className="group px-4 py-1"
      >
        {showUnreadDivider && (
          <div className="flex items-center gap-2 py-2">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary to-transparent" />
            <span className="text-xs font-medium text-primary bg-primary/10 px-3 py-1 rounded-full">
              New messages
            </span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary to-transparent" />
          </div>
        )}

        {!shouldGroup && virtualItem.index > 0 && <div className="h-4" />}

        <div
          className={`flex ${isFromCurrentUser ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`flex gap-3 max-w-[75%] ${isFromCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}
          >
            {/* Avatar */}
            {!isFromCurrentUser && (
              <div className="w-8 h-8 flex-shrink-0 self-end">
                {showAvatar && (
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-muted">
                    {message.sender?.avatar_url ? (
                      <Image
                        src={message.sender.avatar_url}
                        alt={message.sender?.username || 'User'}
                        width={32}
                        height={32}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-xs">
                        {(message.sender?.username?.[0] || 'U').toUpperCase()}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Message content */}
            <div className="flex flex-col min-w-0 flex-1">
              {showUsername && (
                <div
                  className={`flex items-center gap-2 mb-1 ${isFromCurrentUser ? 'justify-end' : 'justify-start'}`}
                >
                  <span className="text-sm font-semibold text-foreground">
                    {isFromCurrentUser
                      ? 'You'
                      : message.sender?.username || 'Unknown'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {message.created_at
                      ? new Date(message.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : ''}
                  </span>
                </div>
              )}

              <div
                className={`
                group-hover:shadow-sm transition-all duration-150 rounded-2xl px-4 py-2 relative
                ${
                  isFromCurrentUser
                    ? 'bg-primary/20 text-foreground rounded-br-md'
                    : 'bg-muted/90 text-foreground rounded-bl-md'
                }
                ${shouldGroup ? 'mt-1' : 'mt-0'}
              `}
              >
                <div className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                  {message.content}
                </div>

                {/* Hover actions */}
                <div
                  className={`
                  absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 
                  transition-opacity duration-200 flex gap-1
                  ${isFromCurrentUser ? '-left-16' : '-right-16'}
                `}
                >
                  <button
                    type="button"
                    className="w-8 h-8 rounded-full bg-background/90 border shadow-sm hover:bg-muted/50 flex items-center justify-center text-xs"
                    title="Reply"
                  >
                    ↩
                  </button>
                  <button
                    type="button"
                    className="w-8 h-8 rounded-full bg-background/90 border shadow-sm hover:bg-muted/50 flex items-center justify-center text-xs"
                    title="React"
                  >
                    😊
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  },
);

MessageRow.displayName = 'MessageRow';
