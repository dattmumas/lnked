import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { withTenantAccess, createTenantErrorResponse, createTenantSuccessResponse } from '@/lib/api/tenant-helpers';

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
  { params }: { params: Promise<{ tenantId: string }> }
): Promise<NextResponse> {
  try {
    const { tenantId } = await params;

    const result = await withTenantAccess(tenantId, 'member', async (supabase, userRole) => {
      // Check if notification settings exist for this tenant
      const { data: settings, error } = await supabase
        .from('tenant_notification_settings')
        .select('*')
        .eq('tenant_id', tenantId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching notification settings:', error);
        throw new Error('Failed to fetch notification settings');
      }

      // Return existing settings or defaults
      return settings || defaultNotificationSettings;
    });

    if (result.error) {
      return createTenantErrorResponse(result.error, result.status);
    }

    return createTenantSuccessResponse(result.data);
  } catch (error) {
    console.error('Error in notification settings GET:', error);
    return createTenantErrorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
): Promise<NextResponse> {
  try {
    const { tenantId } = await params;
    const body = await request.json();

    // Validate request body
    const validationResult = notificationSettingsSchema.safeParse(body);
    if (!validationResult.success) {
      return createTenantErrorResponse('Invalid notification settings data', 400);
    }

    const updates = validationResult.data;

    const result = await withTenantAccess(tenantId, 'admin', async (supabase, userRole) => {
      // Try to update existing settings
      const { data: updatedSettings, error: updateError } = await supabase
        .from('tenant_notification_settings')
        .update(updates)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (updateError && updateError.code === 'PGRST116') {
        // No existing settings, create new ones
        const newSettings = { ...defaultNotificationSettings, ...updates, tenant_id: tenantId };
        const { data: createdSettings, error: createError } = await supabase
          .from('tenant_notification_settings')
          .insert(newSettings)
          .select()
          .single();

        if (createError) {
          console.error('Error creating notification settings:', createError);
          throw new Error('Failed to create notification settings');
        }

        return createdSettings;
      }

      if (updateError) {
        console.error('Error updating notification settings:', updateError);
        throw new Error('Failed to update notification settings');
      }

      return updatedSettings;
    });

    if (result.error) {
      return createTenantErrorResponse(result.error, result.status);
    }

    return createTenantSuccessResponse(result.data);
  } catch (error) {
    console.error('Error in notification settings PATCH:', error);
    return createTenantErrorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
} 