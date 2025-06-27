// Tenant Settings API Route
// Manages tenant configuration and settings with proper access control

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { withTenantAccess, createTenantErrorResponse, createTenantSuccessResponse } from '@/lib/api/tenant-helpers';

import type { Database } from '@/types/database.types';

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
  { params }: { params: Promise<{ tenantId: string }> }
): Promise<NextResponse> {
  try {
    const { tenantId } = await params;

    // Execute with tenant access validation
    const result = await withTenantAccess(
      tenantId,
      'member', // Any member can view basic settings
      async (supabase, userRole) => {
        // Get tenant details with settings
        const { data: tenant, error } = await supabase
          .from('tenants')
          .select(`
            id,
            name,
            slug,
            type,
            description,
            avatar_url,
            banner_url,
            website,
            location,
            is_public,
            settings,
            created_at,
            updated_at
          `)
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

        // Only admins+ can see sensitive settings
        const sensitiveSettings = ['admin', 'owner'].includes(userRole) ? {
          settings: tenant.settings,
        } : {};

        return {
          tenant: {
            ...tenant,
            ...sensitiveSettings,
            member_count: memberCount || 0,
          },
          user_role: userRole,
          can_edit: ['admin', 'owner'].includes(userRole),
        };
      }
    );

    if (result.error) {
      return createTenantErrorResponse(result.error, result.status);
    }

    return createTenantSuccessResponse(result.data);

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
  { params }: { params: Promise<{ tenantId: string }> }
): Promise<NextResponse> {
  try {
    const { tenantId } = await params;
    const body = await request.json();
    
    // Validate request body
    const validationResult = TenantSettingsUpdateSchema.safeParse(body);
    if (!validationResult.success) {
      return createTenantErrorResponse(
        `Invalid request data: ${validationResult.error.message}`,
        400
      );
    }

    const updates = validationResult.data;

    // Execute with tenant access validation
    const result = await withTenantAccess(
      tenantId,
      'admin', // Only admins+ can update settings
      async (supabase, userRole) => {
        // Get current user for audit logging
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          throw new Error('Authentication required');
        }

        // Prepare update data - filter out undefined values
        const filteredUpdates = Object.fromEntries(
          Object.entries(updates).filter(([, value]) => value !== undefined)
        );
        
        const updateData: Partial<Database['public']['Tables']['tenants']['Row']> = {
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
          .select(`
            id,
            name,
            slug,
            description,
            avatar_url,
            banner_url,
            website,
            location,
            is_public,
            updated_at
          `)
          .single();

        if (updateError) {
          throw new Error(`Failed to update tenant: ${updateError.message}`);
        }

        // Log the settings change (optional - for audit trail)
        try {
          await supabase
            .from('tenant_audit_log')
            .insert({
              tenant_id: tenantId,
              user_id: user.id,
              action: 'settings_updated',
              details: {
                updated_fields: Object.keys(updates),
                user_role: userRole,
              },
            });
        } catch (auditError) {
          // Don't fail the request if audit logging fails
          console.warn('Failed to log settings update:', auditError);
        }

        return {
          tenant: updatedTenant,
          message: 'Settings updated successfully',
          updated_fields: Object.keys(updates),
        };
      }
    );

    if (result.error) {
      return createTenantErrorResponse(result.error, result.status);
    }

    return createTenantSuccessResponse(result.data);

  } catch (error) {
    console.error('Error updating tenant settings:', error);
    return createTenantErrorResponse('Internal server error', 500);
  }
}

// =============================================================================
// DELETE TENANT (SOFT DELETE)
// =============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
): Promise<NextResponse> {
  try {
    const { tenantId } = await params;

    // Execute with tenant access validation
    const result = await withTenantAccess(
      tenantId,
      'owner', // Only owners can delete tenants
      async (supabase, userRole) => {
        // Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          throw new Error('Authentication required');
        }

        // Check if this is a personal tenant (cannot be deleted)
        const { data: tenant, error: tenantError } = await supabase
          .from('tenants')
          .select('type, name')
          .eq('id', tenantId)
          .single();

        if (tenantError) {
          throw new Error(`Failed to fetch tenant: ${tenantError.message}`);
        }

        if (tenant.type === 'personal') {
          throw new Error('Personal tenants cannot be deleted');
        }

        // Soft delete the tenant
        const { error: deleteError } = await supabase
          .from('tenants')
          .update({
            deleted_at: new Date().toISOString(),
            slug: `${tenant.name}-deleted-${Date.now()}`, // Prevent slug conflicts
          })
          .eq('id', tenantId);

        if (deleteError) {
          throw new Error(`Failed to delete tenant: ${deleteError.message}`);
        }

        // Log the deletion
        try {
          await supabase
            .from('tenant_audit_log')
            .insert({
              tenant_id: tenantId,
              user_id: user.id,
              action: 'tenant_deleted',
              details: {
                tenant_name: tenant.name,
                deleted_by: user.id,
              },
            });
        } catch (auditError) {
          console.warn('Failed to log tenant deletion:', auditError);
        }

        return {
          message: `Tenant "${tenant.name}" has been deleted`,
          deleted_at: new Date().toISOString(),
        };
      }
    );

    if (result.error) {
      return createTenantErrorResponse(result.error, result.status);
    }

    return createTenantSuccessResponse(result.data);

  } catch (error) {
    console.error('Error deleting tenant:', error);
    return createTenantErrorResponse('Internal server error', 500);
  }
} 