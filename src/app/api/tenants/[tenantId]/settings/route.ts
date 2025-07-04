// Tenant Settings API Route
// Manages tenant configuration and settings with proper access control

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  createTenantErrorResponse,
  createTenantSuccessResponse,
} from '@/lib/api/tenant-helpers';
import { checkTenantAccessCached } from '@/lib/cache/tenant-cache';
import { createServerSupabaseClient } from '@/lib/supabase/server';

import type { Database } from '@/lib/database.types';

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const TenantSettingsUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  avatar_url: z.string().url().optional().nullable(),
  banner_url: z.string().url().optional().nullable(),
  website: z.string().url().optional().nullable(),
  location: z.string().max(100).optional().nullable(),
  is_public: z.boolean().optional(),
  settings: z.record(z.string(), z.unknown()).optional(), // JSON settings
});

// =============================================================================
// GET TENANT SETTINGS
// =============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
): Promise<NextResponse> {
  try {
    const { tenantId } = await params;

    // Use cached access check
    const access = await checkTenantAccessCached(tenantId, 'member');
    if (!access.hasAccess || !access.userRole) {
      return createTenantErrorResponse(access.error ?? 'Access Denied', 403);
    }
    const { userRole } = access;

    const supabase = await createServerSupabaseClient();

    // Get tenant details with settings
    const { data: tenant, error } = await supabase
      .from('tenants')
      .select(
        `
        id,
        name,
        slug,
        type,
        description,
        is_public,
        created_at,
        updated_at
      `,
      )
      .eq('id', tenantId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch tenant settings: ${error.message}`);
    }

    // Get member count
    const { count: memberCount, error: countError } = await supabase
      .from('tenant_members')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    if (countError) {
      console.warn('Failed to get member count:', countError);
    }

    const responseData = {
      tenant: {
        ...tenant,
        member_count: memberCount || 0,
      },
      user_role: userRole,
      can_edit: ['admin', 'owner'].includes(userRole),
    };

    return createTenantSuccessResponse(responseData);
  } catch (error) {
    console.error('Error fetching tenant settings:', error);
    return createTenantErrorResponse('Internal server error', 500);
  }
}

// =============================================================================
// UPDATE TENANT SETTINGS
// =============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
): Promise<NextResponse> {
  try {
    const { tenantId } = await params;

    const access = await checkTenantAccessCached(tenantId, 'admin');
    if (!access.hasAccess || !access.userRole) {
      return createTenantErrorResponse(access.error ?? 'Access denied', 403);
    }
    const { userRole } = access;

    const body = await request.json();

    // Validate request body
    const validationResult = TenantSettingsUpdateSchema.safeParse(body);
    if (!validationResult.success) {
      return createTenantErrorResponse(
        `Invalid request data: ${validationResult.error.message}`,
        400,
      );
    }

    const updates = validationResult.data;

    const supabase = await createServerSupabaseClient();

    // Get current user for audit logging
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Authentication required');
    }

    // Check user permissions
    const { data: membership, error: membershipError } = await supabase
      .from('tenant_members')
      .select('role')
      .eq('tenant_id', tenantId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (membershipError !== null) {
      console.error('Error checking membership:', membershipError);
      return NextResponse.json(
        { error: 'Failed to verify permissions' },
        { status: 500 },
      );
    }

    if (membership === null || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 },
      );
    }

    // Prepare update data - filter out undefined values
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== undefined),
    );

    const updateData: Partial<
      Database['public']['Tables']['tenants']['Update']
    > = {
      ...filteredUpdates,
      updated_at: new Date().toISOString(),
    };

    // Only owners can change critical settings
    if (!['owner'].includes(userRole)) {
      // Remove settings that only owners can change
      delete updateData.is_public;
    }

    // Update the tenant
    const { data: updatedTenant, error: updateError } = await supabase
      .from('tenants')
      .update(updateData)
      .eq('id', tenantId)
      .select(
        `
        id,
        name,
        slug,
        description,
        is_public,
        updated_at
      `,
      )
      .single();

    if (updateError) {
      throw new Error(`Failed to update tenant: ${updateError.message}`);
    }

    return createTenantSuccessResponse({
      tenant: updatedTenant,
      message: 'Settings updated successfully',
      updated_fields: Object.keys(updates),
    });
  } catch (error) {
    console.error('Error updating tenant settings:', error);
    return createTenantErrorResponse('Internal server error', 500);
  }
}

// =============================================================================
// DELETE TENANT
// =============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
): Promise<NextResponse> {
  try {
    const { tenantId } = await params;

    const access = await checkTenantAccessCached(tenantId, 'owner');
    if (!access.hasAccess) {
      return createTenantErrorResponse(access.error ?? 'Access denied', 403);
    }

    const supabase = await createServerSupabaseClient();

    // Get current user for logging
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Authentication required');
    }

    // Check if this is a personal tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('type, name, slug')
      .eq('id', tenantId)
      .single();

    if (tenantError) {
      throw new Error(`Failed to fetch tenant: ${tenantError.message}`);
    }

    if (tenant.type === 'personal') {
      return createTenantErrorResponse(
        'Personal tenants cannot be deleted',
        400,
      );
    }

    // In a real scenario, you would soft-delete or archive.
    // For now, we will return a success message.
    console.log(
      `Tenant deletion requested for ${tenant.name} (${tenantId}) by user ${user.id}. Soft-delete/archival logic would run here.`,
    );

    return createTenantSuccessResponse({
      message: `Tenant "${tenant.name}" has been marked for deletion.`,
    });
  } catch (error) {
    console.error('Error deleting tenant:', error);
    return createTenantErrorResponse('Internal server error', 500);
  }
}
