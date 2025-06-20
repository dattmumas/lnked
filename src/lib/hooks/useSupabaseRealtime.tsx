/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable react-hooks/exhaustive-deps */

import { useEffect, useCallback, useRef } from 'react';

import supabase from '@/lib/supabase/browser';

import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
  REALTIME_SUBSCRIBE_STATES,
} from '@supabase/supabase-js';

// Constants for magic numbers
const RANDOM_STRING_RADIX = 36;
const RANDOM_STRING_START = 2;
const RANDOM_STRING_END = 11;

// Channel registry for reuse and ref-counting
const channelRegistry = new Map<
  string,
  {
    channel: RealtimeChannel;
    refCount: number;
    subscribers: Set<string>;
  }
>();

// Generate unique subscriber IDs
const generateSubscriberId = (): string => {
  return `subscriber_${Date.now()}_${Math.random().toString(RANDOM_STRING_RADIX).substring(RANDOM_STRING_START, RANDOM_STRING_END)}`;
};

interface RealtimePayload<T> {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new?: T;
  old?: T;
}

interface UseSupabaseRealtimeOptions<T> {
  /** Debounce time in milliseconds for burst updates (default: 0 - no debouncing) */
  debounceMs?: number;
  /** Enable detailed logging for debugging */
  enableLogging?: boolean;
  /** Custom error handler for subscription failures */
  onError?: (error: Error) => void;
  /** Validate payload before calling onChange */
  validator?: (payload: unknown) => payload is T;
}

/**
 * Production-ready hook for Supabase realtime subscriptions with:
 * - Channel registry for reuse and memory optimization
 * - Robust error handling and subscription status monitoring
 * - Type safety with optional validation
 * - Debouncing for high-volume scenarios
 * - Proper cleanup and ref-counting
 *
 * @param table - The table name to subscribe to (e.g., "posts")
 * @param onChange - Callback for insert/update/delete events
 * @param filter - Optional filter (e.g., { column: "collective_id", value: "abc" })
 * @param options - Additional configuration options
 */
