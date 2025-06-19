'use client';

import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

import type {
  Notification,
  NotificationPreferences,
  NotificationPreferencesUpdate,
  NotificationFilters,
  NotificationResponse,
  NotificationActionResult,
  EntityType,
} from '@/types/notifications';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
/** Cache lifetime for identical notification requests (milliseconds) */
const REQUEST_CACHE_TTL_MS = 1_000;

/** Default pagination values for notification queries */
const DEFAULT_LIMIT = 20;
const DEFAULT_OFFSET = 0;

export class ClientNotificationService {
  private supabase = createSupabaseBrowserClient();
  private requestCache = new Map<string, Promise<NotificationResponse>>();

  private clearCache(): void {
    this.requestCache.clear();
  }

  /**
   * Get notifications for the current user
   */
  getNotifications(
    filters: NotificationFilters = {},
  ): Promise<NotificationResponse> {
    const { limit = DEFAULT_LIMIT, offset = DEFAULT_OFFSET, type, read } = filters;

    // Create cache key based on filters
    const cacheKey = JSON.stringify({ limit, offset, type, read });
    
    // Check if we have a cached request in progress
    const cached = this.requestCache.get(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    // Create the request promise
    const requestPromise = this.performGetNotifications(filters);
    
    // Cache the promise
    this.requestCache.set(cacheKey, requestPromise);
    
    // Clear cache after timeout
    setTimeout(() => {
      this.requestCache.delete(cacheKey);
    }, REQUEST_CACHE_TTL_MS);

    return requestPromise;
  }

  private async performGetNotifications(
    filters: NotificationFilters = {},
  ): Promise<NotificationResponse> {
    const { limit = DEFAULT_LIMIT, offset = DEFAULT_OFFSET, type, read } = filters;

    // Check if user is authenticated first
    const { data: { user }, error: authError } = await this.supabase.auth.getUser();
    if ((authError !== null && authError !== undefined) || user === null) {
      console.error('User not authenticated:', authError);
      return {
        notifications: [],
        total_count: 0,
        unread_count: 0,
        has_more: false,
      };
    }

    let query = this.supabase
      .from('notifications')
      .select(`
        *,
        actor:users!notifications_actor_id_fkey(
          id,
          full_name,
          username,
          avatar_url
        )
      `, { count: 'exact' })
      .eq('recipient_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (type) {
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

    if (error !== null && error !== undefined) {
      console.error('Failed to fetch notifications:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw new Error(`Failed to fetch notifications: ${error.message || 'Unknown error'}`);
    }

    // Get unread count
    const { count: unreadCount, error: unreadError } = await this.supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', user.id)
      .is('read_at', null);

    if (unreadError !== null && unreadError !== undefined) {
      console.error('Failed to fetch unread count:', {
        message: unreadError.message,
        details: unreadError.details,
        hint: unreadError.hint,
        code: unreadError.code,
        fullError: JSON.stringify(unreadError)
      });
      console.error('User ID used in query:', user.id);
    }

    return {
      notifications: (notifications ?? []) as Notification[],
      total_count: count ?? 0,
      unread_count: unreadCount ?? 0,
      has_more: (count ?? 0) > offset + limit,
    };
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(): Promise<number> {
    const { count, error } = await this.supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .is('read_at', null);

    if (error !== null && error !== undefined) {
      console.error('Failed to fetch unread count:', error);
      return 0;
    }

    return count ?? 0;
  }

  /**
   * Mark notifications as read
   */
  async markAsRead(notificationIds?: string[]): Promise<NotificationActionResult> {
    try {
      const {
        data: { user },
        error: authError,
      } = await this.supabase.auth.getUser();

      if ((authError !== null && authError !== undefined) || user === null) {
        return { success: false, error: 'User not authenticated' };
      }

      const timestamp = new Date().toISOString();

      if (notificationIds !== undefined && notificationIds.length > 0) {
        // Mark specific notifications as read
        const { error } = await this.supabase
          .from('notifications')
          .update({ read_at: timestamp, updated_at: timestamp })
          .in('id', notificationIds)
          .eq('recipient_id', user.id)
          .is('read_at', null);

        if (error !== null && error !== undefined) {
          return { success: false, error: error.message };
        }
      } else {
        // Mark all notifications as read
        const { error } = await this.supabase
          .from('notifications')
          .update({ read_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq('recipient_id', user.id)
          .is('read_at', null);

        if (error !== null && error !== undefined) {
          return { success: false, error: error.message };
        }
      }

      // Clear cache after successful operation
      this.clearCache();
      return { success: true };
    } catch (error: unknown) {
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
    try {
      const {
        data: { user },
        error: authError,
      } = await this.supabase.auth.getUser();

      if ((authError !== null && authError !== undefined) || user === null) {
        return { success: false, error: 'User not authenticated' };
      }

      const { error } = await this.supabase
        .from('notifications')
        .delete()
        .in('id', notificationIds)
        .eq('recipient_id', user.id);

      if (error !== null && error !== undefined) {
        return { success: false, error: error.message };
      }

      // Clear cache after successful operation
      this.clearCache();
      return { success: true };
    } catch (error: unknown) {
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
    const { data, error } = await this.supabase
      .from('notification_preferences')
      .select('*')
      .order('notification_type');

    if (error !== null && error !== undefined) {
      throw new Error(`Failed to fetch preferences: ${error.message}`);
    }

    return (data ?? []) as NotificationPreferences[];
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(
    updates: NotificationPreferencesUpdate[]
  ): Promise<NotificationActionResult> {
    try {
      const {
        data: { user },
        error: authError,
      } = await this.supabase.auth.getUser();

      if ((authError !== null && authError !== undefined) || user === null) {
        return { success: false, error: 'User not authenticated' };
      }

      // Update each preference
      for (const update of updates) {
        const { error: dbError } = await this.supabase
          .from('notification_preferences')
          .upsert({
            user_id: user.id,
            notification_type: update.notification_type,
            email_enabled: update.email_enabled ?? true,
            push_enabled: update.push_enabled ?? true,
            in_app_enabled: update.in_app_enabled ?? true,
            updated_at: new Date().toISOString(),
          });

        if (dbError !== null && dbError !== undefined) {
          return { success: false, error: dbError.message };
        }
      }

      return { success: true };
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Unknown error';
      return {
        success: false,
        error: errorMessage,
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
        (payload: { new: Record<string, unknown> }) => {
          void (async () => {
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

            if (notification !== null && notification !== undefined) {
              callback({
                ...notification,
                entity_type: notification.entity_type as EntityType | null,
              } as Notification);
            }
          })();
        }
      )
      .subscribe();

    return () => {
      void this.supabase.removeChannel(channel);
    };
  }
}

// Singleton instance for client-side use
export const clientNotificationService = new ClientNotificationService();