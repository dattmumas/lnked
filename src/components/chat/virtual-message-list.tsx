'use client';

/* eslint-disable no-magic-numbers */

import { ArrowDown, MessageSquare } from 'lucide-react';
import Image from 'next/image';
import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';

import { Button } from '@/components/ui/button';

import type { MessageWithSender } from '@/lib/chat/types';

// Constants
const DEFAULT_ITEM_HEIGHT = 80;
const DEFAULT_OVERSCAN = 10;
const NEAR_BOTTOM_THRESHOLD = 100;
const SCROLL_BUTTON_THRESHOLD = 300;
const INTERSECTION_THRESHOLD = 0.5;
const AVATAR_SIZE = 40;

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

// Enhanced virtual scrolling with dynamic heights
interface VirtualItem {
  index: number;
  start: number;
  size: number;
  end: number;
}

interface SizeCache {
  [index: number]: number;
}

interface UseDynamicVirtualizerProps {
  count: number;
  estimateSize: (index?: number) => number;
  overscan?: number;
  getScrollElement: () => HTMLElement | null;
  measureElement?: (index: number, element: HTMLElement) => void;
}

interface UseDynamicVirtualizerReturn {
  virtualItems: VirtualItem[];
  totalSize: number;
  scrollToIndex: (
    index: number,
    options?: {
      align?: 'start' | 'center' | 'end';
      behavior?: 'auto' | 'smooth';
    },
  ) => void;
  setScrollTop: (scrollTop: number) => void;
  measureElement: (index: number, element: HTMLElement) => void;
}

function useDynamicVirtualizer({
  count,
  estimateSize,
  overscan = DEFAULT_OVERSCAN,
  getScrollElement,
}: UseDynamicVirtualizerProps): UseDynamicVirtualizerReturn {
  // Use ref to store scroll position to avoid triggering renders on every scroll
  const scrollTopRef = useRef(0);
  const [visibleRangeState, setVisibleRangeState] = useState({
    start: 0,
    end: 0,
  });
  const [sizeCache, setSizeCache] = useState<SizeCache>({});
  const rafIdRef = useRef<number | null>(null);

  // Memoized prefix sum array for efficient position calculations
  const { prefixSums, totalSize } = useMemo(() => {
    const sums: number[] = [0];
    let total = 0;

    for (let i = 0; i < count; i++) {
      const size = sizeCache[i] ?? estimateSize(i);
      total += size;
      sums.push(total);
    }

    return { prefixSums: sums, totalSize: total };
  }, [count, sizeCache, estimateSize]);

  // Get item position from prefix sum
  const getItemPosition = useCallback(
    (index: number): { start: number; size: number; end: number } => {
      const start = prefixSums[index] ?? 0;
      const size = sizeCache[index] ?? estimateSize(index);
      const end = start + size;
      return { start, size, end };
    },
    [prefixSums, sizeCache, estimateSize],
  );

  // Calculate visible range from scroll position
  const calculateVisibleRange = useCallback(
    (scrollTop: number) => {
      const scrollElement = getScrollElement();
      if (scrollElement === null || count === 0) return { start: 0, end: 0 };

      const { clientHeight } = scrollElement;
      const viewportStart = scrollTop;
      const viewportEnd = scrollTop + clientHeight;

      // Binary search for start index
      let start = 0;
      let end = count - 1;
      while (start < end) {
        const mid = Math.floor((start + end) / 2);
        const itemEnd = prefixSums[mid + 1] ?? totalSize;
        if (itemEnd <= viewportStart) {
          start = mid + 1;
        } else {
          end = mid;
        }
      }
      const startIndex = Math.max(0, start - overscan);

      // Binary search for end index
      start = 0;
      end = count - 1;
      while (start < end) {
        const mid = Math.ceil((start + end) / 2);
        const itemStart = prefixSums[mid] ?? 0;
        if (itemStart >= viewportEnd) {
          end = mid - 1;
        } else {
          start = mid;
        }
      }
      const endIndex = Math.min(count - 1, end + overscan);

      return { start: startIndex, end: endIndex };
    },
    [getScrollElement, count, prefixSums, totalSize, overscan],
  );

  // Throttled update function using requestAnimationFrame
  const updateVisibleRange = useCallback(() => {
    const newRange = calculateVisibleRange(scrollTopRef.current);

    // Only update state if visible range actually changed
    setVisibleRangeState((prevRange) => {
      if (
        prevRange.start !== newRange.start ||
        prevRange.end !== newRange.end
      ) {
        return newRange;
      }
      return prevRange;
    });

    rafIdRef.current = null;
  }, [calculateVisibleRange]);

  // Set scroll position and schedule throttled update
  const setScrollTop = useCallback(
    (scrollTop: number): void => {
      scrollTopRef.current = scrollTop;

      // Cancel previous RAF if pending
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }

      // Schedule update for next frame
      rafIdRef.current = requestAnimationFrame(updateVisibleRange);
    },
    [updateVisibleRange],
  );

  // Cleanup RAF on unmount
  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  const virtualItems = useMemo((): VirtualItem[] => {
    const items: VirtualItem[] = [];
    for (let i = visibleRangeState.start; i <= visibleRangeState.end; i++) {
      const position = getItemPosition(i);
      items.push({
        index: i,
        ...position,
      });
    }
    return items;
  }, [visibleRangeState, getItemPosition]);

  const measureElement = useCallback(
    (index: number, element: HTMLElement): void => {
      const { height } = element.getBoundingClientRect();
      setSizeCache((prev) => {
        if (prev[index] !== height) {
          return { ...prev, [index]: height };
        }
        return prev;
      });
    },
    [],
  );

  const scrollToIndex = useCallback(
    (
      index: number,
      options?: {
        align?: 'start' | 'center' | 'end';
        behavior?: 'auto' | 'smooth';
      },
    ): void => {
      const scrollElement = getScrollElement();
      if (scrollElement === null) return;

      const { align = 'start', behavior = 'auto' } = options ?? {};
      const position = getItemPosition(index);
      const { clientHeight } = scrollElement;

      let targetScroll = position.start;

      if (align === 'center') {
        targetScroll = position.start - (clientHeight - position.size) / 2;
      } else if (align === 'end') {
        targetScroll = position.end - clientHeight;
      }

      scrollElement.scrollTo({
        top: Math.max(0, Math.min(targetScroll, totalSize - clientHeight)),
        behavior,
      });
    },
    [getScrollElement, getItemPosition, totalSize],
  );

  return {
    virtualItems,
    totalSize,
    scrollToIndex,
    setScrollTop,
    measureElement,
  };
}

