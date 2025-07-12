import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useCallback, useState, useRef } from 'react';

import { Database } from '@/lib/database.types';
import { realtimeService } from '@/lib/realtime/realtime-service';

type PostUpdate = Pick<
  Database['public']['Tables']['posts']['Row'],
  'id' | 'title' | 'content' | 'status' | 'updated_at'
>;
interface UseFeedRealtimeOptions {
  tenantId: string;
  enabled?: boolean;
  onPostUpdate?: (update: PostUpdate) => void;
  onNewPostsAvailable?: (count: number) => void;
}

// Track active feed subscriptions to avoid duplicate `.subscribe()` calls
// that can occur during Next.js Fast Refresh / React StrictMode double mounts.
const activeFeedSubscriptions = new Set<string>();

/**
 * Hook for real-time feed updates
 * Provides instant updates for new posts and post changes
 */
export function useFeedRealtime({
  tenantId,
  enabled = true,
  onPostUpdate,
  onNewPostsAvailable,
}: UseFeedRealtimeOptions) {
  const queryClient = useQueryClient();
  const [newPostsCount, setNewPostsCount] = useState(0);
  const [hasNewPosts, setHasNewPosts] = useState(false);
  const cleanupRef = useRef<(() => void) | null>(null);
  const pendingUpdatesRef = useRef<PostUpdate[]>([]);
  const batchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Use refs for callbacks to keep them stable and prevent re-renders
  const onPostUpdateRef = useRef(onPostUpdate);
  const onNewPostsAvailableRef = useRef(onNewPostsAvailable);
  useEffect(() => {
    onPostUpdateRef.current = onPostUpdate;
    onNewPostsAvailableRef.current = onNewPostsAvailable;
  });

  // Batch cache updates to reduce render frequency
  const processBatchedUpdates = useCallback(() => {
    if (pendingUpdatesRef.current.length === 0) return;

    const updates = [...pendingUpdatesRef.current];
    pendingUpdatesRef.current = [];

    // Process all updates in batch
    updates.forEach((update) => {
      // Update React Query cache for specific post
      queryClient.setQueryData(['post', update.id], (oldData: unknown) => {
        if (oldData && typeof oldData === 'object') {
          return {
            ...oldData,
            title:
              update.title ?? (oldData as Record<string, unknown>)['title'],
            content:
              update.content ?? (oldData as Record<string, unknown>)['content'],
            status:
              update.status ?? (oldData as Record<string, unknown>)['status'],
            updated_at: update.updated_at,
          };
        }
        return oldData;
      });

      // Call custom callback if provided
      if (onPostUpdateRef.current) {
        onPostUpdateRef.current(update);
      }
    });

    // Count new posts and update state once
    const newPublishedPosts = updates.filter(
      (u) => u.status === 'active',
    ).length;
    if (newPublishedPosts > 0) {
      setNewPostsCount((prevCount) => {
        const newCount = prevCount + newPublishedPosts;
        if (onNewPostsAvailableRef.current) {
          onNewPostsAvailableRef.current(newCount);
        }
        return newCount;
      });
      setHasNewPosts(true);
    }
  }, [queryClient]);

  // Handle post updates with batching
  const handlePostUpdate = useCallback(
    (update: PostUpdate) => {
      // Add to pending updates
      pendingUpdatesRef.current.push(update);

      // Clear existing timeout and set new one
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
      }

      // Process batch after 300ms of inactivity
      batchTimeoutRef.current = setTimeout(processBatchedUpdates, 300);
    },
    [processBatchedUpdates],
  );

  // Function to refresh feed and clear new posts indicator
  const refreshFeed = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['unified-feed'] });
    queryClient.invalidateQueries({ queryKey: ['tenant-feed'] }); // Keep for backward compatibility
    queryClient.invalidateQueries({ queryKey: ['feed'] }); // Keep for backward compatibility
    setNewPostsCount(0);
    setHasNewPosts(false);
  }, [queryClient]);

  useEffect(() => {
    if (!enabled || !tenantId) {
      return undefined;
    }

    // Skip if already subscribed for this tenant (avoids duplicate subscribe)
    if (activeFeedSubscriptions.has(tenantId)) {
      return undefined;
    }

    // Mark as active IMMEDIATELY to prevent race conditions during Fast Refresh
    activeFeedSubscriptions.add(tenantId);

    const setupRealtime = async () => {
      try {
        await realtimeService.subscribeToPostUpdates(
          tenantId,
          handlePostUpdate,
        );

        // Store cleanup function
        cleanupRef.current = () => {
          activeFeedSubscriptions.delete(tenantId);
          void realtimeService.unsubscribeFromPostUpdates(tenantId);
        };
      } catch (error) {
        console.error('Failed to setup realtime feed:', error);
        activeFeedSubscriptions.delete(tenantId); // Clear on error
      }
    };

    void setupRealtime();

    // Cleanup on unmount
    return () => {
      // Remove from active set IMMEDIATELY when effect cleans up
      activeFeedSubscriptions.delete(tenantId);

      // Clear any pending batch timeout
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
        batchTimeoutRef.current = null;
      }

      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [enabled, tenantId, handlePostUpdate]);

  return {
    newPostsCount,
    hasNewPosts,
    refreshFeed,
  };
}
