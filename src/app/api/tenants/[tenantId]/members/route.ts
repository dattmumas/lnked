// Tenant Members API Route
// Manages tenant membership operations with proper role-based access control

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  createTenantErrorResponse,
  createTenantSuccessResponse,
} from '@/lib/api/tenant-helpers';
import { checkTenantAccessCached } from '@/lib/cache/tenant-cache';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const InviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['member', 'editor', 'admin']).default('member'),
});

const UpdateMemberRoleSchema = z.object({
  user_id: z.string().uuid(),
  role: z.enum(['member', 'editor', 'admin']),
});

// =============================================================================
// GET TENANT MEMBERS
// =============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
): Promise<NextResponse> {
  try {
    const { tenantId } = await params;

    // Check tenant access with caching
    const accessCheck = await checkTenantAccessCached(tenantId, 'member');
    if (!accessCheck.hasAccess) {
      return createTenantErrorResponse(
        accessCheck.error || 'Access denied',
        accessCheck.error === 'Authentication required' ? 401 : 403,
      );
    }

    const supabase = await createServerSupabaseClient();

    // Get tenant members with user information
    const { data: members, error } = await supabase
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
      .order('joined_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch members: ${error.message}`);
    }

    // Transform data to match our TenantMember interface
    const transformedMembers = (members || []).map((member) => {
      const user = member.user as {
        full_name?: string;
        username?: string;
        avatar_url?: string;
      } | null;
      return {
        id: member.id,
        tenant_id: member.tenant_id,
        user_id: member.user_id,
        role: member.role,
        joined_at: member.joined_at,
        user_name: user?.full_name || user?.username || 'Unknown User',
        user_email: null, // Email not available in public users table
        user_avatar_url: user?.avatar_url || null,
      };
    });

    return createTenantSuccessResponse({
      members: transformedMembers,
      total_count: transformedMembers.length,
      user_role: accessCheck.userRole,
    });
  } catch (error) {
    console.error('Error fetching tenant members:', error);
    return createTenantErrorResponse('Internal server error', 500);
  }
}

// =============================================================================
// INVITE MEMBER TO TENANT
// =============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
): Promise<NextResponse> {
  try {
    const { tenantId } = await params;
    const body = await request.json();

    // Validate request body
    const validationResult = InviteMemberSchema.safeParse(body);
    if (!validationResult.success) {
      return createTenantErrorResponse(
        `Invalid request data: ${validationResult.error.message}`,
        400,
      );
    }

    const { email, role } = validationResult.data;

    // Check tenant access with caching
    const accessCheck = await checkTenantAccessCached(tenantId, 'admin');
    if (!accessCheck.hasAccess) {
      return createTenantErrorResponse(
        accessCheck.error || 'Access denied',
        accessCheck.error === 'Authentication required' ? 401 : 403,
      );
    }

    const supabase = await createServerSupabaseClient();

    // Check if user exists with this email (need to query auth.users)
    const { data: authUsers, error: userError } =
      await supabase.auth.admin.listUsers();

    if (userError) {
      throw new Error(`Failed to search users: ${userError.message}`);
    }

    const authUser = authUsers.users.find((u) => u.email === email);
    if (!authUser) {
      throw new Error('User with this email does not exist');
    }

    // Get the public user profile
    const { data: userData, error: profileError } = await supabase
      .from('users')
      .select('id, username, full_name')
      .eq('id', authUser.id)
      .single();

    if (profileError) {
      throw new Error(`Failed to find user profile: ${profileError.message}`);
    }

    // Check if user is already a member
    const { data: existingMember, error: memberCheckError } = await supabase
      .from('tenant_members')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('user_id', userData.id)
      .single();

    if (memberCheckError && memberCheckError.code !== 'PGRST116') {
      throw new Error(
        `Failed to check existing membership: ${memberCheckError.message}`,
      );
    }

    if (existingMember) {
      throw new Error('User is already a member of this tenant');
    }

    // Add user to tenant
    const { data: newMember, error: insertError } = await supabase
      .from('tenant_members')
      .insert({
        tenant_id: tenantId,
        user_id: userData.id,
        role,
      })
      .select(
        `
            id,
            role,
            joined_at,
        user:users!user_id(username, full_name)
      `,
      )
      .single();

    if (insertError) {
      throw new Error(`Failed to add member: ${insertError.message}`);
    }

    return createTenantSuccessResponse(
      {
        member: newMember,
        message: `Successfully invited ${userData.full_name || userData.username || email}`,
      },
      201,
    );
  } catch (error) {
    console.error('Error inviting member to tenant:', error);
    return createTenantErrorResponse('Internal server error', 500);
  }
}

// =============================================================================
// UPDATE MEMBER ROLE
// =============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
): Promise<NextResponse> {
  try {
    const { tenantId } = await params;
    const body = await request.json();

    // Validate request body
    const validationResult = UpdateMemberRoleSchema.safeParse(body);
    if (!validationResult.success) {
      return createTenantErrorResponse(
        `Invalid request data: ${validationResult.error.message}`,
        400,
      );
    }

    const { user_id, role } = validationResult.data;

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

    // Prevent users from changing their own role (unless they're the owner)
    if (user_id === currentUser.id && accessCheck.userRole !== 'owner') {
      throw new Error('Cannot change your own role');
    }

    // Get the target member's current role
    const { data: targetMember, error: memberError } = await supabase
      .from('tenant_members')
      .select('role')
      .eq('tenant_id', tenantId)
      .eq('user_id', user_id)
      .single();

    if (memberError) {
      if (memberError.code === 'PGRST116') {
        throw new Error('Member not found');
      }
      throw new Error(`Failed to find member: ${memberError.message}`);
    }

    // Prevent non-owners from changing owner roles
    if (targetMember.role === 'owner' && accessCheck.userRole !== 'owner') {
      throw new Error('Only owners can change owner roles');
    }

    // Prevent admins from promoting to admin (only owners can do that)
    if (role === 'admin' && accessCheck.userRole !== 'owner') {
      throw new Error('Only owners can promote to admin');
    }

    // Update the member's role
    const { data: updatedMember, error: updateError } = await supabase
      .from('tenant_members')
      .update({ role })
      .eq('tenant_id', tenantId)
      .eq('user_id', user_id)
      .select(
        `
            id,
            role,
            user:users!user_id(username, full_name)
      `,
      )
      .single();

    if (updateError) {
      throw new Error(`Failed to update member role: ${updateError.message}`);
    }

    return createTenantSuccessResponse({
      member: updatedMember,
      message: `Successfully updated role to ${role}`,
    });
  } catch (error) {
    console.error('Error updating member role:', error);
    return createTenantErrorResponse('Internal server error', 500);
  }
}
