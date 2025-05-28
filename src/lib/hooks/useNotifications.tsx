'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { clientNotificationService } from '@/lib/notifications/client-service';
import type { Notification, NotificationFilters } from '@/types/notifications';

interface UseNotificationsOptions {
  autoFetch?: boolean;
  realtime?: boolean;
  filters?: NotificationFilters;
}

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  fetchNotifications: (filters?: NotificationFilters) => Promise<void>;
  markAsRead: (notificationIds?: string[]) => Promise<void>;
  deleteNotifications: (notificationIds: string[]) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useNotifications(
  userId?: string,
  options: UseNotificationsOptions = {},
): UseNotificationsReturn {
  const { autoFetch = true, realtime = true, filters = {} } = options;

  // Memoize filters to prevent unnecessary re-renders
  const memoizedFilters = useMemo(() => filters, [filters]);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use ref to prevent multiple simultaneous requests
  const isRequestInProgress = useRef(false);

  // Debounce timer ref
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const fetchNotifications = useCallback(
    async (fetchFilters?: NotificationFilters, immediate = false) => {
      if (!userId || isRequestInProgress.current) return;

      // Clear any existing debounce timer
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      const performFetch = async () => {
        isRequestInProgress.current = true;
        setIsLoading(true);
        setError(null);

        try {
          const response = await clientNotificationService.getNotifications({
            ...memoizedFilters,
            ...fetchFilters,
          });

          setNotifications(response.notifications);
          setUnreadCount(response.unread_count);
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : 'Failed to fetch notifications',
          );
        } finally {
          setIsLoading(false);
          isRequestInProgress.current = false;
        }
      };

      if (immediate) {
        await performFetch();
      } else {
        // Debounce the request by 300ms
        debounceTimer.current = setTimeout(performFetch, 300);
      }
    },
    [userId, memoizedFilters],
  );

  const markAsRead = useCallback(
    async (notificationIds?: string[]) => {
      try {
        const result =
          await clientNotificationService.markAsRead(notificationIds);
        if (result.success) {
          setNotifications((prev) =>
            prev.map((notification) =>
              !notificationIds || notificationIds.includes(notification.id)
                ? { ...notification, read_at: new Date().toISOString() }
                : notification,
            ),
          );

          if (notificationIds) {
            setNotifications((prev) => {
              const unreadToMark = prev.filter(
                (n) => notificationIds.includes(n.id) && !n.read_at,
              ).length;
              setUnreadCount((current) => Math.max(0, current - unreadToMark));
              return prev;
            });
          } else {
            setUnreadCount(0);
          }
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to mark notifications as read',
        );
      }
    },
    [], // Remove notifications dependency to prevent infinite loops
  );

  const deleteNotifications = useCallback(
    async (notificationIds: string[]) => {
      try {
        const result =
          await clientNotificationService.deleteNotifications(notificationIds);
        if (result.success) {
          setNotifications((prev) => {
            const unreadToDelete = prev.filter(
              (n) => notificationIds.includes(n.id) && !n.read_at,
            ).length;

            setUnreadCount((current) => Math.max(0, current - unreadToDelete));
            return prev.filter((n) => !notificationIds.includes(n.id));
          });
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to delete notifications',
        );
      }
    },
    [], // Remove notifications dependency to prevent infinite loops
  );

  const refresh = useCallback(() => {
    return fetchNotifications();
  }, [fetchNotifications]);

  // Use ref to track if initial fetch has been done
  const initialFetchDone = useRef(false);

  // Initial fetch
  useEffect(() => {
    if (autoFetch && userId && !initialFetchDone.current) {
      initialFetchDone.current = true;
      fetchNotifications(undefined, true); // Immediate fetch for initial load
    }
  }, [autoFetch, userId, fetchNotifications]);

  // Real-time subscription
  useEffect(() => {
    if (!realtime || !userId) return;

    const unsubscribe = clientNotificationService.subscribeToNotifications(
      userId,
      (newNotification: Notification) => {
        setNotifications((prev) => [newNotification, ...prev]);
        if (!newNotification.read_at) {
          setUnreadCount((prev) => prev + 1);
        }
      },
    );

    return unsubscribe || undefined;
  }, [realtime, userId]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    fetchNotifications,
    markAsRead,
    deleteNotifications,
    refresh,
  };
}
