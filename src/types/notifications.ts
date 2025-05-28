export type NotificationType =
  | 'follow'
  | 'unfollow'
  | 'post_like'
  | 'post_comment'
  | 'comment_reply'
  | 'comment_like'
  | 'post_published'
  | 'collective_invite'
  | 'collective_join'
  | 'collective_leave'
  | 'subscription_created'
  | 'subscription_cancelled'
  | 'mention'
  | 'post_bookmark'
  | 'featured_post';

export type EntityType = 'post' | 'comment' | 'user' | 'collective' | 'subscription';

export interface Notification {
  id: string;
  recipient_id: string;
  actor_id: string | null;
  type: NotificationType;
  title: string;
  message: string;
  entity_type: EntityType | null;
  entity_id: string | null;
  metadata: Record<string, any>;
  read_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  actor?: {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
}

export interface NotificationPreferences {
  id: string;
  user_id: string;
  notification_type: NotificationType;
  email_enabled: boolean;
  push_enabled: boolean;
  in_app_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationPreferencesUpdate {
  notification_type: NotificationType;
  email_enabled?: boolean;
  push_enabled?: boolean;
  in_app_enabled?: boolean;
}

export interface CreateNotificationParams {
  recipient_id: string;
  actor_id: string | null;
  type: NotificationType;
  title: string;
  message: string;
  entity_type?: EntityType;
  entity_id?: string;
  metadata?: Record<string, any>;
}

export interface NotificationFilters {
  type?: NotificationType;
  read?: boolean;
  limit?: number;
  offset?: number;
}

export interface NotificationResponse {
  notifications: Notification[];
  total_count: number;
  unread_count: number;
  has_more: boolean;
}

export interface NotificationActionResult {
  success: boolean;
  error?: string;
  data?: any;
}

// Notification display configuration
export interface NotificationDisplayConfig {
  icon: string;
  color: string;
  priority: 'low' | 'medium' | 'high';
  groupable: boolean;
}

export const NOTIFICATION_CONFIGS: Record<NotificationType, NotificationDisplayConfig> = {
  follow: {
    icon: '👤',
    color: 'bg-blue-500',
    priority: 'medium',
    groupable: true,
  },
  unfollow: {
    icon: '👤',
    color: 'bg-gray-500',
    priority: 'low',
    groupable: true,
  },
  post_like: {
    icon: '❤️',
    color: 'bg-red-500',
    priority: 'low',
    groupable: true,
  },
  post_comment: {
    icon: '💬',
    color: 'bg-green-500',
    priority: 'medium',
    groupable: false,
  },
  comment_reply: {
    icon: '↩️',
    color: 'bg-purple-500',
    priority: 'high',
    groupable: false,
  },
  comment_like: {
    icon: '❤️',
    color: 'bg-pink-500',
    priority: 'low',
    groupable: true,
  },
  post_published: {
    icon: '📝',
    color: 'bg-indigo-500',
    priority: 'medium',
    groupable: false,
  },
  collective_invite: {
    icon: '📨',
    color: 'bg-yellow-500',
    priority: 'high',
    groupable: false,
  },
  collective_join: {
    icon: '🎉',
    color: 'bg-green-600',
    priority: 'medium',
    groupable: true,
  },
  collective_leave: {
    icon: '👋',
    color: 'bg-orange-500',
    priority: 'low',
    groupable: true,
  },
  subscription_created: {
    icon: '💳',
    color: 'bg-emerald-500',
    priority: 'high',
    groupable: false,
  },
  subscription_cancelled: {
    icon: '❌',
    color: 'bg-red-600',
    priority: 'medium',
    groupable: false,
  },
  mention: {
    icon: '@',
    color: 'bg-blue-600',
    priority: 'high',
    groupable: false,
  },
  post_bookmark: {
    icon: '🔖',
    color: 'bg-amber-500',
    priority: 'low',
    groupable: true,
  },
  featured_post: {
    icon: '⭐',
    color: 'bg-yellow-600',
    priority: 'medium',
    groupable: false,
  },
};

// Helper functions
export function getNotificationConfig(type: NotificationType): NotificationDisplayConfig {
  return NOTIFICATION_CONFIGS[type];
}

export function formatNotificationTime(createdAt: string): string {
  const now = new Date();
  const created = new Date(createdAt);
  const diffInSeconds = Math.floor((now.getTime() - created.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'Just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes}m ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}h ago`;
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days}d ago`;
  } else {
    return created.toLocaleDateString();
  }
}

export function groupNotifications(notifications: Notification[]): Notification[][] {
  const groups: Notification[][] = [];
  const groupableTypes = Object.entries(NOTIFICATION_CONFIGS)
    .filter(([_, config]) => config.groupable)
    .map(([type]) => type as NotificationType);

  for (const notification of notifications) {
    if (groupableTypes.includes(notification.type)) {
      // Try to find an existing group for this type and entity
      const existingGroup = groups.find(group => 
        group.length > 0 &&
        group[0].type === notification.type &&
        group[0].entity_type === notification.entity_type &&
        group[0].entity_id === notification.entity_id
      );

      if (existingGroup) {
        existingGroup.push(notification);
      } else {
        groups.push([notification]);
      }
    } else {
      groups.push([notification]);
    }
  }

  return groups;
} 