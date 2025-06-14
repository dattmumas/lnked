import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { MAX_NOTIFICATION_PREVIEW_LENGTH } from '@/lib/constants/notification';
import type { Json } from '@/lib/database.types';
import type {
  Notification,
  NotificationPreferences,
  NotificationPreferencesUpdate,
  CreateNotificationParams,
  NotificationFilters,
  NotificationResponse,
  NotificationActionResult,
  EntityType,
} from '@/types/notifications';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
/** Default pagination values used in notification queries */
const DEFAULT_LIMIT = 20;
const DEFAULT_OFFSET = 0;

/** Helper to create an ISO timestamp once per operation */
const nowIso = (): string => new Date().toISOString();

export class NotificationService {
  private supabase: ReturnType<typeof createSupabaseBrowserClient> | null = null;

  constructor(isServer = false) {
    if (!isServer && typeof window !== 'undefined') {
      this.supabase = createSupabaseBrowserClient();
    }
  }

 private getSupabase(): ReturnType<typeof createServerSupabaseClient> | ReturnType<typeof createSupabaseBrowserClient> {
    if (this.supabase !== null) {
      return this.supabase;
    }
    return createServerSupabaseClient();
  }

  /**
   * Get notifications for the current user
   */
  async getNotifications(
    filters: NotificationFilters = {}
  ): Promise<NotificationResponse> {
    const supabase = this.getSupabase();
    const { limit = DEFAULT_LIMIT, offset = DEFAULT_OFFSET, type, read } = filters;

    let query = supabase
      .from('notifications')
      .select(`
        *,
        actor:users!notifications_actor_id_fkey(
          id,
          full_name,
          username,
          avatar_url
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (typeof type === 'string' && type !== '') {
      query = query.eq('type', type);
    }

    if (read !== undefined) {
      if (read === true) {
        query = query.not('read_at', 'is', null);
      } else {
        query = query.is('read_at', null);
      }
    }

    const { data: notifications, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch notifications: ${error.message}`);
    }

    // Get unread count
    const { count: unreadCount, error: unreadError } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .is('read_at', null);

    if (unreadError) {
      console.error('Failed to fetch unread count:', unreadError);
    }

    // Transform the data to match our TypeScript interfaces
    const transformedNotifications: Notification[] = (notifications || []).map(notification => ({
      ...notification,
      entity_type: notification.entity_type as EntityType | null,
      metadata: notification.metadata as Record<string, unknown>,
      created_at: notification.created_at || new Date().toISOString(),
      updated_at: notification.updated_at || new Date().toISOString(),
      actor: notification.actor || undefined,
    }));

    return {
      notifications: transformedNotifications,
      total_count: count ?? 0,
      unread_count: unreadCount ?? 0,
      has_more: (count ?? 0) > offset + limit,
    };
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(): Promise<number> {
    const supabase = this.getSupabase();

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .is('read_at', null);

    if (error) {
      console.error('Failed to fetch unread count:', error);
      return 0;
    }

    return count ?? 0;
  }

  /**
   * Mark notifications as read
   */
  async markAsRead(notificationIds?: string[]): Promise<NotificationActionResult> {
    const supabase = this.getSupabase();

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return { success: false, error: 'User not authenticated' };
      }

      const timestamp = nowIso();
      if (Array.isArray(notificationIds) && notificationIds.length > 0) {
        // Mark specific notifications as read
        const { error } = await supabase
          .from('notifications')
          .update({ read_at: timestamp, updated_at: timestamp })
          .in('id', notificationIds)
          .eq('recipient_id', user.id)
          .is('read_at', null);

        if (error) {
          return { success: false, error: error.message };
        }
      } else {
        // Mark all notifications as read
        const { error } = await supabase
          .from('notifications')
          .update({ read_at: timestamp, updated_at: timestamp })
          .eq('recipient_id', user.id)
          .is('read_at', null);

        if (error) {
          return { success: false, error: error.message };
        }
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Delete notifications
   */
  async deleteNotifications(notificationIds: string[]): Promise<NotificationActionResult> {
    const supabase = this.getSupabase();

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return { success: false, error: 'User not authenticated' };
      }

      if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
        return { success: false, error: 'No notifications specified' };
      }

