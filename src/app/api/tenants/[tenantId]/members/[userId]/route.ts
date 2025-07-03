// Tenant Member Removal API Route
// Handles removing members from tenants with proper access control

import { NextRequest, NextResponse } from 'next/server';

import {
  createTenantErrorResponse,
  createTenantSuccessResponse,
} from '@/lib/api/tenant-helpers';
import { checkTenantAccessCached } from '@/lib/cache/tenant-cache';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// =============================================================================
// REMOVE MEMBER FROM TENANT
// =============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; userId: string }> },
): Promise<NextResponse> {
  try {
    const { tenantId, userId } = await params;

    // Check tenant access with caching
    const accessCheck = await checkTenantAccessCached(tenantId, 'admin');
    if (!accessCheck.hasAccess) {
      return createTenantErrorResponse(
        accessCheck.error || 'Access denied',
        accessCheck.error === 'Authentication required' ? 401 : 403,
      );
    }

    const supabase = await createServerSupabaseClient();

    // Get current user for permission checks
    const {
      data: { user: currentUser },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !currentUser) {
      throw new Error('Authentication required');
    }

    // Get the target member's information
    const { data: targetMember, error: memberError } = await supabase
      .from('tenant_members')
      .select(
        `
        role,
        user:users!user_id(username, full_name)
      `,
      )
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .single();

    if (memberError) {
      if (memberError.code === 'PGRST116') {
        throw new Error('Member not found');
      }
      throw new Error(`Failed to find member: ${memberError.message}`);
    }

    // Prevent removing owners (they must transfer ownership first)
    if (targetMember.role === 'owner') {
      throw new Error('Cannot remove owner. Transfer ownership first.');
    }

    // Prevent non-owners from removing admins
    if (targetMember.role === 'admin' && accessCheck.userRole !== 'owner') {
      throw new Error('Only owners can remove admins');
    }

    // Prevent users from removing themselves (unless they're not the last owner)
    if (userId === currentUser.id) {
      if (accessCheck.userRole === 'owner') {
        // Check if there are other owners
        const { count: ownerCount, error: countError } = await supabase
          .from('tenant_members')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)
          .eq('role', 'owner');

        if (countError) {
          throw new Error('Failed to check owner count');
        }

        if ((ownerCount || 0) <= 1) {
          throw new Error(
            'Cannot remove yourself as the last owner. Transfer ownership first.',
          );
        }
      }
    }

    // Remove the member
    const { error: deleteError } = await supabase
      .from('tenant_members')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('user_id', userId);

    if (deleteError) {
      throw new Error(`Failed to remove member: ${deleteError.message}`);
    }

    const userData = Array.isArray(targetMember.user)
      ? targetMember.user[0]
      : targetMember.user;

    return createTenantSuccessResponse({
      message: `Successfully removed ${userData?.full_name || userData?.username || 'member'}`,
      removed_user: {
        id: userId,
        name: userData?.full_name || userData?.username,
        role: targetMember.role,
      },
    });
  } catch (error) {
    console.error('Error removing member from tenant:', error);
    return createTenantErrorResponse('Internal server error', 500);
  }
}

// =============================================================================
// GET MEMBER DETAILS
// =============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; userId: string }> },
): Promise<NextResponse> {
  try {
    const { tenantId, userId } = await params;

    // Check tenant access with caching
    const accessCheck = await checkTenantAccessCached(tenantId, 'member');
    if (!accessCheck.hasAccess) {
      return createTenantErrorResponse(
        accessCheck.error || 'Access denied',
        accessCheck.error === 'Authentication required' ? 401 : 403,
      );
    }

    const supabase = await createServerSupabaseClient();

    // Get member details
    const { data: member, error } = await supabase
      .from('tenant_members')
      .select(
        `
        id,
        tenant_id,
        user_id,
        role,
        joined_at,
        user:users!user_id(
          id,
          username,
          full_name,
          avatar_url
        )
      `,
      )
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('Member not found');
      }
      throw new Error(`Failed to fetch member: ${error.message}`);
    }

    // Transform data to match our TenantMember interface
    const userData = Array.isArray(member.user) ? member.user[0] : member.user;

    const transformedMember = {
      id: member.id,
      tenant_id: member.tenant_id,
      user_id: member.user_id,
      role: member.role,
      joined_at: member.joined_at,
      user_name: userData?.full_name || userData?.username || 'Unknown User',
      user_email: null, // Email not available in public users table
      user_avatar_url: userData?.avatar_url || null,
    };

    return createTenantSuccessResponse({
      member: transformedMember,
      viewer_role: accessCheck.userRole,
    });
  } catch (error) {
    console.error('Error fetching member details:', error);
    return createTenantErrorResponse('Internal server error', 500);
  }
}
