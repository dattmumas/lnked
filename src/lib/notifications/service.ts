import { nowIso, isDefined, isNonEmptyString } from '@/lib/notifications/utils';
import supabaseBrowser from '@/lib/supabase/browser';
import { createServerSupabaseClient } from '@/lib/supabase/server';

import type { Database, Json } from '@/lib/database.types';
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
import type { SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_LIMIT = 20;
const DEFAULT_OFFSET = 0;

// ---------------------------------------------------------------------------
// Supabase helpers
// ---------------------------------------------------------------------------

function createScopedClient(): Promise<SupabaseClient<Database>> {
  if (typeof window === 'undefined') {
    return createServerSupabaseClient();
  }
  return Promise.resolve(supabaseBrowser);
}

// ---------------------------------------------------------------------------
// NotificationService
// ---------------------------------------------------------------------------

export class NotificationService {
  private readonly clientPromise: Promise<SupabaseClient<Database>>;

  constructor() {
    this.clientPromise = createScopedClient();
  }

  private client(): Promise<SupabaseClient<Database>> {
    return this.clientPromise;
  }

  // ---------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------

  /** Fetch notifications for current user with filters & pagination */
  async getNotifications(
    filters: NotificationFilters = {},
  ): Promise<NotificationResponse> {
    const {
      limit = DEFAULT_LIMIT,
      offset = DEFAULT_OFFSET,
      type,
      read,
    } = filters;

    const supabase = await this.client();

    let query = supabase
      .from('notifications')
      .select(`*`, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (isNonEmptyString(type)) {
      query = query.eq('type', type);
    }

    if (read !== undefined) {
      query = read
        ? query.not('read_at', 'is', null)
        : query.is('read_at', null);
    }

    const { data, error, count } = await query;

    if (isDefined(error)) {
      throw new Error(`Failed to fetch notifications: ${error.message}`);
    }

    const unreadCount = await this.getUnreadCount();

    const transformed: Notification[] = (data ?? []).map((n) => {
      const { created_at, updated_at, entity_type, metadata, ...rest } = n;
      return {
        ...rest,
        created_at: created_at ?? nowIso(),
        updated_at: updated_at ?? nowIso(),
        entity_type: (entity_type ?? null) as EntityType | null,
        metadata: (metadata as Record<string, Json>) ?? {},
      } as Notification;
    });

    return {
      notifications: transformed,
      total_count: count ?? 0,
      unread_count: unreadCount,
      has_more: (count ?? 0) > offset + limit,
    };
  }

  /** Count unread notifications for current user */
  async getUnreadCount(): Promise<number> {
    const supabase = await this.client();
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .is('read_at', null);

    if (isDefined(error)) {
      console.error('Failed to fetch unread count:', error);
      return 0;
    }

    return count ?? 0;
  }

  /** Mark specific notifications (or all) as read */
  async markAsRead(ids?: string[]): Promise<NotificationActionResult> {
    const supabase = await this.client();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (isDefined(authErr) || user === null) {
      return { success: false, error: 'User not authenticated' };
    }

    const timestamp = nowIso();
    let builder = supabase
      .from('notifications')
      .update({ read_at: timestamp, updated_at: timestamp })
      .eq('recipient_id', user.id)
      .is('read_at', null);

    if (Array.isArray(ids) && ids.length > 0) {
      builder = builder.in('id', ids);
    }

    const { error } = await builder;

    if (isDefined(error)) {
      return { success: false, error: error.message };
    }

    return { success: true };
  }

  /** Delete notifications by id */
  async deleteNotifications(ids: string[]): Promise<NotificationActionResult> {
    if (!Array.isArray(ids) || ids.length === 0) {
      return { success: false, error: 'No notifications specified' };
    }

    const supabase = await this.client();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (isDefined(authErr) || user === null) {
      return { success: false, error: 'User not authenticated' };
    }

    const { error } = await supabase
      .from('notifications')
      .delete()
      .in('id', ids)
      .eq('recipient_id', user.id);

    if (isDefined(error)) {
      return { success: false, error: error.message };
    }
    return { success: true };
  }

  /** Create a notification via RPC */
  async createNotification(
    params: CreateNotificationParams,
  ): Promise<NotificationActionResult> {
    const supabase = await this.client();
    const { error } = await supabase.rpc('create_notification', {
      p_recipient_id: params.recipient_id,
      ...(params.actor_id !== null
        ? { p_actor_id: params.actor_id }
        : { p_actor_id: '' }),
      p_type: params.type,
      p_title: params.title,
      p_message: params.message,
      ...(params.entity_type ? { p_entity_type: params.entity_type } : {}),
      ...(params.entity_id ? { p_entity_id: params.entity_id } : {}),
      ...(params.metadata ? { p_metadata: params.metadata as Json } : {}),
    });

    if (isDefined(error)) {
      return { success: false, error: error.message };
    }
    return { success: true };
  }

  /** Fetch current user notification preferences */
  async getPreferences(): Promise<NotificationPreferences[]> {
    const supabase = await this.client();
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .order('notification_type');

    if (isDefined(error)) {
      throw new Error(`Failed to fetch preferences: ${error.message}`);
    }

    return (data ?? []) as NotificationPreferences[];
  }

  /** Update notification preferences */
  async updatePreferences(
    updates: NotificationPreferencesUpdate[],
  ): Promise<NotificationActionResult> {
    if (updates.length === 0) {
      return { success: true };
    }

    const supabase = await this.client();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (isDefined(authErr) || user === null) {
      return { success: false, error: 'User not authenticated' };
    }

    const updatedAt = nowIso();

    for (const pref of updates) {
      const { error } = await supabase.from('notification_preferences').upsert({
        user_id: user.id,
        notification_type: pref.notification_type,
        email_enabled: pref.email_enabled ?? true,
        push_enabled: pref.push_enabled ?? true,
        in_app_enabled: pref.in_app_enabled ?? true,
        updated_at: updatedAt,
      });

      if (isDefined(error)) {
        return { success: false, error: error.message };
      }
    }

    return { success: true };
  }

  /** Subscribe to realtime notification inserts for a user (browser-only) */
  subscribeToNotifications(
    userId: string,
    handler: (notification: Notification) => void,
  ): (() => void) | null {
    if (typeof window === 'undefined' || !isNonEmptyString(userId)) {
      return null;
    }

    const supabase = supabaseBrowser;
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${userId}`,
        },
        async (payload) => {
          const { data } = await supabase
            .from('notifications')
            .select(`*`)
            .eq('id', String((payload.new as { id: string }).id))
            .single();

          if (data !== null) {
            const { created_at, updated_at, entity_type, metadata, ...rest } =
              data;
            const notification: Notification = {
              ...rest,
              created_at: created_at ?? nowIso(),
              updated_at: updated_at ?? nowIso(),
              entity_type: (entity_type ?? null) as EntityType | null,
              metadata: (metadata as Record<string, Json>) ?? {},
            };

            handler(notification);
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }

  /** Call Postgres function to soft-delete old notifications */
  async cleanupOldNotifications(): Promise<NotificationActionResult> {
    const supabase = await this.client();
    const { data, error } = await supabase.rpc('cleanup_old_notifications');

    if (isDefined(error)) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------
export const createNotificationService = (): NotificationService =>
  new NotificationService();

// ---------------------------------------------------------------------------
// High-level helper shortcuts (re-exported for compatibility)
// ---------------------------------------------------------------------------

export function createFollowNotification(
  followerId: string,
  followingId: string,
  followingType: 'user' | 'collective',
): Promise<NotificationActionResult> {
  const service = createNotificationService();

  return service.createNotification({
    recipient_id: followingId,
    actor_id: followerId,
    type: 'follow',
    title: 'New follower',
    message: 'You have a new follower',
    entity_type: followingType,
    entity_id: followingId,
  });
}

export function createPostLikeNotification(
  userId: string,
  postId: string,
): Promise<NotificationActionResult> {
  const service = createNotificationService();

  return service.createNotification({
    recipient_id: userId,
    actor_id: userId,
    type: 'post_like',
    title: 'Post liked',
    message: 'Your post received a like',
    entity_type: 'post',
    entity_id: postId,
  });
}

export async function getNotificationsForUser(
  userId: string,
  limit = 10,
): Promise<Notification[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('recipient_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }

  return data as Notification[];
}

export async function getUnreadNotificationCount(
  userId: string,
): Promise<number> {
  const supabase = await createServerSupabaseClient();
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('recipient_id', userId)
    .is('read_at', null);

  if (error) {
    console.error('Error fetching unread notification count:', error);
    return 0;
  }

  return count ?? 0;
}
