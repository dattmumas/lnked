import { useCallback, useMemo, useRef, useState } from 'react';

import type { MessageWithSender } from '@/lib/chat/types';



export interface OptimisticMessage extends MessageWithSender {
  /** @internal UI-only state - do not persist */
  isOptimistic?: boolean;
  /** @internal UI-only temp ID for tracking */
  tempId?: string;
  /** @internal UI-only send status */
  sendStatus?: 'sending' | 'failed' | 'sent';
  /** Pre-parsed timestamp for efficient sorting */
  sortTime?: number;
}

interface UseOptimisticMessagesOptions {
  onRetry?: (tempId: string) => void;
  /** Maximum number of pending optimistic messages (default: 50) */
  maxOptimisticMessages?: number;
}

// Constants
const DEFAULT_MAX_OPTIMISTIC = 50;
const EPOCH_FALLBACK = 0;

export function useOptimisticMessages(
  messages: MessageWithSender[] = [],
  options: UseOptimisticMessagesOptions = {}
): {
  messages: OptimisticMessage[];
  addOptimisticMessage: (message: OptimisticMessage, retryCallback?: () => void) => void;
  markMessageSent: (tempId: string, actualMessage?: MessageWithSender) => void;
  markMessageFailed: (tempId: string, error?: string) => void;
  removeOptimisticMessage: (tempId: string) => void;
  retryMessage: (tempId: string) => void;
  clearOptimisticMessages: () => void;
  hasOptimisticMessages: boolean;
} {
  // Destructure options to avoid stale closure issues
  const { onRetry, maxOptimisticMessages = DEFAULT_MAX_OPTIMISTIC } = options;
  
  // Use canonical message ID (real id if available, fallback to tempId)
  const [optimisticMessages, setOptimisticMessages] = useState<Map<string, OptimisticMessage>>(
    new Map()
  );
  const retryCallbacksRef = useRef<Map<string, () => void>>(new Map());

  // Helper: Get canonical ID for a message (prevents duplication)
  const getCanonicalId = useCallback((message: OptimisticMessage): string => {
    if (message.id !== undefined && message.id !== null && message.id !== '') {
      return message.id;
    }
    if (message.tempId !== undefined && message.tempId !== null && message.tempId !== '') {
      return message.tempId;
    }
    return '';
  }, []);

  // Helper: Parse timestamp once for efficient sorting
  const parseTimestamp = useCallback((timestamp?: string | null): number => {
    if (timestamp === null || timestamp === undefined || timestamp === '') {
      return EPOCH_FALLBACK;
    }
    const parsed = new Date(timestamp).getTime();
    return isNaN(parsed) ? EPOCH_FALLBACK : parsed;
  }, []);

  // Add an optimistic message with queue limit protection
  const addOptimisticMessage = useCallback((message: OptimisticMessage, retryCallback?: () => void) => {
    const canonicalId = getCanonicalId(message);
    if (canonicalId === '') return;

    setOptimisticMessages(prev => {
      const next = new Map(prev);
      
      // Enforce max queue size by evicting oldest
      if (next.size >= maxOptimisticMessages) {
        const oldestKey = next.keys().next().value;
        if (oldestKey !== undefined && oldestKey !== null && oldestKey !== '') {
          next.delete(oldestKey);
          retryCallbacksRef.current.delete(oldestKey);
          console.warn(`useOptimisticMessages: Evicted oldest message due to queue limit (${maxOptimisticMessages})`);
        }
      }

      // Add optimistic message with pre-parsed timestamp
      next.set(canonicalId, {
        ...message,
        isOptimistic: true,
        sendStatus: 'sending',
        sortTime: parseTimestamp(message.created_at)
      });

      return next;
    });

    // Store retry callback if provided
    if (retryCallback) {
      retryCallbacksRef.current.set(canonicalId, retryCallback);
    }
  }, [getCanonicalId, maxOptimisticMessages, parseTimestamp]);

  // Mark message as successfully sent - fixes key handling
  const markMessageSent = useCallback((tempId: string, actualMessage?: MessageWithSender) => {
    setOptimisticMessages(prev => {
      const next = new Map(prev);
      const existing = next.get(tempId);
      
      if (!existing) return next;

      if (actualMessage) {
        // Remove old tempId entry and add under real ID
        next.delete(tempId);
        const canonicalId = getCanonicalId(actualMessage);
        
        next.set(canonicalId, {
          ...actualMessage,
          isOptimistic: false,
          sendStatus: 'sent',
          sortTime: parseTimestamp(actualMessage.created_at)
        });
        
        // Update retry callback key if different
        if (canonicalId !== tempId) {
          const retryFn = retryCallbacksRef.current.get(tempId);
          if (retryFn) {
            retryCallbacksRef.current.delete(tempId);
            retryCallbacksRef.current.set(canonicalId, retryFn);
          }
        }
      } else {
        // Just mark as sent (keep same key)
        next.set(tempId, {
          ...existing,
          sendStatus: 'sent',
          isOptimistic: false
        });
      }
      
      return next;
    });

    // Clean up retry callback for tempId (actualMessage cleanup handled above)
    if (!actualMessage || tempId === getCanonicalId(actualMessage)) {
      retryCallbacksRef.current.delete(tempId);
    }
  }, [getCanonicalId, parseTimestamp]);

  // Mark message as failed
  const markMessageFailed = useCallback((tempId: string, error?: string) => {
    setOptimisticMessages(prev => {
      const next = new Map(prev);
      const existing = next.get(tempId);
      if (existing) {
        next.set(tempId, {
          ...existing,
          sendStatus: 'failed',
          metadata: {
            ...(typeof existing.metadata === 'object' && existing.metadata !== null ? existing.metadata : {}),
            error
          }
        });
      }
      return next;
    });
  }, []);

  // Remove an optimistic message with proper cleanup
  const removeOptimisticMessage = useCallback((tempId: string) => {
    setOptimisticMessages(prev => {
      const next = new Map(prev);
      next.delete(tempId);
      return next;
    });
    // Always clean up retry callback to prevent memory leaks
    retryCallbacksRef.current.delete(tempId);
  }, []);

  // Retry a failed message - fixed stale closure issue
  const retryMessage = useCallback((tempId: string) => {
    const retryFn = retryCallbacksRef.current.get(tempId);
    if (retryFn) {
      // Mark as sending again
      setOptimisticMessages(prev => {
        const next = new Map(prev);
        const existing = next.get(tempId);
        if (existing) {
          next.set(tempId, {
            ...existing,
            sendStatus: 'sending'
          });
        }
        return next;
      });
      
      retryFn();
    } else if (onRetry) {
      onRetry(tempId);
    }
  }, [onRetry]); // Fixed: use destructured onRetry instead of options

  // Memoized merge function - fixes expensive re-computation
  const mergedMessages = useMemo((): OptimisticMessage[] => {
    const optimisticArray = Array.from(optimisticMessages.values());
    
    // Pre-process real messages with parsed timestamps (one-time cost)
    const realMessages: OptimisticMessage[] = messages.map(msg => ({
      ...msg,
      isOptimistic: false,
      sortTime: parseTimestamp(msg.created_at)
    }));
    
    // Use canonical IDs for deduplication (prevents double-render)
    const optimisticCanonicalIds = new Set(
      optimisticArray.map(msg => getCanonicalId(msg))
    );
    
    // Filter out real messages that have optimistic counterparts
    const filteredRealMessages = realMessages.filter(msg => 
      !optimisticCanonicalIds.has(getCanonicalId(msg))
    );
    
    // Combine and sort by pre-parsed timestamps (O(n log n) but with efficient comparison)
    const combined = [...filteredRealMessages, ...optimisticArray];
    return combined.sort((a, b) => {
      const aTime = a.sortTime ?? EPOCH_FALLBACK;
      const bTime = b.sortTime ?? EPOCH_FALLBACK;
      return aTime - bTime;
    });
  }, [messages, optimisticMessages, parseTimestamp, getCanonicalId]);

  // Clear all optimistic messages with complete cleanup
  const clearOptimisticMessages = useCallback(() => {
    setOptimisticMessages(new Map());
    retryCallbacksRef.current.clear();
  }, []);

  return {
    messages: mergedMessages, // Return memoized value directly
    addOptimisticMessage,
    markMessageSent,
    markMessageFailed,
    removeOptimisticMessage,
    retryMessage,
    clearOptimisticMessages,
    hasOptimisticMessages: optimisticMessages.size > 0
  };
} 