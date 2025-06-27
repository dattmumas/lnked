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
  metadata: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
  updated_at: string;
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
  metadata?: Record<string, unknown>;
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
  data?: unknown;
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

// Time/Date unit constants
// Using named constants keeps the `no-magic-numbers` rule enabled while remaining self-documenting.

// eslint-disable-next-line no-magic-numbers -- constant definition
const MILLISECONDS_PER_SECOND = 1000 as const;

// eslint-disable-next-line no-magic-numbers -- constant definition
const SECONDS_PER_MINUTE = 60 as const;
// eslint-disable-next-line no-magic-numbers -- constant definition
const MINUTES_PER_HOUR = 60 as const;
// eslint-disable-next-line no-magic-numbers -- constant definition
const HOURS_PER_DAY = 24 as const;
// eslint-disable-next-line no-magic-numbers -- constant definition
const DAYS_PER_WEEK = 7 as const;

const SECONDS_PER_HOUR = SECONDS_PER_MINUTE * MINUTES_PER_HOUR; // 3_600
export const SECONDS_PER_DAY = SECONDS_PER_HOUR * HOURS_PER_DAY; // 86_400
const SECONDS_PER_WEEK = SECONDS_PER_DAY * DAYS_PER_WEEK; // 604_800

// Helper functions
export function getNotificationConfig(type: NotificationType): NotificationDisplayConfig {
  return NOTIFICATION_CONFIGS[type];
}

export function formatNotificationTime(createdAt: string): string {
  const now = new Date();
  const created = new Date(createdAt);
  const diffInSeconds = Math.floor((now.getTime() - created.getTime()) / MILLISECONDS_PER_SECOND);

  if (diffInSeconds < SECONDS_PER_MINUTE) {
    return 'Just now';
  } else if (diffInSeconds < SECONDS_PER_HOUR) {
    const minutes = Math.floor(diffInSeconds / SECONDS_PER_MINUTE);
    return `${minutes}m ago`;
  } else if (diffInSeconds < SECONDS_PER_DAY) {
    const hours = Math.floor(diffInSeconds / SECONDS_PER_HOUR);
    return `${hours}h ago`;
  } else if (diffInSeconds < SECONDS_PER_WEEK) {
    const days = Math.floor(diffInSeconds / SECONDS_PER_DAY);
    return `${days}d ago`;
  } else {
    return created.toLocaleDateString();
  }
}

export function groupNotifications(notifications: Notification[]): Notification[][] {
  const groups: Notification[][] = [];
  const groupableTypes = Object.entries(NOTIFICATION_CONFIGS)
    .filter(([, config]) => config.groupable)
    .map(([type]) => type as NotificationType);

  for (const notification of notifications) {
    if (groupableTypes.includes(notification.type)) {
      // Try to find an existing group for this type and entity
      const existingGroup = groups.find(group => {
        if (group.length === 0) return false;
        const first = group[0]!;
        return (
          first.type === notification.type &&
          first.entity_type === notification.entity_type &&
          first.entity_id === notification.entity_id
        );
      });

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