'use client';

import { Bell, CheckCheck, Trash2 } from 'lucide-react';
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


const EMPTY_NOTIFICATIONS: Notification[] = [];

interface NotificationListProps {
  initialNotifications?: Notification[];
  initialUnreadCount?: number;
  className?: string;
}

export function NotificationList({
  initialNotifications,
  initialUnreadCount,
  className,
}: NotificationListProps) {
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
    async (filters: NotificationFilters = {}) => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (filters.type) params.append('type', filters.type);
        if (filters.read !== undefined)
          params.append('read', filters.read.toString());
        if (filters.limit) params.append('limit', filters.limit.toString());
        if (filters.offset) params.append('offset', filters.offset.toString());

        const response = await fetch(`/api/notifications?${params}`);
        if (!response.ok) throw new Error('Failed to fetch notifications');

        const data = await response.json();

        if (filters.offset === 0) {
          setNotifications(data.notifications);
        } else {
          setNotifications((prev) => [...prev, ...data.notifications]);
        }

        setUnreadCount(data.unread_count);
        setHasMore(data.has_more);
      } catch (error) {
        console.error('Error fetching notifications:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const handleMarkAsRead = async (notificationId?: string) => {
    try {
      const result = await markNotificationsAsRead(
        notificationId ? [notificationId] : undefined,
      );
      if (result.success) {
        setNotifications((prev) =>
          prev.map((notification) =>
            !notificationId || notification.id === notificationId
              ? { ...notification, read_at: new Date().toISOString() }
              : notification,
          ),
        );

        if (notificationId) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        } else {
          setUnreadCount(0);
        }
      }
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const handleDelete = async (notificationId: string) => {
    try {
      const result = await deleteNotifications([notificationId]);
      if (result.success) {
        const notification = notifications.find((n) => n.id === notificationId);
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));

        if (notification && !notification.read_at) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleBulkMarkAsRead = async () => {
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
          (n) => selectedIds.has(n.id) && !n.read_at,
        ).length;
        setUnreadCount((prev) => Math.max(0, prev - unreadSelected));
        setSelectedIds(new Set());
      }
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    try {
      const result = await deleteNotifications(Array.from(selectedIds));
      if (result.success) {
        const unreadSelected = notifications.filter(
          (n) => selectedIds.has(n.id) && !n.read_at,
        ).length;

        setNotifications((prev) => prev.filter((n) => !selectedIds.has(n.id)));
        setUnreadCount((prev) => Math.max(0, prev - unreadSelected));
        setSelectedIds(new Set());
      }
    } catch (error) {
      console.error('Error deleting notifications:', error);
    }
  };

  const handleFilterChange = (value: string) => {
    const filter = value as 'all' | 'unread' | NotificationType;
    setActiveFilter(filter);
    const filters: NotificationFilters = { offset: 0, limit: 20 };

    if (filter === 'unread') {
      filters.read = false;
    } else if (filter !== 'all') {
      filters.type = filter;
    }

    fetchNotifications(filters);
  };

  const loadMore = () => {
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

      fetchNotifications(filters);
    }
  };

  useEffect(() => {
    if (safeInitialNotifications.length === 0) {
      fetchNotifications();
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
              onClick={handleBulkMarkAsRead}
              className="gap-1"
            >
              <CheckCheck className="h-3 w-3" />
              Mark Read ({selectedIds.size})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkDelete}
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
                onClick={() => handleMarkAsRead()}
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
                Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
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
                <div className="text-center py-12">
                  <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No notifications</h3>
                  <p className="text-muted-foreground">
                    {activeFilter === 'unread'
                      ? "You're all caught up! No unread notifications."
                      : "You don't have any notifications yet."}
                  </p>
                </div>
              ) : (
                // Notifications list
                <>
                  {filteredNotifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={handleMarkAsRead}
                      onDelete={handleDelete}
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
