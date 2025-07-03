import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  createTenantErrorResponse,
  createTenantSuccessResponse,
} from '@/lib/api/tenant-helpers';
import { checkTenantAccessCached } from '@/lib/cache/tenant-cache';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// Schema for privacy settings
const privacySettingsSchema = z.object({
  is_public: z.boolean().optional(),
  allow_member_invites: z.boolean().optional(),
  require_approval_for_posts: z.boolean().optional(),
  show_member_list: z.boolean().optional(),
  allow_external_sharing: z.boolean().optional(),
  indexable_by_search_engines: z.boolean().optional(),
});

// Default privacy settings
const defaultPrivacySettings = {
  is_public: true,
  allow_member_invites: true,
  require_approval_for_posts: false,
  show_member_list: true,
  allow_external_sharing: true,
  indexable_by_search_engines: true,
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

    const supabase = await createServerSupabaseClient();

    // Get tenant privacy settings from the tenants table
    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('is_public')
      .eq('id', tenantId)
      .single();

    if (error) {
      console.error('Error fetching tenant privacy settings:', error);
      return createTenantErrorResponse('Failed to fetch privacy settings', 500);
    }

    // Return settings combining tenant data with defaults
    const settings = {
      ...defaultPrivacySettings,
      is_public: tenant.is_public,
    };

    return createTenantSuccessResponse(settings);
  } catch (error) {
    console.error('Error in privacy settings GET:', error);
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
    const validationResult = privacySettingsSchema.safeParse(body);
    if (!validationResult.success) {
      return createTenantErrorResponse('Invalid privacy settings data', 400);
    }

    const updates = validationResult.data;

    // Check tenant access with caching
    const access = await checkTenantAccessCached(tenantId, 'admin');
    if (!access.hasAccess) {
      return createTenantErrorResponse(access.error || 'Access denied', 403);
    }

    const supabase = await createServerSupabaseClient();

    // Update tenant settings (only is_public is stored in tenants table)
    if (updates.is_public !== undefined) {
      const { error: updateError } = await supabase
        .from('tenants')
        .update({ is_public: updates.is_public })
        .eq('id', tenantId);

      if (updateError) {
        console.error('Error updating tenant privacy settings:', updateError);
        return createTenantErrorResponse(
          'Failed to update privacy settings',
          500,
        );
      }
    }

    // Get updated settings
    const { data: tenant, error: fetchError } = await supabase
      .from('tenants')
      .select('is_public')
      .eq('id', tenantId)
      .single();

    if (fetchError) {
      console.error('Error fetching updated privacy settings:', fetchError);
      return createTenantErrorResponse('Failed to fetch updated settings', 500);
    }

    // Return updated settings
    const updatedSettings = {
      ...defaultPrivacySettings,
      is_public: tenant.is_public,
      ...updates, // Include the updates that were requested
    };

    return createTenantSuccessResponse(updatedSettings);
  } catch (error) {
    console.error('Error in privacy settings PATCH:', error);
    return createTenantErrorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500,
    );
  }
}
