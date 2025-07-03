import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  createTenantErrorResponse,
  createTenantSuccessResponse,
} from '@/lib/api/tenant-helpers';
import { checkTenantAccessCached } from '@/lib/cache/tenant-cache';

// Schema for notification settings
const notificationSettingsSchema = z.object({
  email_notifications: z.boolean().optional(),
  push_notifications: z.boolean().optional(),
  mention_notifications: z.boolean().optional(),
  new_member_notifications: z.boolean().optional(),
  channel_activity_notifications: z.boolean().optional(),
  digest_frequency: z.enum(['never', 'daily', 'weekly']).optional(),
});

// Default notification settings
const defaultNotificationSettings = {
  email_notifications: true,
  push_notifications: true,
  mention_notifications: true,
  new_member_notifications: true,
  channel_activity_notifications: false,
  digest_frequency: 'daily' as const,
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
): Promise<NextResponse> {
  try {
    const { tenantId } = await params;

    // Check tenant access with caching
    const access = await checkTenantAccessCached(tenantId, 'member');
    if (!access.hasAccess) {
      return createTenantErrorResponse(access.error || 'Access denied', 403);
    }

    // For now, return default notification settings
    // TODO: Implement tenant-specific notification settings table
    return createTenantSuccessResponse(defaultNotificationSettings);
  } catch (error) {
    console.error('Error in notification settings GET:', error);
    return createTenantErrorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500,
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
): Promise<NextResponse> {
  try {
    const { tenantId } = await params;
    const body = await request.json();

    // Validate request body
    const validationResult = notificationSettingsSchema.safeParse(body);
    if (!validationResult.success) {
      return createTenantErrorResponse(
        'Invalid notification settings data',
        400,
      );
    }

    const updates = validationResult.data;

    // Check tenant access with caching
    const access = await checkTenantAccessCached(tenantId, 'admin');
    if (!access.hasAccess) {
      return createTenantErrorResponse(access.error || 'Access denied', 403);
    }

    // No persistence layer – just return the merged settings.
    const mergedSettings = { ...defaultNotificationSettings, ...updates };
    return createTenantSuccessResponse(mergedSettings);
  } catch (error) {
    console.error('Error in notification settings PATCH:', error);
    return createTenantErrorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500,
    );
  }
}
