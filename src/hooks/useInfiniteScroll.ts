// UNUSED: This file was determined to be legacy and is scheduled for removal. See files_to_remove.md for details.
export {};

import { useCallback, useRef, useState, useEffect } from 'react';

// Constants for scroll thresholds
const DEFAULT_NEAR_BOTTOM_THRESHOLD = 100;
const DEFAULT_SCROLL_BUTTON_THRESHOLD = 300;
const LOAD_MORE_THRESHOLD = 200;

interface UseInfiniteScrollOptions {
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
  nearBottomThreshold?: number;
  scrollButtonThreshold?: number;
}

interface UseInfiniteScrollReturn {
  scrollElementRef: React.RefObject<HTMLDivElement | null>;
  isNearBottom: boolean;
  showScrollButton: boolean;
  scrollToBottom: (smooth?: boolean) => void;
  scrollToTop: (smooth?: boolean) => void;
}

export function useInfiniteScroll({
  hasMore,
  isLoading,
  onLoadMore,
  nearBottomThreshold = DEFAULT_NEAR_BOTTOM_THRESHOLD,
  scrollButtonThreshold = DEFAULT_SCROLL_BUTTON_THRESHOLD,
}: UseInfiniteScrollOptions): UseInfiniteScrollReturn {
  const scrollElementRef = useRef<HTMLDivElement>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  
  // RAF state for optimized scroll handling
  const scrollRafRef = useRef<number | null>(null);
  const lastScrollTopRef = useRef<number>(0);

  // Optimized scroll handler that buffers DOM reads with RAF
  const handleScrollStateUpdate = useCallback((): void => {
    const element = scrollElementRef.current;
    if (element === null) return;

    // Buffer DOM reads in RAF to avoid forced layout
    const { scrollTop, scrollHeight, clientHeight } = element;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const distanceFromTop = scrollTop;

    // Batch state updates
    const nearBottom = distanceFromBottom < nearBottomThreshold;
    const shouldShowScrollButton = distanceFromBottom > scrollButtonThreshold;

    setIsNearBottom(nearBottom);
    setShowScrollButton(shouldShowScrollButton);

    // Check if we need to load more content
    if (hasMore && !isLoading && distanceFromTop < LOAD_MORE_THRESHOLD) {
      onLoadMore();
    }

    scrollRafRef.current = null;
  }, [hasMore, isLoading, onLoadMore, nearBottomThreshold, scrollButtonThreshold]);

  // Handle scroll position tracking with RAF buffering
  const handleScroll = useCallback((): void => {
    const element = scrollElementRef.current;
    if (element === null) return;

    // Store the current scroll position immediately
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
  useEffect((): (() => void) => {
    return (): void => {
      if (scrollRafRef.current !== null) {
        cancelAnimationFrame(scrollRafRef.current);
      }
    };
  }, []);

  // Set up scroll listener
  useEffect((): (() => void) | undefined => {
    const element = scrollElementRef.current;
    if (element === null) return undefined;

    element.addEventListener('scroll', handleScroll, { passive: true });
    
    return (): void => {
      element.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);

  // Scroll to bottom
  const scrollToBottom = useCallback((smooth = true): void => {
    const element = scrollElementRef.current;
    if (element === null) return;

    element.scrollTo({
      top: element.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto',
    });
  }, []);

  // Scroll to top
  const scrollToTop = useCallback((smooth = true): void => {
    const element = scrollElementRef.current;
    if (element === null) return;

    element.scrollTo({
      top: 0,
      behavior: smooth ? 'smooth' : 'auto',
    });
  }, []);

  return {
    scrollElementRef,
    isNearBottom,
    showScrollButton,
    scrollToBottom,
    scrollToTop,
  };
} 