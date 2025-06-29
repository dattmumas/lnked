// Tenant-Aware API Helpers
// Utilities for handling tenant access and permissions in API routes

import { NextResponse } from 'next/server';

import { createServerSupabaseClient } from '@/lib/supabase/server';

import type { Database } from '@/lib/database.types';
import type { MemberRole } from '@/types/tenant.types';
import type { SupabaseClient } from '@supabase/supabase-js';

// Constants for HTTP status codes
const HTTP_UNAUTHORIZED = 401;
const HTTP_FORBIDDEN = 403;
const HTTP_BAD_REQUEST = 400;
const HTTP_OK = 200;
const HTTP_INTERNAL_SERVER_ERROR = 500;

// =============================================================================
// TENANT ACCESS VALIDATION
// =============================================================================

export interface TenantAccessResult {
  hasAccess: boolean;
  userRole: MemberRole | null;
  error?: string;
}

/**
 * Check if the current user has access to a specific tenant
 * @param tenantId - The tenant ID to check access for
 * @param requiredRole - Minimum role required (optional)
 * @returns Access result with user role information
 */
export async function checkTenantAccess(
  tenantId: string,
  requiredRole?: MemberRole,
): Promise<TenantAccessResult> {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError !== null || user === null) {
      return {
        hasAccess: false,
        userRole: null,
        error: 'Authentication required',
      };
    }

    // Handle personal tenant (tenantId === user.id) shortcut
    if (tenantId === user.id) {
      const userRole: MemberRole = 'owner';
      // Skip membership table check for personal spaces
      const roleHierarchyCheck =
        requiredRole !== undefined
          ? (() => {
              const roleHierarchy: Record<MemberRole, number> = {
                member: 1,
                editor: 2,
                admin: 3,
                owner: 4,
              };
              return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
            })()
          : true;

      if (!roleHierarchyCheck) {
        return {
          hasAccess: false,
          userRole,
          error: `Requires ${requiredRole} role or higher`,
        };
      }

      return {
        hasAccess: true,
        userRole,
      };
    }

    // Check tenant access by querying tenant_members directly
    const { data: memberData, error: memberError } = await supabase
      .from('tenant_members')
      .select('role')
      .eq('tenant_id', tenantId)
      .eq('user_id', user.id)
      .single();

    if (memberError !== null) {
      if (memberError.code === 'PGRST116') {
        // No rows found - user is not a member
        return {
          hasAccess: false,
          userRole: null,
          error: 'No access to this tenant',
        };
      }
      return {
        hasAccess: false,
        userRole: null,
        error: 'Failed to check tenant access',
      };
    }

    if (memberData === null) {
      return {
        hasAccess: false,
        userRole: null,
        error: 'No access to this tenant',
      };
    }

    const userRole = memberData.role;

    // Check role requirements if specified
    if (requiredRole !== undefined) {
      const roleHierarchy: Record<MemberRole, number> = {
        member: 1,
        editor: 2,
        admin: 3,
        owner: 4,
      };

      const hasRequiredRole =
        roleHierarchy[userRole] >= roleHierarchy[requiredRole];
      if (!hasRequiredRole) {
        return {
          hasAccess: false,
          userRole,
          error: `Requires ${requiredRole} role or higher`,
        };
      }
    }

    return {
      hasAccess: true,
      userRole,
    };
  } catch (error) {
    console.error('Error checking tenant access:', error);
    return {
      hasAccess: false,
      userRole: null,
      error: 'Internal server error',
    };
  }
}

// =============================================================================
// TENANT-AWARE OPERATION WRAPPER
// =============================================================================

/**
 * Execute an operation with tenant access validation
 * @param tenantId - The tenant ID to validate access for
 * @param requiredRole - Minimum role required for the operation
 * @param operation - The operation to execute if access is granted
 * @returns The result of the operation or an error
 */
export async function withTenantAccess<T>(
  tenantId: string,
  requiredRole: MemberRole,
  operation: (supabase: SupabaseClient, userRole: MemberRole) => Promise<T>,
): Promise<{ data?: T; error?: string; status: number }> {
  const accessResult = await checkTenantAccess(tenantId, requiredRole);

  if (!accessResult.hasAccess) {
    return {
      error: accessResult.error ?? 'Access denied',
      status:
        accessResult.error === 'Authentication required'
          ? HTTP_UNAUTHORIZED
          : HTTP_FORBIDDEN,
    };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const data = await operation(supabase, accessResult.userRole!);

    return {
      data,
      status: HTTP_OK,
    };
  } catch (error) {
    console.error('Error in tenant operation:', error);
    return {
      error: error instanceof Error ? error.message : 'Operation failed',
      status: HTTP_INTERNAL_SERVER_ERROR,
    };
  }
}

