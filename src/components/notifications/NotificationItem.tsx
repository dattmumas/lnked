'use client';

import { formatDistanceToNow } from 'date-fns';
import { Circle, Star, Users } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

import { cn } from '@/lib/utils';
import { Notification } from '@/types/notifications';

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (notificationId: string) => void;
  className?: string;
}

function getNotificationIcon(type: string): React.ReactElement {
  switch (type) {
    case 'collective_invite':
      return <Users className="h-5 w-5 text-primary" />;
    case 'new_post':
      return <Star className="h-5 w-5 text-yellow-500" />;
    default:
      return <Circle className="h-5 w-5 text-muted-foreground" />;
  }
}

function getNotificationLink(notification: Notification): string {
  const { entity_type, entity_id, metadata } = notification;

  if (
    (entity_type as string) === 'collective_invite' &&
    metadata?.['invite_code']
  ) {
    return `/invite/${metadata['invite_code'] as string}`;
  }
  if ((entity_type as string) === 'post' && entity_id) {
    return `/posts/${entity_id}`;
  }
  return '/dashboard/notifications';
}

export const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onMarkAsRead,
  className,
}) => {
  const { id, title, message, created_at, read_at, type } = notification;
  const isRead = read_at !== null;
  const timeAgo = formatDistanceToNow(new Date(created_at), {
    addSuffix: true,
  });
  const link = getNotificationLink(notification);

  return (
    <Link
      href={link}
      className={cn(
        'block p-3 rounded-lg transition-colors hover:bg-accent/50',
        !isRead && 'bg-accent/20',
        className,
      )}
      onClick={() => onMarkAsRead(id)}
    >
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 mt-1">{getNotificationIcon(type)}</div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{title}</p>
          <p className="text-xs text-muted-foreground">{message}</p>
          <p className="text-xs text-muted-foreground mt-1">{timeAgo}</p>
        </div>
        {!isRead && (
          <div className="flex-shrink-0 mt-1">
            <div className="h-2.5 w-2.5 rounded-full bg-primary" />
          </div>
        )}
      </div>
    </Link>
  );
};
