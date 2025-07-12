'use client';

import { InfiniteData } from '@tanstack/react-query';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { AlertCircle, Loader2, ArrowDown } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Virtuoso } from 'react-virtuoso';

import { Button } from '@/components/ui/button';
import { useUser } from '@/hooks/useUser';
import { MessagesResponse, PresenceStateRecord } from '@/types/chat-v2';

import { MessageBubble } from './MessageBubble';

import type { VirtuosoHandle } from 'react-virtuoso';

interface MessageListProps {
  messagesData: InfiniteData<MessagesResponse> | undefined;
  isLoading: boolean;
  error: Error | null;
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  activeConversationId: string | null;
  presence: PresenceStateRecord;
}

export function MessageList({
  messagesData,
  isLoading,
  error,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  activeConversationId,
  presence,
}: MessageListProps): React.JSX.Element {
  const { user } = useUser(); // Get current user from context
  const currentUserId = user?.id;

  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const [atBottom, setAtBottom] = useState(true);
  const isAtBottomRef = useRef(true);
  const lastMessageCountRef = useRef(0);
  const shouldReduceMotion = useReducedMotion();
  const [avgItemHeight, setAvgItemHeight] = useState(60);
  const measuredHeights = useRef<number[]>([]);

  // Compute typing users early
  const typingUsers = useMemo(() => {
    return Object.values(presence)
      .filter((p) => p.typing && p.user_id !== currentUserId)
      .map((p) => p.user_id || 'User');
  }, [presence, currentUserId]);

  // Extract all messages from paginated data
  const allMessages = useMemo(() => {
    if (!messagesData?.pages) return [];
    return messagesData.pages.flatMap((page) => page.messages);
  }, [messagesData]);

  // Track message heights for dynamic sizing
  const resizeObserver = useMemo(() => {
    if (typeof window === 'undefined') return null;

    return new ResizeObserver((entries) => {
      const heights = entries.map((entry) => entry.contentRect.height);
      measuredHeights.current = [...measuredHeights.current, ...heights].slice(
        -50,
      ); // Keep last 50 measurements

      // Calculate average height
      const total = measuredHeights.current.reduce(
        (sum, height) => sum + height,
        0,
      );
      const newAvg = Math.round(total / measuredHeights.current.length);

      if (newAvg !== avgItemHeight && measuredHeights.current.length >= 10) {
        setAvgItemHeight(newAvg);
      }
    });
  }, [avgItemHeight]);

  // Measure each rendered message container
  const measureRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (node && resizeObserver) {
        resizeObserver.observe(node);
      }
    },
    [resizeObserver],
  );

  // Cleanup ResizeObserver
  useEffect(() => {
    return () => {
      resizeObserver?.disconnect();
    };
  }, [resizeObserver]);

  // Reset measurements when conversation changes (detected by messages changing)
  useEffect(() => {
    // Only reset if we have a different conversation (new set of messages)
    if (allMessages.length === 0 || lastMessageCountRef.current === 0) {
      measuredHeights.current = [];
      lastMessageCountRef.current = 0;
    }
  }, [allMessages.length]);

  useEffect(() => {
    const messageCount = allMessages.length;
    const wasAtBottom = isAtBottomRef.current;
    const hasNewMessages = messageCount > lastMessageCountRef.current;

    if (hasNewMessages && wasAtBottom) {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        virtuosoRef.current?.scrollToIndex({
          index: messageCount - 1,
          behavior: shouldReduceMotion ? 'auto' : 'smooth',
        });
      }, 100);
    }

    lastMessageCountRef.current = messageCount;
  }, [allMessages.length, shouldReduceMotion]);

  // Handle loading more messages when scrolling to top
  const startReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Track scroll position to determine if user is at bottom
  const handleAtBottomStateChange = useCallback((bottom: boolean) => {
    isAtBottomRef.current = bottom;
    setAtBottom(bottom);
  }, []);

  // Scroll to bottom manually
  const scrollToBottom = useCallback(() => {
    virtuosoRef.current?.scrollToIndex({
      index: allMessages.length - 1,
      behavior: shouldReduceMotion ? 'auto' : 'smooth',
    });
  }, [allMessages.length, shouldReduceMotion]);

  // Format date for mobile-friendly display
  const formatDateHeader = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Check if it's today
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }

    // Check if it's yesterday
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }

    // Check if it's within this week
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    if (date > weekAgo) {
      // Show short weekday for this week: "Mon", "Tue", etc.
      return date.toLocaleDateString(undefined, { weekday: 'short' });
    }

    // Check if it's within this year
    if (date.getFullYear() === today.getFullYear()) {
      // Show "Jul 11" format for this year
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });
    }

    // Show "Jul 11, 2023" for older dates
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, []);

  // Render individual message with date headers
  const itemRenderer = useCallback(
    (index: number) => {
      const message = allMessages[index];
      if (!message) return null;

      if (!message.created_at) return null;

      const prevMessage = index > 0 ? allMessages[index - 1] : null;
      const currentDate = new Date(message.created_at).toDateString();
      const prevDate = prevMessage?.created_at
        ? new Date(prevMessage.created_at).toDateString()
        : null;
      const showDateHeader = currentDate !== prevDate;

      // Check if message is from same sender as previous (for grouping)
      const isSameSender = prevMessage?.sender_id === message.sender_id;
      const timeDiff = prevMessage?.created_at
        ? new Date(message.created_at).getTime() -
          new Date(prevMessage.created_at).getTime()
        : Infinity;
      const isGrouped = isSameSender && timeDiff < 5 * 60 * 1000;

      return (
        <div key={message.id || message.optimistic_id}>
          {showDateHeader && (
            <div className="flex justify-center my-4">
              <button
                type="button"
                className="bg-muted/90 hover:bg-muted px-3 py-1 rounded-full text-xs text-foreground/80 hover:text-foreground transition-colors cursor-pointer border border-border/30"
                onClick={() => {
                  // Progressive disclosure - show full date on click
                  const fullDate = new Date(
                    message.created_at!,
                  ).toLocaleDateString(undefined, {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  });
                  // Simple alert for now - could be replaced with tooltip in production
                  alert(fullDate);
                }}
                title="Click for full date"
              >
                {formatDateHeader(currentDate)}
              </button>
            </div>
          )}
          <div ref={measureRef}>
            <MessageBubble
              message={message}
              showAvatar={!isGrouped}
              isGrouped={isGrouped}
            />
          </div>
        </div>
      );
    },
    [allMessages, formatDateHeader, measureRef],
  );

  // Header component for loading indicator
  const Header = useCallback(() => {
    if (!hasNextPage && !isFetchingNextPage) {
      return (
        <div className="text-center py-6">
          <div className="inline-flex items-center gap-2 text-sm text-foreground/70 bg-muted/60 px-4 py-2 rounded-full border border-border/30">
            <div className="w-2 h-2 bg-primary rounded-full" />
            This is the beginning of the conversation
          </div>
        </div>
      );
    }

    if (isFetchingNextPage) {
      return (
        <div className="flex items-center justify-center py-6">
          <div className="flex items-center gap-2 text-sm text-foreground/70">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading more messages...
          </div>
        </div>
      );
    }

    return null;
  }, [hasNextPage, isFetchingNextPage]);

  // Scroll to bottom button
  const ScrollToBottomButton = useCallback(() => {
    if (atBottom) return null;

    return (
      <AnimatePresence>
        <motion.div
          className="fixed bottom-20 right-4 z-10"
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
          animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
          transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.2 }}
        >
          <Button
            size="sm"
            className="rounded-full shadow-lg"
            onClick={scrollToBottom}
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
        </motion.div>
      </AnimatePresence>
    );
  }, [atBottom, scrollToBottom, shouldReduceMotion]);

  // Scroll skeleton placeholder for fast scrolling
  const ScrollSeekPlaceholder = useCallback(() => {
    return (
      <div className="flex gap-3 px-4 py-2 animate-pulse">
        {/* Avatar skeleton */}
        <div className="w-8 h-8 bg-muted/80 rounded-full flex-shrink-0" />

        {/* Message skeleton */}
        <div className="flex-1 max-w-lg">
          <div className="bg-muted/60 rounded-lg px-3 py-2 border border-border/20">
            <div className="space-y-2">
              <div className="h-3 bg-muted/80 rounded w-3/4" />
              <div className="h-3 bg-muted/80 rounded w-1/2" />
            </div>
          </div>
        </div>
      </div>
    );
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-sm mx-auto p-6">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <h3 className="text-lg font-medium mb-2">Unable to load messages</h3>
          <p className="text-sm text-muted-foreground mb-4">
            There was a problem loading the conversation. Please try again.
          </p>
          <div className="flex gap-2 justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
            >
              Reload Page
            </Button>
            <Button size="sm" onClick={() => fetchNextPage()}>
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading && allMessages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading messages...</p>
        </div>
      </div>
    );
  }

  if (!isLoading && allMessages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-sm mx-auto p-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/20 flex items-center justify-center">
            <span className="text-2xl">💬</span>
          </div>
          <h3 className="text-lg font-medium mb-2">Start the conversation</h3>
          <p className="text-sm text-muted-foreground">
            Be the first to send a message in this conversation. Say hello!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full flex flex-col">
      <Virtuoso
        ref={virtuosoRef}
        totalCount={allMessages.length}
        itemContent={itemRenderer}
        startReached={startReached}
        atBottomStateChange={handleAtBottomStateChange}
        components={{
          Header,
          ScrollSeekPlaceholder,
        }}
        followOutput={shouldReduceMotion ? false : 'smooth'}
        alignToBottom
        className="flex-1"
        style={{ height: '100%' }}
        increaseViewportBy={400}
        overscan={10}
        defaultItemHeight={avgItemHeight}
        computeItemKey={(index) => {
          const message = allMessages[index];
          return message?.id || message?.optimistic_id || `message-${index}`;
        }}
        logLevel={0}
        data={allMessages}
        scrollSeekConfiguration={{
          enter: (velocity) => Math.abs(velocity) > 1000,
          exit: (velocity) => Math.abs(velocity) < 30,
        }}
      />
      <TypingIndicator typingUsers={typingUsers} />
      <ScrollToBottomButton />
    </div>
  );
}

function TypingIndicator({ typingUsers }: { typingUsers: string[] }) {
  if (typingUsers.length === 0) return null;

  return (
    <div className="px-4 py-2 text-sm text-muted-foreground italic">
      {typingUsers.length === 1
        ? `${typingUsers[0]} is typing...`
        : `${typingUsers.length} users are typing...`}
    </div>
  );
}
