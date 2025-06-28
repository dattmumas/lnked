'use client';

import { useVirtualizer } from '@tanstack/react-virtual';
import { ArrowDown, MessageSquare, MoreHorizontal } from 'lucide-react';
import Image from 'next/image';
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { useDeleteMessage } from '@/lib/hooks/chat/use-messages';
import { useChatUIStore } from '@/lib/stores/chat-ui-store';
import { cn } from '@/lib/utils/cn';

import type { MessageWithSender } from '@/lib/chat/types';

// Constants for magic numbers
const DEBOUNCE_DELAY_MS = 2 * 60 * 1000; // 2 minutes
const MESSAGE_HEIGHT_COMPACT = 36;
const MESSAGE_HEIGHT_NORMAL = 72;
const MESSAGE_HEIGHT_DEFAULT = 72;

interface VirtualMessageListProps {
  messages: MessageWithSender[];
  currentUserId: string;
  conversationId: string;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoading?: boolean;
}

const LOAD_MORE_THRESHOLD = 200;
const SCROLL_TO_BOTTOM_THRESHOLD = 600;

const isGroupedWith = (
  currentMessage: MessageWithSender,
  previousMessage: MessageWithSender,
): boolean => {
  if (
    currentMessage.sender_id !== null &&
    currentMessage.sender_id !== undefined &&
    previousMessage.sender_id !== null &&
    previousMessage.sender_id !== undefined &&
    currentMessage.sender_id !== previousMessage.sender_id
  ) {
    return false;
  }

  if (
    currentMessage.created_at === null ||
    currentMessage.created_at === undefined ||
    previousMessage.created_at === null ||
    previousMessage.created_at === undefined
  ) {
    return false;
  }

  const timeDiff =
    new Date(currentMessage.created_at).getTime() -
    new Date(previousMessage.created_at).getTime();
  return timeDiff < DEBOUNCE_DELAY_MS;
};

