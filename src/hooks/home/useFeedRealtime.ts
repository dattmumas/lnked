import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useCallback, useState, useRef } from 'react';

import { realtimeService } from '@/lib/chat/realtime-service';

interface PostUpdate {
  id: string;
  title?: string;
  content?: string;
  status?: string;
  updated_at: string;
}

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

  // Handle post updates
  const handlePostUpdate = useCallback(
    (update: PostUpdate) => {
      // Only log critical status changes to reduce console spam
      if (update.status === 'published' || update.status === 'deleted') {
        console.log(`📝 Post ${update.status}: ${update.id}`);
      }

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
      if (update.status === 'published') {
        setNewPostsCount((prev) => prev + 1);
        setHasNewPosts(true);

        if (onNewPostsAvailable) {
          onNewPostsAvailable(newPostsCount + 1);
        }
      }

      // Call custom callback if provided
      if (onPostUpdate) {
        onPostUpdate(update);
      }
    },
    [queryClient, onPostUpdate, onNewPostsAvailable, newPostsCount],
  );

  // Function to refresh feed and clear new posts indicator
  const refreshFeed = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['tenant-feed'] });
    queryClient.invalidateQueries({ queryKey: ['feed'] });
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
        await realtimeService.subscribeToPostUpdates(tenantId, (update) => {
          // Only log critical updates to reduce console spam
          if (update.status === 'published' || update.status === 'deleted') {
            console.log(`📝 Post ${update.status}: ${update.id}`);
          }
          // Invalidate relevant queries when posts are updated
          void queryClient.invalidateQueries({
            queryKey: ['posts'],
          });
        });

        // Store cleanup function
        cleanupRef.current = () => {
          activeFeedSubscriptions.delete(tenantId);
          void realtimeService.unsubscribeFromPostUpdates(tenantId);
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        // Handle specific "subscribe multiple times" error
        if (
          errorMessage.includes('subscribe multiple times') ||
          errorMessage.includes('subscribe can only be called a single time')
        ) {
          console.warn(
            `📝 [WARNING] Channel already subscribed for tenant ${tenantId}, this is expected during development. Ignoring error.`,
          );
          // Don't remove from active subscriptions - the subscription might still be working
          return;
        }

        console.error(`📝 [ERROR] Failed to set up feed realtime:`, error);
        activeFeedSubscriptions.delete(tenantId);
      }
    };

    void setupRealtime();

    // Cleanup function
    return () => {
      // Remove from active set IMMEDIATELY when effect cleans up
      activeFeedSubscriptions.delete(tenantId);

      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [enabled, tenantId, queryClient]);

  return {
    newPostsCount,
    hasNewPosts,
    refreshFeed,
  };
}
