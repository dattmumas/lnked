import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useCallback, useRef } from 'react';

import { realtimeService } from '@/lib/realtime/realtime-service';

interface VideoStatusUpdate {
  id: string;
  status: string;
  duration?: number;
  aspect_ratio?: string;
  mux_playback_id?: string;
  updated_at: string;
}

interface UseVideoStatusRealtimeOptions {
  userId: string;
  enabled?: boolean;
  onStatusUpdate?: (update: VideoStatusUpdate) => void;
}

// Track active video-status subscriptions to avoid duplicate `.subscribe()` calls
// that can occur during Next.js Fast Refresh / React StrictMode double mounts.
const activeVideoStatusSubscriptions = new Set<string>();

/**
 * Hook for real-time video status updates
 * Replaces polling-based status checking with Supabase real-time subscriptions
 */
export function useVideoStatusRealtime({
  userId,
  enabled = true,
  onStatusUpdate,
}: UseVideoStatusRealtimeOptions) {
  const queryClient = useQueryClient();
  const cleanupRef = useRef<(() => void) | null>(null);

  // Handle video status updates
  const handleVideoStatusUpdate = useCallback(
    (update: VideoStatusUpdate) => {
      // Only log critical status changes to reduce console spam
      if (update.status === 'ready' || update.status === 'error') {
        console.log(`🎥 [REALTIME] Video ${update.status}:`, update.id);
      }

      // Update React Query cache for video queries
      queryClient.setQueryData(['video', update.id], (oldData: unknown) => {
        if (oldData && typeof oldData === 'object') {
          return {
            ...oldData,
            status: update.status,
            duration:
              update.duration ??
              (oldData as Record<string, unknown>)['duration'],
            aspect_ratio:
              update.aspect_ratio ??
              (oldData as Record<string, unknown>)['aspect_ratio'],
            mux_playback_id:
              update.mux_playback_id ??
              (oldData as Record<string, unknown>)['mux_playback_id'],
            updated_at: update.updated_at,
          };
        }
        return oldData;
      });

      // Invalidate video list queries to refresh lists
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      queryClient.invalidateQueries({ queryKey: ['video-stats'] });

      // Invalidate feed queries if video is ready (for immediate feed updates)
      if (update.status === 'ready') {
        queryClient.invalidateQueries({ queryKey: ['tenant-feed'] });
        queryClient.invalidateQueries({ queryKey: ['feed'] });
      }

      // Call custom callback if provided
      if (onStatusUpdate) {
        onStatusUpdate(update);
      }
    },
    [queryClient, onStatusUpdate],
  );

  useEffect(() => {
    // Video realtime effect triggered
    if (!enabled || !userId) {
      return undefined;
    }

    // Skip if already subscribed for this user (avoids duplicate subscribe)
    if (activeVideoStatusSubscriptions.has(userId)) {
      return undefined;
    }

    // Mark as active IMMEDIATELY to prevent race conditions during Fast Refresh
    activeVideoStatusSubscriptions.add(userId);

    const setupRealtime = async () => {
      try {
        await realtimeService.subscribeToVideoStatus(userId, (update) => {
          // Only log significant updates to reduce console spam
          if (update.status === 'ready' || update.status === 'error') {
            console.log(`🎥 Video ${update.status}: ${update.id}`);
          }
          queryClient.setQueryData(['video-status', userId], update);
        });

        // Store cleanup function (ref-count aware)
        cleanupRef.current = () => {
          void realtimeService
            .unsubscribeFromVideoStatus(userId)
            .catch(console.error);
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
            `🎥 [WARNING] Channel already subscribed for user ${userId}, this is expected during fast navigation. Ignoring error.`,
          );
          // Don't remove from active subscriptions - the subscription might still be working
          return;
        }

        console.error(
          `🎥 [ERROR] Failed to set up video status realtime:`,
          error,
        );
        activeVideoStatusSubscriptions.delete(userId);
      }
    };

    void setupRealtime();

    // Cleanup function
    return () => {
      activeVideoStatusSubscriptions.delete(userId);

      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [enabled, userId, queryClient]);

  return {
    // This hook primarily handles side effects
    // Could return connection status in the future if needed
  };
}