      const { error } = await supabase
        .from('notifications')
        .delete()
        .in('id', notificationIds)
        .eq('recipient_id', user.id);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Create a notification (server-side only)
   */
  async createNotification(params: CreateNotificationParams): Promise<NotificationActionResult> {
    const supabase = this.getSupabase();

    try {
      const { data, error } = await supabase.rpc('create_notification', {
        p_recipient_id: params.recipient_id,
        p_actor_id: params.actor_id || '',
        p_type: params.type,
        p_title: params.title,
        p_message: params.message,
        p_entity_type: params.entity_type || undefined,
        p_entity_id: params.entity_id || undefined,
        p_metadata: (params.metadata as Json) || undefined,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get notification preferences
   */
  async getPreferences(): Promise<NotificationPreferences[]> {
    const supabase = this.getSupabase();

    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .order('notification_type');

    if (error) {
      throw new Error(`Failed to fetch preferences: ${error.message}`);
    }

    // Transform the data to match our TypeScript interfaces
    return (data || []).map(pref => ({
      ...pref,
      email_enabled: pref.email_enabled ?? true,
      push_enabled: pref.push_enabled ?? true,
      in_app_enabled: pref.in_app_enabled ?? true,
      created_at: pref.created_at || new Date().toISOString(),
      updated_at: pref.updated_at || new Date().toISOString(),
    })) as NotificationPreferences[];
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(
    updates: NotificationPreferencesUpdate[]
  ): Promise<NotificationActionResult> {
    const supabase = this.getSupabase();

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return { success: false, error: 'User not authenticated' };
      }

      const updatedAt = nowIso();
      // Update each preference
      for (const update of updates) {
        const { error } = await supabase
          .from('notification_preferences')
          .upsert({
            user_id: user.id,
            notification_type: update.notification_type,
            email_enabled: update.email_enabled ?? true,
            push_enabled: update.push_enabled ?? true,
            in_app_enabled: update.in_app_enabled ?? true,
            updated_at: updatedAt,
          });

        if (error) {
          return { success: false, error: error.message };
        }
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Subscribe to real-time notifications
   */
  subscribeToNotifications(
    userId: string,
    callback: (notification: Notification) => void
  ): (() => void) | null {
    if (this.supabase === null) {
      console.error('Cannot subscribe to notifications on server side');
      return null;
    }

    if (typeof userId !== 'string' || userId.trim() === '') {
      return null;
    }

    const channel = this.supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${userId}`,
        },
        async (payload: { new: Record<string, unknown> }) => {
          // Fetch the full notification with actor data
          const { data: notification } = await this.supabase
            .from('notifications')
            .select(`
              *,
              actor:users!notifications_actor_id_fkey(
                id,
                full_name,
                username,
                avatar_url
              )
            `)
            .eq('id', String(payload.new.id))
            .single();

          if (notification) {
            // Transform the data to match our TypeScript interfaces
            const transformedNotification: Notification = {
              ...notification,
              entity_type: notification.entity_type as EntityType | null,
              metadata: notification.metadata as Record<string, unknown>,
              created_at: notification.created_at || new Date().toISOString(),
              updated_at: notification.updated_at || new Date().toISOString(),
              actor: notification.actor || undefined,
            };
            callback(transformedNotification);
          }
        }
      )
      .subscribe();

    return () => {
      this.supabase?.removeChannel(channel);
    };
  }

  /**
   * Clean up old notifications (server-side only)
   */
  async cleanupOldNotifications(): Promise<NotificationActionResult> {
    const supabase = this.getSupabase();

    try {
      const { data, error } = await supabase.rpc('cleanup_old_notifications');

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: { deleted_count: data } };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Singleton instances
export const notificationService = new NotificationService(false);
export const serverNotificationService = new NotificationService(true);

// Helper functions for common notification creation patterns
export async function createFollowNotification(
  followerId: string,
  followingId: string,
  followingType: 'user' | 'collective'
): Promise<NotificationActionResult> {
  const supabase = await createServerSupabaseClient();

  // Get follower name
  const { data: follower } = await supabase
    .from('users')
    .select('full_name, username')
    .eq('id', followerId)
    .single();

  const actorName = follower?.full_name || follower?.username || 'Someone';

  if (followingType === 'user') {
    return serverNotificationService.createNotification({
      recipient_id: followingId,
      actor_id: followerId,
      type: 'follow',
      title: 'New follower',
      message: `${actorName} started following you`,
      entity_type: 'user',
      entity_id: followingId,
    });
  } else {
    // Get collective owner
    const { data: collective } = await supabase
      .from('collectives')
      .select('owner_id')
      .eq('id', followingId)
      .single();

    if (collective?.owner_id) {
      return serverNotificationService.createNotification({
        recipient_id: collective.owner_id,
        actor_id: followerId,
        type: 'follow',
        title: 'New collective follower',
        message: `${actorName} started following your collective`,
        entity_type: 'collective',
        entity_id: followingId,
      });
    }
  }

  return { success: false, error: 'Invalid following target' };
}

export async function createPostLikeNotification(
  userId: string,
  postId: string
): Promise<NotificationActionResult> {
  const supabase = await createServerSupabaseClient();

  // Get user and post details
  const [{ data: user }, { data: post }] = await Promise.all([
    supabase.from('users').select('full_name, username').eq('id', userId).single(),
    supabase.from('posts').select('author_id, title').eq('id', postId).single(),
  ]);

  if (!user || !post) {
    return { success: false, error: 'User or post not found' };
  }

  const actorName = user.full_name || user.username || 'Someone';
  let message = `${actorName} liked your post`;
  if (post.title) {
    message += `: "${post.title.substring(0, MAX_NOTIFICATION_PREVIEW_LENGTH)}"`;
  }

  return serverNotificationService.createNotification({
    recipient_id: post.author_id,
    actor_id: userId,
    type: 'post_like',
    title: 'Post liked',
    message,
    entity_type: 'post',
    entity_id: postId,
  });
}

export async function createCommentNotification(
  userId: string,
  commentId: string,
  postId: string,
  parentCommentId?: string
): Promise<NotificationActionResult> {
  const supabase = await createServerSupabaseClient();

  // Get user and post details
  const [{ data: user }, { data: post }] = await Promise.all([
    supabase.from('users').select('full_name, username').eq('id', userId).single(),
    supabase.from('posts').select('author_id, title').eq('id', postId).single(),
  ]);

  if (!user || !post) {
    return { success: false, error: 'User or post not found' };
  }

  const actorName = user.full_name || user.username || 'Someone';

  // If this is a reply, notify the parent comment author
  if (parentCommentId) {
    const { data: parentComment } = await supabase
      .from('comments')
      .select('user_id')
      .eq('id', parentCommentId)
      .single();

    if (parentComment && parentComment.user_id !== userId) {
      await serverNotificationService.createNotification({
        recipient_id: parentComment.user_id,
        actor_id: userId,
        type: 'comment_reply',
        title: 'Comment reply',
        message: `${actorName} replied to your comment`,
        entity_type: 'comment',
        entity_id: commentId,
      });
    }
  }

  // Notify the post author (if different from comment author and parent comment author)
  if (post.author_id !== userId) {
    let message = `${actorName} commented on your post`;
    if (post.title) {
      message += `: "${post.title.substring(0, MAX_NOTIFICATION_PREVIEW_LENGTH)}"`;
    }

    return serverNotificationService.createNotification({
      recipient_id: post.author_id,
      actor_id: userId,
      type: 'post_comment',
      title: 'New comment',
      message,
      entity_type: 'comment',
      entity_id: commentId,
    });
  }

  return { success: true };
} 