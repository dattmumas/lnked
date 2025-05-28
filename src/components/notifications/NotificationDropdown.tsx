'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Bell, CheckCheck, Settings, ExternalLink } from 'lucide-react';
import { NotificationItem } from './NotificationItem';
import { useNotifications } from '@/lib/hooks/useNotifications';
import { cn } from '@/lib/utils';

interface NotificationDropdownProps {
  userId?: string;
  className?: string;
}

export function NotificationDropdown({
  userId,
  className,
}: NotificationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasMarkedAsRead, setHasMarkedAsRead] = useState(false);

  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    deleteNotifications,
  } = useNotifications(userId, {
    autoFetch: true,
    realtime: true,
    filters: {
      limit: 10,
      read: false, // Only fetch unread notifications
    },
  });

  // Mark all notifications as read when dropdown opens
  useEffect(() => {
    if (isOpen && notifications.length > 0 && !hasMarkedAsRead) {
      const unreadNotificationIds = notifications
        .filter((n) => !n.read_at)
        .map((n) => n.id);

      if (unreadNotificationIds.length > 0) {
        setHasMarkedAsRead(true);
        // Use a timeout to prevent immediate re-fetching
        const timeoutId = setTimeout(() => {
          markAsRead(unreadNotificationIds);
        }, 500); // Increased timeout to prevent rapid requests

        return () => clearTimeout(timeoutId);
      }
    }
  }, [isOpen, notifications, hasMarkedAsRead, markAsRead]);

  // Reset the flag when dropdown closes
  useEffect(() => {
    if (!isOpen) {
      setHasMarkedAsRead(false);
    }
  }, [isOpen]);

  const handleMarkAllAsRead = async () => {
    if (unreadCount > 0) {
      await markAsRead();
    }
  };

  const handleNotificationAction = async (
    notificationId: string,
    action: 'read' | 'delete',
  ) => {
    if (action === 'read') {
      await markAsRead([notificationId]);
    } else {
      await deleteNotifications([notificationId]);
    }
  };

  const recentNotifications = notifications.slice(0, 5);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn('relative h-9 w-9 p-0', className)}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] font-medium"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-96 shadow-lg p-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-base">Notifications</h3>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {unreadCount}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-auto p-1.5 hover:bg-accent"
                onClick={handleMarkAllAsRead}
              >
                <CheckCheck className="h-3 w-3 mr-1" />
                Mark all read
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-1.5 hover:bg-accent"
              asChild
            >
              <Link href="/dashboard/notifications">
                <Settings className="h-3 w-3" />
                <span className="sr-only">Notification settings</span>
              </Link>
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="max-h-96">
          {isLoading && notifications.length === 0 ? (
            // Loading state
            <div className="p-4 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3 animate-pulse">
                  <div className="w-8 h-8 bg-muted rounded-full" />
                  <div className="w-8 h-8 bg-muted rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentNotifications.length === 0 ? (
            // Empty state
            <div className="p-8 text-center">
              <Bell className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
              <h4 className="font-medium mb-1">No new notifications</h4>
              <p className="text-sm text-muted-foreground">
                You&apos;re all caught up! Check back later for updates.
              </p>
            </div>
          ) : (
            // Notifications list
            <ScrollArea className="max-h-80">
              <div className="p-2 space-y-1">
                {recentNotifications.map((notification) => (
                  <DropdownMenuItem
                    key={notification.id}
                    className="p-0 cursor-pointer focus:bg-accent"
                    asChild
                  >
                    <div className="w-full">
                      <NotificationItem
                        notification={notification}
                        onMarkAsRead={(id) =>
                          handleNotificationAction(id, 'read')
                        }
                        onDelete={(id) =>
                          handleNotificationAction(id, 'delete')
                        }
                        className="border-0 rounded-md hover:bg-accent/50"
                      />
                    </div>
                  </DropdownMenuItem>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Footer - Always show link to all notifications */}
        <div className="border-t p-3">
          <Button
            variant="ghost"
            className="w-full justify-center gap-2 text-sm"
            asChild
          >
            <Link href="/dashboard/notifications">
              View all notifications
              <ExternalLink className="h-3 w-3" />
            </Link>
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
