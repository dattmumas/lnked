// Tenant Members API Route
// Manages tenant membership operations with proper role-based access control

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { withTenantAccess, createTenantErrorResponse, createTenantSuccessResponse } from '@/lib/api/tenant-helpers';


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
  { params }: { params: Promise<{ tenantId: string }> }
): Promise<NextResponse> {
  try {
    const { tenantId } = await params;

    // Execute with tenant access validation
    const result = await withTenantAccess(
      tenantId,
      'member', // Any member can view the member list
      async (supabase, userRole) => {
        // Get tenant members with user information
        const { data: members, error } = await supabase
          .from('tenant_members')
          .select(`
            id,
            tenant_id,
            user_id,
            role,
            joined_at,
            user:users!user_id(
              id,
              username,
              full_name,
              email,
              avatar_url
            )
          `)
          .eq('tenant_id', tenantId)
          .order('joined_at', { ascending: true });

        if (error) {
          throw new Error(`Failed to fetch members: ${error.message}`);
        }

        // Transform data to match our TenantMember interface
        const transformedMembers = (members || []).map(member => {
          const user = member.user as { full_name?: string; username?: string; email?: string; avatar_url?: string } | null;
          return {
            id: member.id,
            tenant_id: member.tenant_id,
            user_id: member.user_id,
            role: member.role,
            joined_at: member.joined_at,
            user_name: user?.full_name || user?.username || 'Unknown User',
            user_email: user?.email || null,
            user_avatar_url: user?.avatar_url || null,
          };
        });

        return {
          members: transformedMembers,
          total_count: transformedMembers.length,
          user_role: userRole,
        };
      }
    );

    if (result.error) {
      return createTenantErrorResponse(result.error, result.status);
    }

    return createTenantSuccessResponse(result.data);

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
  { params }: { params: Promise<{ tenantId: string }> }
): Promise<NextResponse> {
  try {
    const { tenantId } = await params;
    const body = await request.json();
    
    // Validate request body
    const validationResult = InviteMemberSchema.safeParse(body);
    if (!validationResult.success) {
      return createTenantErrorResponse(
        `Invalid request data: ${validationResult.error.message}`,
        400
      );
    }

    const { email, role } = validationResult.data;

    // Execute with tenant access validation
    const result = await withTenantAccess(
      tenantId,
      'admin', // Only admins+ can invite members
      async (supabase, userRole) => {
        // Check if user exists with this email
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, username, full_name, email')
          .eq('email', email)
          .single();

        if (userError) {
          if (userError.code === 'PGRST116') {
            throw new Error('User with this email does not exist');
          }
          throw new Error(`Failed to find user: ${userError.message}`);
        }

        // Check if user is already a member
        const { data: existingMember, error: memberCheckError } = await supabase
          .from('tenant_members')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('user_id', userData.id)
          .single();

        if (memberCheckError && memberCheckError.code !== 'PGRST116') {
          throw new Error(`Failed to check existing membership: ${memberCheckError.message}`);
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
          .select(`
            id,
            role,
            joined_at,
            user:users!user_id(username, full_name, email)
          `)
          .single();

        if (insertError) {
          throw new Error(`Failed to add member: ${insertError.message}`);
        }

        return {
          member: newMember,
          message: `Successfully invited ${userData.full_name || userData.username || email}`,
        };
      }
    );

    if (result.error) {
      return createTenantErrorResponse(result.error, result.status);
    }

    return createTenantSuccessResponse(result.data, 201);

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
  { params }: { params: Promise<{ tenantId: string }> }
): Promise<NextResponse> {
  try {
    const { tenantId } = await params;
    const body = await request.json();
    
    // Validate request body
    const validationResult = UpdateMemberRoleSchema.safeParse(body);
    if (!validationResult.success) {
      return createTenantErrorResponse(
        `Invalid request data: ${validationResult.error.message}`,
        400
      );
    }

    const { user_id, role } = validationResult.data;

    // Execute with tenant access validation
    const result = await withTenantAccess(
      tenantId,
      'admin', // Only admins+ can change roles
      async (supabase, userRole) => {
        // Get current user for permission checks
        const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
        if (authError || !currentUser) {
          throw new Error('Authentication required');
        }

        // Prevent users from changing their own role (unless they're the owner)
        if (user_id === currentUser.id && userRole !== 'owner') {
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
        if (targetMember.role === 'owner' && userRole !== 'owner') {
          throw new Error('Only owners can change owner roles');
        }

        // Prevent admins from promoting to admin (only owners can do that)
        if (role === 'admin' && userRole !== 'owner') {
          throw new Error('Only owners can promote to admin');
        }

        // Update the member's role
        const { data: updatedMember, error: updateError } = await supabase
          .from('tenant_members')
          .update({ role })
          .eq('tenant_id', tenantId)
          .eq('user_id', user_id)
          .select(`
            id,
            role,
            user:users!user_id(username, full_name)
          `)
          .single();

        if (updateError) {
          throw new Error(`Failed to update member role: ${updateError.message}`);
        }

        return {
          member: updatedMember,
          message: `Successfully updated role to ${role}`,
        };
      }
    );

    if (result.error) {
      return createTenantErrorResponse(result.error, result.status);
    }

    return createTenantSuccessResponse(result.data);

  } catch (error) {
    console.error('Error updating member role:', error);
    return createTenantErrorResponse('Internal server error', 500);
  }
} 