'use client';

import { Bell, CheckCheck, ExternalLink, Settings } from 'lucide-react';
import Link from 'next/link';
import React, { useCallback, useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Icon } from '@/components/ui/icon';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications } from '@/lib/hooks/useNotifications';
import { cn } from '@/lib/utils';
import { Notification } from '@/types/notifications';

import { NotificationItem } from './NotificationItem';

interface NotificationDropdownClientProps {
  initialNotifications: Notification[];
  initialUnreadCount: number;
  userId: string;
  className?: string;
}

// Constants for magic numbers
const MARK_AS_READ_DELAY = 500;
const MAX_RECENT_NOTIFICATIONS = 5;
const MAX_UNREAD_COUNT_DISPLAY = 99;

export function NotificationDropdownClient({
  initialNotifications,
  initialUnreadCount,
  userId,
  className,
}: NotificationDropdownClientProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, isLoading, markAllAsRead, markAsRead } =
    useNotifications(userId, {
      initialData: {
        notifications: initialNotifications,
        unreadCount: initialUnreadCount,
      },
      realtime: true,
    });

  // Mark all as read when dropdown opens with a delay
  useEffect(() => {
    if (isOpen && unreadCount > 0) {
      const timer = setTimeout(() => {
        markAllAsRead();
      }, MARK_AS_READ_DELAY);
      return () => clearTimeout(timer);
    }
  }, [isOpen, unreadCount, markAllAsRead]);

  const handleMarkAsRead = useCallback(
    (notificationId: string) => {
      const notification = notifications.find((n) => n.id === notificationId);
      if (notification && !notification.read_at) {
        markAsRead([notificationId]);
      }
    },
    [notifications, markAsRead],
  );

  const recentNotifications = notifications.slice(0, MAX_RECENT_NOTIFICATIONS);

  const getNotificationIcon = (type: string): React.ReactNode => {
    switch (type) {
      case 'follow':
        return <Icon icon={Bell} className="h-4 w-4 text-blue-500" />;
      case 'post_like':
        return <Icon icon={Bell} className="h-4 w-4 text-red-500" />;
      default:
        return <Icon icon={Bell} className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn('relative h-9 w-9 p-0', className)}
        >
          <Icon icon={Bell} />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] font-medium"
            >
              {unreadCount > MAX_UNREAD_COUNT_DISPLAY ? '99+' : unreadCount}
            </Badge>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 shadow-lg p-0">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-base">Notifications</h3>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {unreadCount} new
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-auto p-1.5"
                onClick={markAllAsRead}
              >
                <Icon icon={CheckCheck} className="mr-1" />
                Mark all read
              </Button>
            )}
            <Button variant="ghost" size="sm" className="h-auto p-1.5" asChild>
              <Link href="/settings">
                <Icon icon={Settings} />
                <span className="sr-only">Notification settings</span>
              </Link>
            </Button>
          </div>
        </div>

        <div className="max-h-96">
          {isLoading && recentNotifications.length === 0 ? (
            <div className="p-4 space-y-3">
              {/* Skeleton Loader */}
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3 animate-pulse">
                  <div className="w-8 h-8 bg-muted rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentNotifications.length === 0 ? (
            <div className="p-8 text-center">
              <Icon
                icon={Bell}
                size="xl"
                className="mx-auto mb-3 text-muted-foreground"
              />
              <h4 className="font-medium mb-1">No new notifications</h4>
              <p className="text-sm text-muted-foreground">
                You're all caught up!
              </p>
            </div>
          ) : (
            <ScrollArea className="max-h-80">
              <div className="p-2 space-y-1">
                {recentNotifications.map((notification) => (
                  <DropdownMenuItem
                    key={notification.id}
                    className="p-0 cursor-pointer focus:bg-accent"
                    asChild
                  >
                    <NotificationItem
                      notification={notification}
                      onMarkAsRead={handleMarkAsRead}
                    />
                  </DropdownMenuItem>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        <div className="border-t p-3">
          <Button
            variant="ghost"
            className="w-full justify-center gap-2 text-sm"
            asChild
          >
            <Link href="/dashboard/notifications">
              View all notifications
              <Icon icon={ExternalLink} />
            </Link>
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
