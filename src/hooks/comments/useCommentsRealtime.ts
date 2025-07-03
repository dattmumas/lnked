import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useCallback, useRef } from 'react';

import { realtimeService } from '@/lib/chat/realtime-service';

interface CommentUpdate {
  id: string;
  entity_type: string;
  entity_id: string;
  content?: string;
  deleted_at?: string;
  created_at?: string;
}

interface UseCommentsRealtimeOptions {
  entityType: string;
  entityId: string;
  enabled?: boolean;
  onCommentUpdate?: (update: CommentUpdate) => void;
}

/**
 * Hook for real-time comment updates
 * Provides instant updates for comment sections
 */
export function useCommentsRealtime({
  entityType,
  entityId,
  enabled = true,
  onCommentUpdate,
}: UseCommentsRealtimeOptions) {
  const queryClient = useQueryClient();
  const cleanupRef = useRef<(() => void) | null>(null);

  // Handle comment updates
  const handleCommentUpdate = useCallback(
    (update: CommentUpdate) => {
      console.log(`💬 [REALTIME] Comment update received:`, update);

      // Invalidate comment queries to refresh the comment section
      queryClient.invalidateQueries({
        queryKey: ['comments', entityType, entityId],
      });
      queryClient.invalidateQueries({
        queryKey: ['comment-count', entityType, entityId],
      });

      // Call custom callback if provided
      if (onCommentUpdate) {
        onCommentUpdate(update);
      }
    },
    [queryClient, entityType, entityId, onCommentUpdate],
  );

  useEffect(() => {
    if (!enabled || !entityType || !entityId) {
      return undefined;
    }

    const setupRealtime = async () => {
      try {
        console.log(
          `💬 [SETUP] Setting up comment realtime for ${entityType}:${entityId}`,
        );

        await realtimeService.subscribeToCommentUpdates(
          entityType,
          entityId,
          handleCommentUpdate,
        );

        console.log(
          `💬 [SETUP] Comment realtime subscription active for ${entityType}:${entityId}`,
        );

        // Store cleanup function
        cleanupRef.current = () => {
          console.log(
            `💬 [CLEANUP] Cleaning up comment realtime for ${entityType}:${entityId}`,
          );

          void realtimeService
            .unsubscribeFromCommentUpdates(entityType, entityId)
            .catch(console.error);
        };
      } catch (error) {
        console.error('[ERROR] Failed to setup comment realtime:', error);
      }
    };

    void setupRealtime();

    // Cleanup function
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [entityType, entityId, enabled, handleCommentUpdate]);

  return {
    // This hook primarily handles side effects
    // Could return connection status in the future if needed
  };
}
