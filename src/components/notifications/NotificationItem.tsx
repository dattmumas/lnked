'use client';

import { X, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useCallback } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  getNotificationConfig,
  formatNotificationTime,
} from '@/types/notifications';

import type { Notification } from '@/types/notifications';

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead?: (id: string) => void;
  onDelete?: (id: string) => void;
  className?: string;
}

// Constants for magic numbers
const MAX_INITIALS_LENGTH = 2;

export function NotificationItem({
  notification,
  onMarkAsRead,
  onDelete,
  className,
}: NotificationItemProps): React.JSX.Element {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const config = getNotificationConfig(notification.type);
  const isUnread = notification.read_at === null;

  const handleMarkAsRead = useCallback((): void => {
    if (isUnread && onMarkAsRead !== undefined) {
      onMarkAsRead(notification.id);
    }
  }, [isUnread, onMarkAsRead, notification.id]);

  const handleDelete = useCallback((): void => {
    if (onDelete !== undefined) {
      setIsDeleting(true);
      try {
        onDelete(notification.id);
      } catch (error: unknown) {
        console.error('Failed to delete notification:', error);
      } finally {
        setIsDeleting(false);
      }
    }
  }, [onDelete, notification.id]);

  const getNotificationLink = (): string | undefined => {
    if (
      notification.entity_type === undefined ||
      notification.entity_id === undefined
    ) {
      return undefined;
    }

    switch (notification.entity_type) {
      case 'post':
        return `/posts/${notification.entity_id}`;
      case 'user':
        return `/profile/${notification.entity_id}`;
      case 'collective':
        return `/collectives/${notification.entity_id}`;
      case 'comment': {
        // For comments, we need to link to the post with the comment highlighted
        const postId = notification.metadata?.post_id;
        if (typeof postId === 'string') {
          return `/posts/${postId}#comment-${notification.entity_id}`;
        }
        return `/posts/${notification.entity_id}`;
      }
      default:
        return undefined;
    }
  };

  const link = getNotificationLink();

  const handleNotificationClick = useCallback(
    (e: React.MouseEvent): void => {
      // Don't navigate if clicking on action buttons
      const target = e.target as HTMLElement;
      if (target.closest('button') !== null || target.closest('a') !== null) {
        return;
      }

      handleMarkAsRead();

      // Navigate to the link if available
      if (link !== undefined) {
        void router.push(link);
      }
    },
    [handleMarkAsRead, link, router],
  );

  const handleNotificationKeyDown = useCallback(
    (e: React.KeyboardEvent): void => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleMarkAsRead();

        if (link !== undefined) {
          void router.push(link);
        }
      }
    },
    [handleMarkAsRead, link, router],
  );

  const handleDeleteClick = useCallback(
    (e: React.MouseEvent): void => {
      e.stopPropagation();
      handleDelete();
    },
    [handleDelete],
  );

  const handleStopPropagation = useCallback((e: React.MouseEvent): void => {
    e.stopPropagation();
  }, []);

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
      onKeyDown={handleNotificationKeyDown}
      role="button"
      tabIndex={0}
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
      {notification.actor !== null && notification.actor !== undefined && (
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarImage
            src={notification.actor.avatar_url ?? undefined}
            alt={
              notification.actor.full_name ??
              notification.actor.username ??
              'User'
            }
          />
          <AvatarFallback className="text-xs">
            {(
              notification.actor.full_name ??
              notification.actor.username ??
              'U'
            )
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, MAX_INITIALS_LENGTH)}
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
            {link !== undefined && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                asChild
                onClick={handleStopPropagation}
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
              onClick={handleDeleteClick}
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
