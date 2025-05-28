'use client';

import { useState, useEffect, useCallback } from 'react';
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

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(
    async (fetchFilters?: NotificationFilters) => {
      if (!userId) return;

      setIsLoading(true);
      setError(null);

      try {
        const response = await clientNotificationService.getNotifications({
          ...filters,
          ...fetchFilters,
        });

        setNotifications(response.notifications);
        setUnreadCount(response.unread_count);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to fetch notifications',
        );
      } finally {
        setIsLoading(false);
      }
    },
    [userId, filters],
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
            const unreadToMark = notifications.filter(
              (n) => notificationIds.includes(n.id) && !n.read_at,
            ).length;
            setUnreadCount((prev) => Math.max(0, prev - unreadToMark));
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
    [notifications],
  );

  const deleteNotifications = useCallback(
    async (notificationIds: string[]) => {
      try {
        const result =
          await clientNotificationService.deleteNotifications(notificationIds);
        if (result.success) {
          const unreadToDelete = notifications.filter(
            (n) => notificationIds.includes(n.id) && !n.read_at,
          ).length;

          setNotifications((prev) =>
            prev.filter((n) => !notificationIds.includes(n.id)),
          );
          setUnreadCount((prev) => Math.max(0, prev - unreadToDelete));
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to delete notifications',
        );
      }
    },
    [notifications],
  );

  const refresh = useCallback(() => {
    return fetchNotifications();
  }, [fetchNotifications]);

  // Initial fetch
  useEffect(() => {
    if (autoFetch && userId) {
      fetchNotifications();
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
