import { useCallback, useRef } from 'react';

// Constants
const DEFAULT_BATCH_DELAY = 2000; // 2 seconds

interface BatchedReadStatusOptions {
  batchDelay?: number; // Default 2 seconds
}

interface BatchedReadStatusReturn {
  batchedMarkAsRead: () => void;
  flushPendingUpdate: () => void;
}

/**
 * Hook to batch read status updates to avoid flooding the API
 * when messages arrive in rapid succession
 */
export function useBatchedReadStatus(
  conversationId: string,
  options: BatchedReadStatusOptions = {}
): BatchedReadStatusReturn {
  const { batchDelay = DEFAULT_BATCH_DELAY } = options;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingUpdateRef = useRef<boolean>(false);

  const markAsRead = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch(`/api/chat/${conversationId}/read`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('Failed to mark messages as read:', response.statusText);
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }, [conversationId]);

  const batchedMarkAsRead = useCallback((): void => {
    // If an update is already pending, don't schedule another
    if (pendingUpdateRef.current) return;

    pendingUpdateRef.current = true;

    // Clear any existing timeout
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
    }

    // Schedule the batched update
    timeoutRef.current = setTimeout(() => {
      pendingUpdateRef.current = false;
      timeoutRef.current = null;
      void markAsRead();
    }, batchDelay);
  }, [markAsRead, batchDelay]);

  const flushPendingUpdate = useCallback((): void => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (pendingUpdateRef.current) {
      pendingUpdateRef.current = false;
      void markAsRead();
    }
  }, [markAsRead]);

  return {
    batchedMarkAsRead,
    flushPendingUpdate,
  };
} 