// =============================================================================
// TENANT CONTENT HELPERS
// =============================================================================

/**
 * Get tenant-scoped content with proper filtering
 * @param tenantId - The tenant ID to filter content for
 * @param tableName - The table to query
 * @param additionalFilters - Additional filters to apply
 * @returns Filtered content data
 */
export async function getTenantContent(
  tenantId: string,
  tableName: string,
  additionalFilters?: Record<string, string | number | boolean>,
): Promise<{ data: Record<string, unknown>[] | null; error?: string }> {
  try {
    const supabase = await createServerSupabaseClient();

    let query = supabase
      .from(tableName as keyof Database['public']['Tables'])
      .select('*')
      .eq('tenant_id', tenantId);

    // Apply additional filters
    if (additionalFilters !== undefined) {
      Object.entries(additionalFilters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }

    const { data, error } = await query;

    if (error !== null) {
      return { data: null, error: error.message };
    }

    return { data: data as Record<string, unknown>[] };
  } catch (error) {
    console.error('Error fetching tenant content:', error);
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Failed to fetch content',
    };
  }
}

// =============================================================================
// TENANT MEMBER HELPERS
// =============================================================================

/**
 * Check if a user is a member of a tenant
 * @param tenantId - The tenant ID to check
 * @param userId - The user ID to check (optional, defaults to current user)
 * @returns Whether the user is a member and their role
 */
export async function checkTenantMembership(
  tenantId: string,
  userId?: string,
): Promise<{ isMember: boolean; role: MemberRole | null; error?: string }> {
  try {
    const supabase = await createServerSupabaseClient();

    let targetUserId = userId;
    if (targetUserId === undefined || targetUserId === null) {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError !== null || user === null) {
        return {
          isMember: false,
          role: null,
          error: 'Authentication required',
        };
      }
      targetUserId = user.id;
    }

    const { data, error } = await supabase
      .from('tenant_members')
      .select('role')
      .eq('tenant_id', tenantId)
      .eq('user_id', targetUserId)
      .single();

    if (error !== null) {
      if (error.code === 'PGRST116') {
        // No rows found
        return { isMember: false, role: null };
      }
      return {
        isMember: false,
        role: null,
        error: error.message,
      };
    }

    return {
      isMember: true,
      role: data.role as MemberRole,
    };
  } catch (error) {
    console.error('Error checking tenant membership:', error);
    return {
      isMember: false,
      role: null,
      error:
        error instanceof Error ? error.message : 'Failed to check membership',
    };
  }
}

// =============================================================================
// RESPONSE HELPERS
// =============================================================================

/**
 * Create a standardized error response for tenant-related API endpoints
 */
export function createTenantErrorResponse(
  error: string,
  status: number = HTTP_BAD_REQUEST,
): NextResponse {
  return NextResponse.json(
    {
      error,
      timestamp: new Date().toISOString(),
    },
    { status },
  );
}

/**
 * Create a standardized success response for tenant-related API endpoints
 */
export function createTenantSuccessResponse<T>(
  data: T,
  status: number = HTTP_OK,
): NextResponse {
  return NextResponse.json(
    {
      data,
      timestamp: new Date().toISOString(),
    },
    { status },
  );
}

/**
 * Get tenant context including tenant info and user's role
 */
export async function getTenantContext(
  tenantId: string,
): Promise<Record<string, unknown> | null> {
  const supabase = await createServerSupabaseClient();

  // Use RPC function to get tenant context
  const { data: context, error } = await supabase.rpc('get_tenant_context', {
    target_tenant_id: tenantId,
  });

  if (error !== null) {
    throw error;
  }

  if (context === null) {
    return null;
  }

  // Check if user has access
  const accessCheck = await checkTenantAccess(tenantId);
  if (!accessCheck.hasAccess) {
    return null;
  }

  return {
    ...(context as Record<string, unknown>),
    user_role: accessCheck.userRole,
  };
}

/**
 * Get posts for a specific tenant with proper access control
 */
export async function getTenantPosts(
  tenantId: string,
): Promise<Record<string, unknown>[]> {
  const supabase = await createServerSupabaseClient();

  // Check access first
  const accessCheck = await checkTenantAccess(tenantId);
  if (!accessCheck.hasAccess) {
    throw new Error('Access denied to tenant');
  }

  const { data: posts, error } = await supabase
    .from('posts')
    .select(
      `
      *,
      author:users(id, username, full_name, avatar_url),
      collective:collectives(id, name, slug)
    `,
    )
    .eq('collective_id', tenantId);

  if (error !== null) {
    throw error;
  }

  return posts as Record<string, unknown>[];
}