export function useSupabaseRealtime<T extends Record<string, unknown>>(
  table: string,
  onChange: (payload: RealtimePayload<T>) => void,
  filter?: { column: string; value: string | number },
  options: UseSupabaseRealtimeOptions<T> = {},
): {
  /** Current subscription status */
  status: REALTIME_SUBSCRIBE_STATES | 'UNSUBSCRIBED';
  /** Manual cleanup function */
  cleanup: () => void;
} {
  const { debounceMs = 0, enableLogging = false, onError, validator } = options;

  const subscriberIdRef = useRef<string>(generateSubscriberId());
  const statusRef = useRef<REALTIME_SUBSCRIBE_STATES | 'UNSUBSCRIBED'>(
    'UNSUBSCRIBED',
  );
  const debounceTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const pendingUpdatesRef = useRef<RealtimePayload<T>[]>([]);

  // Memoize the onChange callback to prevent stale closures
  const stableOnChange = useCallback(onChange, [onChange]);

  // Generate consistent channel key for registry
  const channelKey = filter
    ? `realtime:${table}:${filter.column}=eq.${filter.value}`
    : `realtime:${table}`;

  // Debounced update handler
  const flushPendingUpdates = useCallback(() => {
    if (pendingUpdatesRef.current.length > 0) {
      const updates = [...pendingUpdatesRef.current];
      pendingUpdatesRef.current = [];

      // Process all pending updates
      updates.forEach((update) => {
        try {
          stableOnChange(update);
        } catch (error) {
          if (enableLogging) {
            console.error('Error in onChange callback:', error);
          }
          if (onError) {
            onError(error instanceof Error ? error : new Error(String(error)));
          }
        }
      });
    }
  }, [stableOnChange, enableLogging, onError]);

  // Handle realtime payload with error boundary and debouncing
  const handleRealtimePayload = useCallback(
    (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
      const update: RealtimePayload<T> = {
        eventType: payload.eventType,
        new: payload.new
          ? validator
            ? validator(payload.new)
              ? payload.new
              : undefined
            : (payload.new as T)
          : undefined,
        old: payload.old
          ? validator
            ? validator(payload.old)
              ? payload.old
              : undefined
            : (payload.old as T)
          : undefined,
      };

      if (debounceMs > 0) {
        // Add to pending updates for debouncing
        pendingUpdatesRef.current.push(update);

        // Clear existing timer and set new one
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(flushPendingUpdates, debounceMs);
      } else {
        // Immediate update with error boundary
        try {
          stableOnChange(update);
        } catch (error) {
          if (enableLogging) {
            console.error('Error in onChange callback:', error);
          }
          if (onError) {
            onError(error instanceof Error ? error : new Error(String(error)));
          }
        }
      }
    },
    [
      stableOnChange,
      debounceMs,
      flushPendingUpdates,
      enableLogging,
      onError,
      validator,
    ],
  );

  // Cleanup function (synchronous for useEffect)
  const cleanup = useCallback(() => {
    const subscriberId = subscriberIdRef.current;
    const registryEntry = channelRegistry.get(channelKey);

    if (!registryEntry) return;

    // Remove this subscriber
    registryEntry.subscribers.delete(subscriberId);
    registryEntry.refCount--;

    if (enableLogging) {
      console.warn(
        `Removing subscriber ${subscriberId} from channel ${channelKey}. Remaining refs: ${registryEntry.refCount}`,
      );
    }

    // If no more subscribers, cleanup the channel
    if (registryEntry.refCount <= 0) {
      // Use void to handle async cleanup without blocking
      void (async () => {
        try {
          await registryEntry.channel.unsubscribe();
          channelRegistry.delete(channelKey);

          if (enableLogging) {
            console.warn(`Channel ${channelKey} fully cleaned up`);
          }
        } catch (error) {
          if (enableLogging) {
            console.error('Error during channel cleanup:', error);
          }
          // Don't throw - cleanup should be non-fatal
        }
      })();
    }

    // Clear any pending debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    statusRef.current = 'UNSUBSCRIBED';
  }, [channelKey, enableLogging]);

  useEffect(() => {
    const subscriberId = subscriberIdRef.current;
    let registryEntry = channelRegistry.get(channelKey);

    // Create or reuse channel
    if (!registryEntry) {
      const channel = supabase.channel(channelKey);

      // Configure postgres changes listener
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          ...(filter ? { filter: `${filter.column}=eq.${filter.value}` } : {}),
        },
        handleRealtimePayload,
      );

      registryEntry = {
        channel,
        refCount: 0,
        subscribers: new Set(),
      };

      channelRegistry.set(channelKey, registryEntry);
    }

    // Add this subscriber
    registryEntry.subscribers.add(subscriberId);
    registryEntry.refCount++;

    if (enableLogging) {
      console.warn(
        `Adding subscriber ${subscriberId} to channel ${channelKey}. Total refs: ${registryEntry.refCount}`,
      );
    }

    // Subscribe with status handling
    registryEntry.channel.subscribe((status) => {
      statusRef.current = status;

      const statusString = String(status);
      switch (statusString) {
        case 'SUBSCRIBED': {
          if (enableLogging) {
            console.warn(`Successfully subscribed to ${channelKey}`);
          }
          break;
        }
        case 'CHANNEL_ERROR': {
          const error = new Error(
            `Realtime subscription failed for ${channelKey}`,
          );
          if (enableLogging) {
            console.error('Channel error:', error);
          }
          if (onError) {
            onError(error);
          }
          break;
        }
        case 'TIMED_OUT': {
          const timeoutError = new Error(
            `Realtime subscription timeout for ${channelKey}`,
          );
          if (enableLogging) {
            console.error('Subscription timeout:', timeoutError);
          }
          if (onError) {
            onError(timeoutError);
          }
          break;
        }
        case 'CLOSED': {
          if (enableLogging) {
            console.warn(`Channel ${channelKey} closed`);
          }
          break;
        }
        default: {
          if (enableLogging) {
            console.warn(`Channel ${channelKey} status: ${statusString}`);
          }
        }
      }
    });

    // Cleanup on unmount or dependency change
    return cleanup;
  }, [
    table,
    filter?.column,
    filter?.value,
    channelKey,
    handleRealtimePayload,
    cleanup,
    enableLogging,
    onError,
  ]);

  return {
    status: statusRef.current,
    cleanup,
  };
}
