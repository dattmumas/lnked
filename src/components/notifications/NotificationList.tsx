'use client';

import { Bell, CheckCheck, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';

import {
  markNotificationsAsRead,
  deleteNotifications,
} from '@/app/actions/notificationActions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

import { NotificationItem } from './NotificationItem';

import type {
  Notification,
  NotificationFilters,
  NotificationType,
} from '@/types/notifications';

// Type for API response
interface NotificationApiResponse {
  notifications: Notification[];
  unread_count: number;
  has_more: boolean;
}

const EMPTY_NOTIFICATIONS: Notification[] = [];

interface NotificationListProps {
  initialNotifications?: Notification[];
  initialUnreadCount?: number;
  className?: string;
}

const SKELETON_KEYS = ['s1', 's2', 's3', 's4', 's5'];

export function NotificationList({
  initialNotifications,
  initialUnreadCount,
  className,
}: NotificationListProps): React.JSX.Element {
  const safeInitialNotifications = initialNotifications ?? EMPTY_NOTIFICATIONS;
  const safeInitialUnread = initialUnreadCount ?? 0;
  const [notifications, setNotifications] = useState<Notification[]>(
    safeInitialNotifications,
  );
  const [unreadCount, setUnreadCount] = useState(safeInitialUnread);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<
    'all' | 'unread' | NotificationType
  >('all');

  const fetchNotifications = useCallback(
    async (filters: NotificationFilters = {}): Promise<void> => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (filters.type !== undefined && filters.type !== null) {
          params.append('type', filters.type);
        }
        if (filters.read !== undefined) {
          params.append('read', filters.read.toString());
        }
        if (
          filters.limit !== undefined &&
          filters.limit !== null &&
          filters.limit > 0
        ) {
          params.append('limit', filters.limit.toString());
        }
        if (
          filters.offset !== undefined &&
          filters.offset !== null &&
          filters.offset > 0
        ) {
          params.append('offset', filters.offset.toString());
        }

        const response = await fetch(`/api/notifications?${params}`);
        if (!response.ok) throw new Error('Failed to fetch notifications');

        const data = (await response.json()) as NotificationApiResponse;

        if (filters.offset === 0) {
          setNotifications(data.notifications);
        } else {
          setNotifications((prev) => [...prev, ...data.notifications]);
        }

        setUnreadCount(data.unread_count);
        setHasMore(data.has_more);
      } catch (error: unknown) {
        console.error('Error fetching notifications:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const handleMarkAsRead = useCallback(
    async (notificationId?: string): Promise<void> => {
      try {
        const result = await markNotificationsAsRead(
          notificationId !== undefined && notificationId !== null
            ? [notificationId]
            : undefined,
        );
        if (result.success) {
          setNotifications((prev) =>
            prev.map((notification) =>
              notificationId === undefined ||
              notificationId === null ||
              notification.id === notificationId
                ? { ...notification, read_at: new Date().toISOString() }
                : notification,
            ),
          );

          if (notificationId !== undefined && notificationId !== null) {
            setUnreadCount((prev) => Math.max(0, prev - 1));
          } else {
            setUnreadCount(0);
          }
        }
      } catch (error: unknown) {
        console.error('Error marking notifications as read:', error);
      }
    },
    [],
  );

  const handleDelete = useCallback(
    async (notificationId: string): Promise<void> => {
      try {
        const result = await deleteNotifications([notificationId]);
        if (result.success) {
          const notification = notifications.find(
            (n) => n.id === notificationId,
          );
          setNotifications((prev) =>
            prev.filter((n) => n.id !== notificationId),
          );

          if (notification !== undefined && notification.read_at === null) {
            setUnreadCount((prev) => Math.max(0, prev - 1));
          }
        }
      } catch (error: unknown) {
        console.error('Error deleting notification:', error);
      }
    },
    [notifications],
  );

  const handleBulkMarkAsRead = useCallback(async (): Promise<void> => {
    if (selectedIds.size === 0) return;

    try {
      const result = await markNotificationsAsRead(Array.from(selectedIds));
      if (result.success) {
        setNotifications((prev) =>
          prev.map((notification) =>
            selectedIds.has(notification.id)
              ? { ...notification, read_at: new Date().toISOString() }
              : notification,
          ),
        );

        const unreadSelected = notifications.filter(
          (n) => selectedIds.has(n.id) && n.read_at === null,
        ).length;
        setUnreadCount((prev) => Math.max(0, prev - unreadSelected));
        setSelectedIds(new Set());
      }
    } catch (error: unknown) {
      console.error('Error marking notifications as read:', error);
    }
  }, [selectedIds, notifications]);

  const handleBulkDelete = useCallback(async (): Promise<void> => {
    if (selectedIds.size === 0) return;

    try {
      const result = await deleteNotifications(Array.from(selectedIds));
      if (result.success) {
        const unreadSelected = notifications.filter(
          (n) => selectedIds.has(n.id) && n.read_at === null,
        ).length;

        setNotifications((prev) => prev.filter((n) => !selectedIds.has(n.id)));
        setUnreadCount((prev) => Math.max(0, prev - unreadSelected));
        setSelectedIds(new Set());
      }
    } catch (error: unknown) {
      console.error('Error deleting notifications:', error);
    }
  }, [selectedIds, notifications]);

  const handleFilterChange = useCallback(
    (value: string): void => {
      const filter = value as 'all' | 'unread' | NotificationType;
      setActiveFilter(filter);
      const filters: NotificationFilters = { offset: 0, limit: 20 };

      if (filter === 'unread') {
        filters.read = false;
      } else if (filter !== 'all') {
        filters.type = filter;
      }

      void fetchNotifications(filters);
    },
    [fetchNotifications],
  );

  const loadMore = useCallback((): void => {
    if (!isLoading && hasMore) {
      const filters: NotificationFilters = {
        offset: notifications.length,
        limit: 20,
      };

      if (activeFilter === 'unread') {
        filters.read = false;
      } else if (activeFilter !== 'all') {
        filters.type = activeFilter;
      }

      void fetchNotifications(filters);
    }
  }, [
    isLoading,
    hasMore,
    notifications.length,
    activeFilter,
    fetchNotifications,
  ]);

  const handleMarkAllAsRead = useCallback((): void => {
    void handleMarkAsRead();
  }, [handleMarkAsRead]);

  const handleBulkMarkAsReadClick = useCallback((): void => {
    void handleBulkMarkAsRead();
  }, [handleBulkMarkAsRead]);

  const handleBulkDeleteClick = useCallback((): void => {
    void handleBulkDelete();
  }, [handleBulkDelete]);

  const handleMarkAsReadWrapper = useCallback(
    (notificationId?: string): void => {
      void handleMarkAsRead(notificationId);
    },
    [handleMarkAsRead],
  );

  const handleDeleteWrapper = useCallback(
    (notificationId: string): void => {
      void handleDelete(notificationId);
    },
    [handleDelete],
  );

  useEffect((): void => {
    if (safeInitialNotifications.length === 0) {
      void fetchNotifications();
    }
  }, [fetchNotifications, safeInitialNotifications.length]);

  const filteredNotifications = notifications;

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Notifications</h2>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {unreadCount}
            </Badge>
          )}
        </div>

        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkMarkAsReadClick}
              className="gap-1"
            >
              <CheckCheck className="h-3 w-3" />
              Mark Read ({selectedIds.size})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkDeleteClick}
              className="gap-1"
            >
              <Trash2 className="h-3 w-3" />
              Delete ({selectedIds.size})
            </Button>
          </div>
        )}

        {/* Quick Actions */}
        {selectedIds.size === 0 && (
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="gap-1"
              >
                <CheckCheck className="h-3 w-3" />
                Mark All Read
              </Button>
            )}
          </div>
        )}
      </div>
      {/* Filters */}
      <Tabs
        value={activeFilter}
        onValueChange={handleFilterChange}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread">
            Unread {unreadCount > 0 && <span>({unreadCount})</span>}
          </TabsTrigger>
          <TabsTrigger value="follow">Follows</TabsTrigger>
        </TabsList>

        <TabsContent value={activeFilter} className="flex-1 mt-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-2">
              {isLoading && notifications.length === 0 ? (
                // Loading skeleton
                SKELETON_KEYS.map((k) => (
                  <div
                    key={k}
                    className="flex items-start gap-3 p-4 rounded-lg border"
                  >
                    <Skeleton className="w-8 h-8 rounded-full" />
                    <Skeleton className="w-8 h-8 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                      <Skeleton className="h-3 w-1/4" />
                    </div>
                  </div>
                ))
              ) : filteredNotifications.length === 0 ? (
                // Empty state
                <div className="text-center py-12 flex flex-col items-center gap-4">
                  <Bell className="h-12 w-12 mx-auto text-muted-foreground" />
                  <div>
                    <h3 className="text-lg font-medium mb-2">
                      No notifications
                    </h3>
                    <p className="text-muted-foreground">
                      {activeFilter === 'unread'
                        ? "You're all caught up! No unread notifications."
                        : "You don't have any notifications yet."}
                    </p>
                  </div>
                  <Link href="/discover">
                    <Button variant="default">Discover content</Button>
                  </Link>
                </div>
              ) : (
                // Notifications list
                <>
                  {filteredNotifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={handleMarkAsReadWrapper}
                    />
                  ))}
                  {/* Load More */}
                  {hasMore && (
                    <div className="flex justify-center pt-4">
                      <Button
                        variant="outline"
                        onClick={loadMore}
                        disabled={isLoading}
                      >
                        {isLoading ? 'Loading...' : 'Load More'}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
