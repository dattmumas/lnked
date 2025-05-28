'use server';

import { revalidatePath } from 'next/cache';
import { notificationService } from '@/lib/notifications/service';
import type { NotificationActionResult, NotificationPreferencesUpdate } from '@/types/notifications';

export async function markNotificationsAsRead(
  notificationIds?: string[]
): Promise<NotificationActionResult> {
  try {
    const result = await notificationService.markAsRead(notificationIds);
    
    if (result.success) {
      revalidatePath('/');
      revalidatePath('/dashboard');
    }
    
    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function deleteNotifications(
  notificationIds: string[]
): Promise<NotificationActionResult> {
  try {
    const result = await notificationService.deleteNotifications(notificationIds);
    
    if (result.success) {
      revalidatePath('/');
      revalidatePath('/dashboard');
    }
    
    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function updateNotificationPreferences(
  preferences: NotificationPreferencesUpdate[]
): Promise<NotificationActionResult> {
  try {
    const result = await notificationService.updatePreferences(preferences);
    
    if (result.success) {
      revalidatePath('/dashboard/settings');
    }
    
    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
} 