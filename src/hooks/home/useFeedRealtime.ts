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

  // Use refs for callbacks to keep them stable and prevent re-renders
  const onPostUpdateRef = useRef(onPostUpdate);
  const onNewPostsAvailableRef = useRef(onNewPostsAvailable);
  useEffect(() => {
    onPostUpdateRef.current = onPostUpdate;
    onNewPostsAvailableRef.current = onNewPostsAvailable;
  });

  // Handle post updates
  const handlePostUpdate = useCallback(
    (update: PostUpdate) => {
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

      // For published posts, indicate new content is available
      if (update.status === 'active') {
        setNewPostsCount((prevCount) => {
          const newCount = prevCount + 1;
          if (onNewPostsAvailableRef.current) {
            onNewPostsAvailableRef.current(newCount);
          }
          return newCount;
        });
        setHasNewPosts(true);
      }

      // Call custom callback if provided
      if (onPostUpdateRef.current) {
        onPostUpdateRef.current(update);
      }
    },
    [queryClient],
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
