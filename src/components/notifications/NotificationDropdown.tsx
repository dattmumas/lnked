'use client';

import React from 'react';

import { useUser } from '@/hooks/useUser';
import { useNotifications } from '@/lib/hooks/useNotifications';

import { NotificationDropdownClient } from './NotificationDropdownClient';

export function NotificationDropdown(): React.ReactElement | null {
  const { user } = useUser();
  const { notifications, unreadCount } = useNotifications();

  if (!user) {
    return null;
  }

  return (
    <NotificationDropdownClient
      initialNotifications={notifications ?? []}
      initialUnreadCount={unreadCount}
      userId={user.id}
    />
  );
}