export function VirtualMessageList({
  messages: newestToOldestMessages,
  currentUserId,
  conversationId,
  onLoadMore,
  hasMore = false,
  isLoading = false,
}: VirtualMessageListProps): React.JSX.Element {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const userScrolledUpRef = useRef(false);
  const loadMoreTriggeredRef = useRef(false);

  const setScrollPosition = useChatUIStore((state) => state.setScrollPosition);
  const getScrollPosition = useChatUIStore((state) => state.getScrollPosition);

  const messages = useMemo(
    () => [...newestToOldestMessages].reverse(),
    [newestToOldestMessages],
  );

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: useCallback(
      (index: number) => {
        const current = messages[index]!;
        const grouped =
          index > 0 && messages[index - 1] !== undefined
            ? isGroupedWith(current, messages[index - 1]!)
            : false;
        return grouped ? MESSAGE_HEIGHT_COMPACT : MESSAGE_HEIGHT_NORMAL;
      },
      [messages],
    ),
    overscan: 10,
  });

  const virtualItems = virtualizer.getVirtualItems();

  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } =
      scrollContainerRef.current;
    userScrolledUpRef.current = scrollHeight - scrollTop - clientHeight > 1;
    setShowScrollButton(
      scrollHeight - scrollTop - clientHeight > SCROLL_TO_BOTTOM_THRESHOLD,
    );

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

  useEffect(() => {
    if (!isLoading) {
      loadMoreTriggeredRef.current = false;
    }
  }, [isLoading]);

  // Save and restore scroll position
  useLayoutEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const savedPosition = getScrollPosition(conversationId);
    if (typeof savedPosition === 'number') {
      scrollContainer.scrollTop = savedPosition;
    } else {
      virtualizer.scrollToIndex(messages.length - 1, { align: 'end' });
    }

    return () => {
      setScrollPosition(conversationId, scrollContainer.scrollTop);
    };
  }, [
    conversationId,
    getScrollPosition,
    setScrollPosition,
    virtualizer,
    messages.length,
  ]);

  // Auto-scroll on new messages
  useLayoutEffect(() => {
    if (messages.length > 0 && !userScrolledUpRef.current) {
      virtualizer.scrollToIndex(messages.length - 1, {
        align: 'end',
        behavior: 'smooth',
      });
    }
  }, [messages.length, virtualizer]);

  const scrollToBottom = useCallback(() => {
    virtualizer.scrollToIndex(messages.length - 1, {
      align: 'end',
      behavior: 'smooth',
    });
    userScrolledUpRef.current = false;
  }, [virtualizer, messages.length]);

  return (
    <div className="absolute top-0 right-0 bottom-0 left-0">
      <div
        ref={scrollContainerRef}
        className="h-full overflow-y-auto scroll-smooth"
        onScroll={handleScroll}
      >
        {isLoading && hasMore && (
          <div className="sticky top-0 left-0 right-0 flex justify-center p-3 z-20">
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-card px-4 py-2 rounded-full shadow-sm border">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Loading messages...
            </div>
          </div>
        )}
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

            const isGrouped =
              virtualItem.index > 0 &&
              messages[virtualItem.index - 1] !== undefined
                ? isGroupedWith(message, messages[virtualItem.index - 1]!)
                : false;
            return (
              <div
                key={virtualItem.key}
                data-index={virtualItem.index}
                ref={virtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                <MessageRow
                  message={message}
                  isGrouped={isGrouped}
                  currentUserId={currentUserId}
                />
              </div>
            );
          })}
        </div>
      </div>
      {showScrollButton && (
        <div className="absolute bottom-4 right-4">
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

interface MessageRowProps {
  message: MessageWithSender;
  isGrouped: boolean;
  currentUserId: string;
}

const MessageRow = React.memo(
  ({ message, isGrouped, currentUserId }: MessageRowProps) => {
    const isFromCurrentUser = message.sender?.id === currentUserId;

    const setReplyTarget = useChatUIStore((state) => state.setReplyTarget);

    const handleSetReply = useCallback(() => {
      if (!message.conversation_id) return;
      setReplyTarget(message.conversation_id, message.id);
    }, [message.id, message.conversation_id, setReplyTarget]);

    const timestamp = message.created_at
      ? new Date(message.created_at).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })
      : '';

    return (
      <div
        className={cn(
          'group relative flex items-start gap-3 px-4 transition-colors',
          'py-1 hover:bg-muted/50', // Consistent padding
          !isGrouped && 'pt-4', // Extra top padding for non-grouped
          isFromCurrentUser && 'justify-end',
        )}
      >
        {/* Timestamp - shows on hover */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
          {timestamp}
        </div>

        {/* Avatar (only for other users on non-grouped messages) */}
        {!isFromCurrentUser && !isGrouped && (
          <div className="w-10 h-10 flex-shrink-0 rounded-full overflow-hidden bg-muted">
            {message.sender?.avatar_url ? (
              <Image
                src={message.sender.avatar_url}
                alt={message.sender?.username || 'User'}
                width={40}
                height={40}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                {(message.sender?.username?.[0] || 'U').toUpperCase()}
              </div>
            )}
          </div>
        )}

        {/* Spacer for grouped messages from other users */}
        {!isFromCurrentUser && isGrouped && (
          <div className="w-10 flex-shrink-0" />
        )}

        {/* Message Content */}
        <div
          className={cn(
            'flex flex-col max-w-[75%]',
            isFromCurrentUser ? 'items-end' : 'items-start',
          )}
        >
          {!isGrouped && !isFromCurrentUser && (
            <p className="text-sm font-semibold mb-1 text-foreground">
              {message.sender?.username || 'Unknown User'}
            </p>
          )}

          <div
            className={cn(
              'px-4 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words',
              isFromCurrentUser
                ? 'bg-accent text-accent-foreground rounded-br-lg' // User's messages are the accent color
                : 'bg-muted rounded-bl-lg text-foreground', // Other's messages are a muted gray
            )}
          >
            {message.deleted_at ? (
              <em className="italic text-muted-foreground">
                This message was deleted
              </em>
            ) : (
              message.content
            )}
          </div>
        </div>

        {/* Hover Actions */}
        {!message.deleted_at && (
          <div
            className={cn(
              'absolute top-1/2 -translate-y-1/2 flex items-center gap-1 bg-card border rounded-full p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity',
              isFromCurrentUser ? 'left-4' : 'right-4',
            )}
          >
            <button
              type="button"
              className="w-7 h-7 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground"
              title="Reply"
              onClick={handleSetReply}
            >
              <MessageSquare className="w-4 h-4" />
            </button>
            {isFromCurrentUser && <DeleteMessageButton message={message} />}
          </div>
        )}
      </div>
    );
  },
);
MessageRow.displayName = 'MessageRow';

// Extracted Delete Button to its own component to contain its state
function DeleteMessageButton({ message }: { message: MessageWithSender }) {
  const [isOpen, setIsOpen] = useState(false);
  const deleteMutation = useDeleteMessage();

  const handleConfirmDelete = () => {
    if (!message.conversation_id) return;
    deleteMutation.mutate({
      messageId: message.id,
      conversationId: message.conversation_id,
    });
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="w-7 h-7 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground"
            title="More"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="top" className="p-1">
          <DropdownMenuItem
            onSelect={() => setIsOpen(true)}
            className="text-red-600 focus:bg-red-50 dark:focus:bg-red-600/20"
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Message</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this message? This action cannot be
            undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirmDelete}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
