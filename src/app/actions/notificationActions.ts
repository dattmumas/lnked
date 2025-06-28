'use server';

import { revalidatePath } from 'next/cache';

import { NotificationService } from '@/lib/notifications/service';

import type {
  NotificationActionResult,
  NotificationPreferencesUpdate,
} from '@/types/notifications';

/**
 * Get a NotificationService instance when needed (lazy initialization)
 */
function getNotificationService(): NotificationService {
  return new NotificationService();
}

export async function markNotificationsAsRead(
  notificationIds?: string[],
): Promise<NotificationActionResult> {
  try {
    const notificationService = getNotificationService();
    const result = await notificationService.markAsRead(notificationIds);

    if (result.success) {
      revalidatePath('/');
      revalidatePath('/dashboard');
    }

    return result;
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function deleteNotifications(
  notificationIds: string[],
): Promise<NotificationActionResult> {
  try {
    const notificationService = getNotificationService();
    const result =
      await notificationService.deleteNotifications(notificationIds);

    if (result.success) {
      revalidatePath('/');
      revalidatePath('/dashboard');
    }

    return result;
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function updateNotificationPreferences(
  preferences: NotificationPreferencesUpdate[],
): Promise<NotificationActionResult> {
  try {
    const notificationService = getNotificationService();
    const result = await notificationService.updatePreferences(preferences);

    if (result.success) {
      revalidatePath('/settings/user/notifications');
    }

    return result;
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