// Hook for measuring element heights
function useMeasuredElement(
  index: number,
  measureElement: (index: number, element: HTMLElement) => void,
): React.RefObject<HTMLDivElement | null> {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (element === null) return;

    // Initial measurement
    measureElement(index, element);

    // Set up ResizeObserver for dynamic content changes
    const resizeObserver = new ResizeObserver(() => {
      measureElement(index, element);
    });

    resizeObserver.observe(element);
    // eslint-disable-next-line consistent-return
    return (): void => {
      resizeObserver.disconnect();
    };
  }, [index, measureElement]);

  return ref;
}

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
  const parentRef = useRef<HTMLDivElement>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // RAF state for optimized scroll handling
  const scrollRafRef = useRef<number | null>(null);
  const lastScrollTopRef = useRef<number>(0);

  // Find first unread message index
  const firstUnreadIndex = useMemo(() => {
    if (lastReadAt === null || lastReadAt === undefined) return -1;
    const lastReadTime = new Date(lastReadAt).getTime();
    return messages.findIndex(
      (msg) =>
        msg.created_at !== null &&
        msg.created_at !== undefined &&
        new Date(msg.created_at).getTime() > lastReadTime,
    );
  }, [messages, lastReadAt]);

  // Calculate unread count
  useEffect(() => {
    if (firstUnreadIndex >= 0) {
      setUnreadCount(messages.length - firstUnreadIndex);
    } else {
      setUnreadCount(0);
    }
  }, [firstUnreadIndex, messages.length]);

  // Dynamic virtual scrolling
  const virtualizer = useDynamicVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: useCallback(() => DEFAULT_ITEM_HEIGHT, []),
    overscan: DEFAULT_OVERSCAN,
  });

  const {
    virtualItems,
    totalSize,
    scrollToIndex,
    setScrollTop,
    measureElement,
  } = virtualizer;

  // Check if we need to load more messages
  useEffect(() => {
    if (!hasMore || isLoading || virtualItems.length === 0) return;

    const firstItem = virtualItems[0];
    if (firstItem !== undefined && firstItem.index === 0) {
      onLoadMore?.();
    }
  }, [virtualItems, hasMore, isLoading, onLoadMore]);

  // Optimized scroll handler that buffers DOM reads with RAF
  const handleScrollStateUpdate = useCallback((): void => {
    const element = parentRef.current;
    if (element === null) return;

    // Buffer DOM reads in RAF to avoid forced layout
    const { scrollTop, scrollHeight, clientHeight } = element;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    // Update virtual scrolling (this already uses RAF internally)
    setScrollTop(scrollTop);

    // Batch state updates
    const nearBottom = distanceFromBottom < NEAR_BOTTOM_THRESHOLD;
    const shouldShowScrollButton = distanceFromBottom > SCROLL_BUTTON_THRESHOLD;

    setIsNearBottom(nearBottom);
    setShowScrollButton(shouldShowScrollButton);

    scrollRafRef.current = null;
    return;
  }, [setScrollTop]);

  // Handle scroll position tracking with RAF buffering
  const handleScroll = useCallback((): void => {
    const element = parentRef.current;
    if (element === null) return;

    // Store the current scroll position immediately for virtual scrolling
    const { scrollTop: currentScrollTop } = element;
    lastScrollTopRef.current = currentScrollTop;

    // Cancel previous RAF if pending
    if (scrollRafRef.current !== null) {
      cancelAnimationFrame(scrollRafRef.current);
    }

    // Schedule DOM reads and state updates for next frame
    scrollRafRef.current = requestAnimationFrame(handleScrollStateUpdate);
  }, [handleScrollStateUpdate]);

  // Cleanup RAF on unmount
  useEffect(() => {
    return (): void => {
      if (scrollRafRef.current !== null) {
        cancelAnimationFrame(scrollRafRef.current);
      }
    };
  }, []);

  // Scroll to bottom
  const scrollToBottom = useCallback(
    (smooth = true): void => {
      scrollToIndex(messages.length - 1, {
        align: 'end',
        behavior: smooth ? 'smooth' : 'auto',
      });
    },
    [scrollToIndex, messages.length],
  );

  const scrollToFirstUnread = useCallback((): void => {
    if (firstUnreadIndex >= 0) {
      scrollToIndex(firstUnreadIndex, {
        align: 'center',
        behavior: 'smooth',
      });
    }
  }, [firstUnreadIndex, scrollToIndex]);

  // Scroll to first unread or bottom on conversation change
  useEffect(() => {
    if (firstUnreadIndex >= 0) {
      // Scroll to first unread message
      scrollToIndex(firstUnreadIndex, {
        align: 'center',
        behavior: 'auto',
      });
    } else {
      // Scroll to bottom
      scrollToBottom(false);
    }
  }, [conversationId, firstUnreadIndex, scrollToIndex, scrollToBottom]);

  // Auto-scroll for new messages if near bottom
  useEffect(() => {
    if (isNearBottom && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage?.sender?.id === currentUserId) {
        // Always scroll for user's own messages
        scrollToBottom(true);
      }
    }
  }, [messages, isNearBottom, currentUserId, scrollToBottom]);

  // Handle message visibility for read receipts with optimized observer
  const observerRef = useRef<IntersectionObserver | null>(null);
  const observedElementsRef = useRef<Set<Element>>(new Set());

  // Create IntersectionObserver once
  useEffect(() => {
    if (onMessageInView === undefined) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const messageId = entry.target.getAttribute('data-message-id');
            if (messageId !== null) {
              onMessageInView(messageId);
            }
          }
        });
      },
      { threshold: INTERSECTION_THRESHOLD },
    );

    // Capture current set to satisfy exhaustive-deps rule
    const observedElements = observedElementsRef.current;
    // eslint-disable-next-line consistent-return
    return (): void => {
      if (observerRef.current !== null) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      observedElements.clear();
    };
  }, [onMessageInView]);

  // Update observed elements when virtualItems change (delta only)
  useEffect(() => {
    if (observerRef.current === null || parentRef.current === null) return;

    const observer = observerRef.current;
    const container = parentRef.current;

    // Get current visible elements
    const currentElements = new Set<Element>();
    virtualItems.forEach((virtualItem) => {
      const element = container.querySelector(
        `[data-index="${virtualItem.index}"]`,
      );
      if (element !== null && element !== undefined) {
        currentElements.add(element);
      }
    });

    // Unobserve elements that are no longer visible
    observedElementsRef.current.forEach((element) => {
      if (!currentElements.has(element)) {
        observer.unobserve(element);
        observedElementsRef.current.delete(element);
      }
    });

    // Observe new visible elements
    currentElements.forEach((element) => {
      if (!observedElementsRef.current.has(element)) {
        observer.observe(element);
        observedElementsRef.current.add(element);
      }
    });
  }, [virtualItems]);

  const handleScrollToBottom = useCallback((): void => {
    scrollToBottom(true);
  }, [scrollToBottom]);

  return (
    <div className="relative flex-1 overflow-hidden">
      <div
        ref={parentRef}
        className="h-full overflow-y-auto scroll-smooth"
        onScroll={handleScroll}
      >
        <div
          style={{
            height: `${totalSize}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {/* Loading indicator at top */}
          {isLoading && hasMore && (
            <div className="absolute top-0 left-0 right-0 flex justify-center p-2 z-10">
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-background/80 backdrop-blur-sm px-3 py-2 rounded-full">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Loading earlier messages...
              </div>
            </div>
          )}

          {/* Virtual items */}
          {virtualItems
            .map((virtualItem) => ({
              virtualItem,
              message: messages[virtualItem.index],
            }))
            .filter(
              (
                item,
              ): item is {
                virtualItem: VirtualItem;
                message: MessageWithSender;
              } => item.message !== undefined,
            )
            .map(({ virtualItem, message }): React.JSX.Element => {
              return (
                <VirtualMessageRow
                  key={message.id}
                  virtualItem={virtualItem}
                  message={message}
                  messages={messages}
                  currentUserId={currentUserId}
                  firstUnreadIndex={firstUnreadIndex}
                  measureElement={measureElement}
                />
              );
            })}
        </div>
      </div>

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <div className="absolute bottom-4 right-4 flex flex-col items-end gap-2">
          {unreadCount > 0 && !isNearBottom && (
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
            onClick={handleScrollToBottom}
            className="rounded-full shadow-lg"
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

// Extracted message item component for better maintainability
interface VirtualMessageRowProps {
  virtualItem: VirtualItem;
  message: MessageWithSender;
  messages: MessageWithSender[];
  currentUserId: string;
  firstUnreadIndex: number;
  measureElement: (index: number, element: HTMLElement) => void;
}

const VirtualMessageRowComponent = ({
  virtualItem,
  message,
  messages,
  currentUserId,
  firstUnreadIndex,
  measureElement,
}: VirtualMessageRowProps): React.JSX.Element => {
  const ref = useMeasuredElement(virtualItem.index, measureElement);

  const showUnreadDivider = virtualItem.index === firstUnreadIndex;
  const isFirstMessageFromUser =
    virtualItem.index === 0 ||
    messages[virtualItem.index - 1]?.sender?.id !== message.sender?.id;
  const showAvatar = isFirstMessageFromUser;
  const showUsername = isFirstMessageFromUser;

  return (
    <div
      ref={ref}
      data-index={virtualItem.index}
      data-message-id={message.id}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        minHeight: `${virtualItem.size}px`,
        transform: `translateY(${virtualItem.start}px)`,
      }}
      className="group"
    >
      {showUnreadDivider && (
        <div className="flex items-center gap-2 px-4 py-2">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary to-transparent" />
          <span className="text-xs font-medium text-primary bg-primary/10 px-3 py-1 rounded-full">
            New messages
          </span>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary to-transparent" />
        </div>
      )}

      {/* Add space between different users */}
      {isFirstMessageFromUser && virtualItem.index > 0 && (
        <div className="h-4" />
      )}

      <div
        className={`flex gap-3 px-4 py-1 ${
          message.sender?.id === currentUserId ? 'justify-end' : 'justify-start'
        }`}
      >
        {/* Avatar placeholder for consistent alignment */}
        {message.sender?.id !== currentUserId && (
          <div className="w-10 h-10 flex-shrink-0">
            {showAvatar && (
              <div className="w-10 h-10 rounded-full overflow-hidden bg-muted">
                {message.sender?.avatar_url !== null &&
                message.sender?.avatar_url !== undefined ? (
                  <Image
                    src={message.sender.avatar_url}
                    alt={
                      message.sender?.username ??
                      message.sender?.full_name ??
                      'User'
                    }
                    width={AVATAR_SIZE}
                    height={AVATAR_SIZE}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                    {(
                      message.sender?.username?.[0] ??
                      message.sender?.full_name?.[0] ??
                      'U'
                    ).toUpperCase()}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col min-w-0 flex-1 max-w-[70%]">
          {/* Username and timestamp header */}
          {showUsername && message.sender?.id !== currentUserId && (
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold text-foreground">
                {message.sender?.username ??
                  message.sender?.full_name ??
                  'Unknown'}
              </span>
              <span className="text-xs text-muted-foreground">
                {message.created_at !== null && message.created_at !== undefined
                  ? new Date(message.created_at).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : ''}
              </span>
            </div>
          )}

          <div
            className={`group-hover:bg-muted/30 transition-colors duration-150 rounded px-3 py-2 ${
              message.sender?.id === currentUserId
                ? 'bg-primary text-primary-foreground rounded-br-sm ml-auto'
                : showUsername
                  ? 'bg-transparent'
                  : 'bg-transparent hover:bg-muted/20'
            }`}
          >
            <div className="text-sm whitespace-pre-wrap break-words leading-relaxed">
              {message.content}
            </div>

            {/* Actions and timestamp for hover */}
            <div
              className={`flex items-center mt-1 gap-2 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ${
                message.sender?.id === currentUserId
                  ? 'justify-end'
                  : 'justify-start'
              }`}
            >
              {/* Show timestamp on hover for grouped messages */}
              {!showUsername && (
                <span>
                  {message.created_at !== null &&
                  message.created_at !== undefined
                    ? new Date(message.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : ''}
                </span>
              )}
              <button
                type="button"
                className="hover:text-primary transition-colors px-1 py-0.5 rounded hover:bg-muted"
              >
                Reply
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Custom equality function for memoization
const areEqual = (
  prevProps: VirtualMessageRowProps,
  nextProps: VirtualMessageRowProps,
): boolean => {
  // Check if virtual item position changed
  if (
    prevProps.virtualItem.start !== nextProps.virtualItem.start ||
    prevProps.virtualItem.size !== nextProps.virtualItem.size ||
    prevProps.virtualItem.index !== nextProps.virtualItem.index
  ) {
    return false;
  }

  // Check if message content changed
  if (
    prevProps.message.id !== nextProps.message.id ||
    prevProps.message.content !== nextProps.message.content ||
    prevProps.message.created_at !== nextProps.message.created_at ||
    prevProps.message.edited_at !== nextProps.message.edited_at ||
    prevProps.message.deleted_at !== nextProps.message.deleted_at
  ) {
    return false;
  }

  // Check if sender information changed
  if (
    prevProps.message.sender?.id !== nextProps.message.sender?.id ||
    prevProps.message.sender?.username !== nextProps.message.sender?.username ||
    prevProps.message.sender?.full_name !==
      nextProps.message.sender?.full_name ||
    prevProps.message.sender?.avatar_url !==
      nextProps.message.sender?.avatar_url
  ) {
    return false;
  }

  // Check if context that affects rendering changed
  if (
    prevProps.currentUserId !== nextProps.currentUserId ||
    prevProps.firstUnreadIndex !== nextProps.firstUnreadIndex
  ) {
    return false;
  }

  // Check if previous message sender changed (affects grouping)
  const prevPreviousMessage =
    prevProps.messages[prevProps.virtualItem.index - 1];
  const nextPreviousMessage =
    nextProps.messages[nextProps.virtualItem.index - 1];
  if (prevPreviousMessage?.sender?.id !== nextPreviousMessage?.sender?.id) {
    return false;
  }

  // All relevant props are equal
  return true;
};

// Memoized component
const VirtualMessageRow = React.memo(VirtualMessageRowComponent, areEqual);
