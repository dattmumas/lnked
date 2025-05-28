'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Notification } from '@/types/notifications';
import {
  getNotificationConfig,
  formatNotificationTime,
} from '@/types/notifications';

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead?: (id: string) => void;
  onDelete?: (id: string) => void;
  className?: string;
}

export function NotificationItem({
  notification,
  onMarkAsRead,
  onDelete,
  className,
}: NotificationItemProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const config = getNotificationConfig(notification.type);
  const isUnread = !notification.read_at;

  const handleMarkAsRead = () => {
    if (isUnread && onMarkAsRead) {
      onMarkAsRead(notification.id);
    }
  };

  const handleDelete = async () => {
    if (onDelete) {
      setIsDeleting(true);
      try {
        await onDelete(notification.id);
      } catch (error) {
        console.error('Failed to delete notification:', error);
        setIsDeleting(false);
      }
    }
  };

  const getNotificationLink = (): string | null => {
    if (!notification.entity_type || !notification.entity_id) {
      return null;
    }

    switch (notification.entity_type) {
      case 'post':
        return `/posts/${notification.entity_id}`;
      case 'user':
        return `/profile/${notification.entity_id}`;
      case 'collective':
        return `/collectives/${notification.entity_id}`;
      case 'comment':
        // For comments, we need to link to the post with the comment highlighted
        return `/posts/${notification.metadata?.post_id || notification.entity_id}#comment-${notification.entity_id}`;
      default:
        return null;
    }
  };

  const link = getNotificationLink();

  const handleNotificationClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on action buttons
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a')) {
      return;
    }

    handleMarkAsRead();

    // Navigate to the link if available
    if (link) {
      router.push(link);
    }
  };

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 rounded-lg border transition-all duration-200',
        isUnread
          ? 'bg-accent/50 border-accent hover:bg-accent/70'
          : 'bg-background hover:bg-accent/30',
        'group cursor-pointer',
        className,
      )}
      onClick={handleNotificationClick}
    >
      {/* Notification Icon */}
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-sm',
          config.color,
        )}
      >
        {config.icon}
      </div>

      {/* Actor Avatar */}
      {notification.actor && (
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarImage
            src={notification.actor.avatar_url || undefined}
            alt={
              notification.actor.full_name ||
              notification.actor.username ||
              'User'
            }
          />
          <AvatarFallback className="text-xs">
            {(
              notification.actor.full_name ||
              notification.actor.username ||
              'U'
            )
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2)}
          </AvatarFallback>
        </Avatar>
      )}

      {/* Notification Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4
              className={cn(
                'text-sm font-medium truncate',
                isUnread && 'font-semibold',
              )}
            >
              {notification.title}
            </h4>
            <p
              className="text-sm text-muted-foreground mt-1 line-clamp-2"
              suppressHydrationWarning
            >
              {notification.message}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {link && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                asChild
                onClick={(e) => e.stopPropagation()}
              >
                <Link href={link}>
                  <ExternalLink className="h-3 w-3" />
                  <span className="sr-only">View</span>
                </Link>
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
              disabled={isDeleting}
            >
              <X className="h-3 w-3" />
              <span className="sr-only">Delete</span>
            </Button>
          </div>
        </div>

        {/* Metadata */}
        <div className="flex items-center gap-2 mt-2">
          <span
            className="text-xs text-muted-foreground"
            suppressHydrationWarning
          >
            {formatNotificationTime(notification.created_at)}
          </span>
          {isUnread && (
            <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
              New
            </Badge>
          )}
          {config.priority === 'high' && (
            <Badge variant="destructive" className="text-xs px-1.5 py-0.5">
              Important
            </Badge>
          )}
        </div>
      </div>

      {/* Unread Indicator */}
      {isUnread && (
        <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-2" />
      )}
    </div>
  );
}
