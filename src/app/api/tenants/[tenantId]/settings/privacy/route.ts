import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { withTenantAccess, createTenantErrorResponse, createTenantSuccessResponse } from '@/lib/api/tenant-helpers';

// Schema for privacy settings
const privacySettingsSchema = z.object({
  is_public: z.boolean().optional(),
  allow_discovery: z.boolean().optional(),
  require_approval: z.boolean().optional(),
  member_visibility: z.enum(['public', 'members_only', 'admins_only']).optional(),
  content_visibility: z.enum(['public', 'members_only']).optional(),
});

// Default privacy settings
const defaultPrivacySettings = {
  is_public: true,
  allow_discovery: true,
  require_approval: false,
  member_visibility: 'public' as const,
  content_visibility: 'public' as const,
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
): Promise<NextResponse> {
  try {
    const { tenantId } = await params;

    const result = await withTenantAccess(tenantId, 'member', async (supabase, userRole) => {
      // Get tenant basic info and privacy settings
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('is_public')
        .eq('id', tenantId)
        .single();

      if (tenantError) {
        console.error('Error fetching tenant:', tenantError);
        throw new Error('Failed to fetch tenant information');
      }

      // Check if privacy settings exist for this tenant
      const { data: settings, error } = await supabase
        .from('tenant_privacy_settings')
        .select('*')
        .eq('tenant_id', tenantId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching privacy settings:', error);
        throw new Error('Failed to fetch privacy settings');
      }

      // Merge tenant basic info with detailed privacy settings
      const privacySettings = {
        ...defaultPrivacySettings,
        is_public: tenant.is_public,
        ...(settings || {}),
      };

      return privacySettings;
    });

    if (result.error) {
      return createTenantErrorResponse(result.error, result.status);
    }

    return createTenantSuccessResponse(result.data);
  } catch (error) {
    console.error('Error in privacy settings GET:', error);
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
    const validationResult = privacySettingsSchema.safeParse(body);
    if (!validationResult.success) {
      return createTenantErrorResponse('Invalid privacy settings data', 400);
    }

    const updates = validationResult.data;

    const result = await withTenantAccess(tenantId, 'admin', async (supabase, userRole) => {
      // Start a transaction to update both tables if needed
      let updatedPrivacySettings = updates;

      // Update tenant is_public if provided
      if (updates.is_public !== undefined) {
        const { error: tenantUpdateError } = await supabase
          .from('tenants')
          .update({ is_public: updates.is_public })
          .eq('id', tenantId);

        if (tenantUpdateError) {
          console.error('Error updating tenant is_public:', tenantUpdateError);
          throw new Error('Failed to update tenant visibility');
        }
      }

      // Handle detailed privacy settings
      const detailedSettings = {
        allow_discovery: updates.allow_discovery,
        require_approval: updates.require_approval,
        member_visibility: updates.member_visibility,
        content_visibility: updates.content_visibility,
      };

      // Remove undefined values
      const filteredSettings = Object.fromEntries(
        Object.entries(detailedSettings).filter(([_, value]) => value !== undefined)
      );

      if (Object.keys(filteredSettings).length > 0) {
        // Try to update existing detailed settings
        const { data: updatedSettings, error: updateError } = await supabase
          .from('tenant_privacy_settings')
          .update(filteredSettings)
          .eq('tenant_id', tenantId)
          .select()
          .single();

        if (updateError && updateError.code === 'PGRST116') {
          // No existing settings, create new ones
          const newSettings = { 
            ...defaultPrivacySettings, 
            ...filteredSettings, 
            tenant_id: tenantId 
          };
          
          const { data: createdSettings, error: createError } = await supabase
            .from('tenant_privacy_settings')
            .insert(newSettings)
            .select()
            .single();

          if (createError) {
            console.error('Error creating privacy settings:', createError);
            throw new Error('Failed to create privacy settings');
          }

          updatedPrivacySettings = { ...updates, ...createdSettings };
        } else if (updateError) {
          console.error('Error updating privacy settings:', updateError);
          throw new Error('Failed to update privacy settings');
        } else {
          updatedPrivacySettings = { ...updates, ...updatedSettings };
        }
      }

      return updatedPrivacySettings;
    });

    if (result.error) {
      return createTenantErrorResponse(result.error, result.status);
    }

    return createTenantSuccessResponse(result.data);
  } catch (error) {
    console.error('Error in privacy settings PATCH:', error);
    return createTenantErrorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
} 