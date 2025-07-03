// Server-Side Tenant Context Caching
// Reduces redundant database queries by caching tenant context, membership, and access data

import { unstable_cache } from 'next/cache';
import { cache } from 'react';

import { createServerSupabaseClient } from '@/lib/supabase/server';

import type { Database } from '@/lib/database.types';

// =============================================================================
// CACHE CONFIGURATION
// =============================================================================

// Cache durations (in seconds)
const TENANT_CONTEXT_CACHE_TTL = 300; // 5 minutes
const USER_TENANTS_CACHE_TTL = 600; // 10 minutes
const TENANT_ACCESS_CACHE_TTL = 180; // 3 minutes

// Cache tags for invalidation
export const CACHE_TAGS = {
  TENANT_CONTEXT: (tenantId: string, userId: string) =>
    `tenant-context:${tenantId}:${userId}`,
  USER_TENANTS: (userId: string) => `user-tenants:${userId}`,
  TENANT_ACCESS: (tenantId: string, userId: string) =>
    `tenant-access:${tenantId}:${userId}`,
  TENANT_MEMBERSHIP: (tenantId: string) => `tenant-membership:${tenantId}`,
  USER_ALL: (userId: string) => `user-all:${userId}`, // For bulk invalidation
} as const;

// =============================================================================
// TYPES (Aligned with database.types.ts)
// =============================================================================

// Exact types from database schema
type MemberRole = Database['public']['Enums']['member_role']; // 'owner' | 'admin' | 'editor' | 'member'
type TenantType = Database['public']['Enums']['tenant_type']; // 'personal' | 'collective'

// Cached tenant context - matches get_tenant_context RPC return
export interface CachedTenantContext {
  tenant_id: string;
  name: string;
  slug: string;
  type: TenantType;
  description?: string | null;
  is_public: boolean;
  user_role: MemberRole;
  member_count?: number | null;
  created_at: string;
}

// Cached user tenant - matches get_user_tenants RPC return structure
export interface CachedUserTenant {
  tenant_id: string;
  tenant_type: TenantType;
  tenant_name: string;
  tenant_slug: string;
  user_role: MemberRole;
  is_personal: boolean;
  member_count: number;
  is_public: boolean;
}

// Cached tenant access result
export interface CachedTenantAccess {
  hasAccess: boolean;
  userRole: MemberRole | null;
  error?: string;
}

// =============================================================================
// CORE CACHING FUNCTIONS
// =============================================================================

/**
 * Cached function to get tenant context for a user
 * Uses Next.js unstable_cache for persistence across requests
 */
export const getCachedTenantContext = unstable_cache(
  async (
    tenantId: string,
    userId: string,
  ): Promise<CachedTenantContext | null> => {
    const supabase = await createServerSupabaseClient();

    // Use RPC function to get tenant context
    const { data: context, error } = await supabase.rpc('get_tenant_context', {
      target_tenant_id: tenantId,
    });

    if (error || !context) {
      return null;
    }

     
    return context as unknown as CachedTenantContext;
  },
  ['tenant-context'],
  {
    revalidate: TENANT_CONTEXT_CACHE_TTL,
  },
);

/**
 * Cached function to get all tenants for a user
 * Uses Next.js unstable_cache for persistence across requests
 */
export const getCachedUserTenants = unstable_cache(
  async (userId: string): Promise<CachedUserTenant[]> => {
    const supabase = await createServerSupabaseClient();

    // Use RPC function to get user's tenants
    const { data: tenants, error } = await supabase.rpc('get_user_tenants', {
      target_user_id: userId,
    });

    if (error || !tenants) {
      return [];
    }

    // Map RPC result to our cached type (remove extra 'id' field and ensure type consistency)
    return tenants.map((tenant) => ({
      tenant_id: tenant.tenant_id,
      tenant_type: tenant.tenant_type,
      tenant_name: tenant.tenant_name,
      tenant_slug: tenant.tenant_slug,
      user_role: tenant.user_role,
      is_personal: tenant.is_personal,
      member_count: tenant.member_count,
      is_public: tenant.is_public,
    }));
  },
  ['user-tenants'],
  {
    revalidate: USER_TENANTS_CACHE_TTL,
  },
);

/**
 * Cached function to check tenant access for a user
 * Uses Next.js unstable_cache for persistence across requests
 */
export const getCachedTenantAccess = unstable_cache(
  async (
    tenantId: string,
    userId: string,
    requiredRole?: MemberRole,
  ): Promise<CachedTenantAccess> => {
    const supabase = await createServerSupabaseClient();

    try {
      // Check if user has access using RPC function
      const { data: hasAccess, error: accessError } = await supabase.rpc(
        'user_has_tenant_access',
        {
          target_tenant_id: tenantId,
          required_role: (requiredRole ||
            'member'),
        },
      );

      if (accessError) {
        return {
          hasAccess: false,
          userRole: null,
          error: 'Failed to check tenant access',
        };
      }

      if (!hasAccess) {
        return {
          hasAccess: false,
          userRole: null,
          error: 'No access to this tenant',
        };
      }

      // Get user's role in the tenant
      const { data: memberData, error: memberError } = await supabase
        .from('tenant_members')
        .select('role')
        .eq('tenant_id', tenantId)
        .eq('user_id', userId)
        .single();

      if (memberError || !memberData) {
        return {
          hasAccess: false,
          userRole: null,
          error: 'Failed to get user role',
        };
      }

      return {
        hasAccess: true,
        userRole: memberData.role,
      };
    } catch {
      return {
        hasAccess: false,
        userRole: null,
        error: 'Internal error checking access',
      };
    }
  },
  ['tenant-access'],
  {
    revalidate: TENANT_ACCESS_CACHE_TTL,
  },
);

/**
 * In-request cache for tenant membership (using React cache)
 * This is lighter weight for data that doesn't need to persist across requests
 */
export const getCachedTenantMembership = cache(
  async (
    tenantId: string,
  ): Promise<
    Array<{
      user_id: string;
      role: MemberRole;
      joined_at: string | null;
    }>
  > => {
    const supabase = await createServerSupabaseClient();

    const { data: members, error } = await supabase
      .from('tenant_members')
      .select('user_id, role, joined_at')
      .eq('tenant_id', tenantId);

    if (error || !members) {
      return [];
    }

    return members.map((member) => ({
      user_id: member.user_id,
      role: member.role,
      joined_at: member.joined_at,
    }));
  },
);

// =============================================================================
// BATCH OPERATIONS
// =============================================================================

/**
 * Batch fetch tenant contexts for multiple tenants
 * More efficient than individual requests
 */
export const batchGetTenantContexts = async (
  tenantIds: string[],
  userId: string,
): Promise<Record<string, CachedTenantContext | null>> => {
  // Try to get from cache first
  const results: Record<string, CachedTenantContext | null> = {};

  // Check cache for each tenant
  for (const tenantId of tenantIds) {
    try {
      const cached = await getCachedTenantContext(tenantId, userId);
      results[tenantId] = cached;
    } catch {
      results[tenantId] = null;
    }
  }

  return results;
};

/**
 * Optimized function to get user's current tenant context
 * First checks user's tenant list, then gets specific context
 */
export const getUserCurrentTenantContext = async (
  userId: string,
  currentTenantId?: string,
): Promise<{
  currentTenant: CachedTenantContext | null;
  availableTenants: CachedUserTenant[];
  personalTenant: CachedUserTenant | null;
}> => {
  // Get user's available tenants (cached)
  const availableTenants = await getCachedUserTenants(userId);

  // Find personal tenant
  const personalTenant = availableTenants.find((t) => t.is_personal) || null;

  // Determine current tenant ID (fallback to personal)
  const targetTenantId = currentTenantId || personalTenant?.tenant_id;

  let currentTenant: CachedTenantContext | null = null;
  if (targetTenantId) {
    currentTenant = await getCachedTenantContext(targetTenantId, userId);
  }

  return {
    currentTenant,
    availableTenants,
    personalTenant,
  };
};

// =============================================================================
// CACHE INVALIDATION
// =============================================================================

/**
 * Invalidate all tenant-related cache for a user
 * Call this when user's tenant membership changes
 */
export async function invalidateUserTenantCache(userId: string): Promise<void> {
  const { revalidateTag } = await import('next/cache');

  // Invalidate all user-related tenant cache
  revalidateTag(CACHE_TAGS.USER_ALL(userId));
  revalidateTag(CACHE_TAGS.USER_TENANTS(userId));
}

/**
 * Invalidate tenant context cache for a specific tenant
 * Call this when tenant settings/info changes
 */
export async function invalidateTenantContextCache(
  tenantId: string,
): Promise<void> {
  const { revalidateTag } = await import('next/cache');

  revalidateTag(CACHE_TAGS.TENANT_MEMBERSHIP(tenantId));

  // Note: We'd need to track which users have access to this tenant
  // to invalidate their specific context cache. For simplicity,
  // we could add a global tenant cache tag that gets invalidated
}

/**
 * Invalidate tenant access cache for a user-tenant pair
 * Call this when user's role in a tenant changes
 */
export async function invalidateTenantAccessCache(
  tenantId: string,
  userId: string,
): Promise<void> {
  const { revalidateTag } = await import('next/cache');

  revalidateTag(CACHE_TAGS.TENANT_ACCESS(tenantId, userId));
  revalidateTag(CACHE_TAGS.TENANT_CONTEXT(tenantId, userId));
}

/**
 * Invalidate all caches when a user joins or leaves a tenant
 * This is the most comprehensive invalidation for membership changes
 */
export async function invalidateTenantMembershipChange(
  tenantId: string,
  userId: string,
): Promise<void> {
  await Promise.all([
    invalidateUserTenantCache(userId),
    invalidateTenantAccessCache(tenantId, userId),
    invalidateTenantContextCache(tenantId),
  ]);
}

// =============================================================================
// CACHE WARMING
// =============================================================================

/**
 * Pre-warm cache for a user's tenant context
 * Call this after login or when user switches tenants
 */
export async function warmUserTenantCache(userId: string): Promise<void> {
  try {
    // Pre-fetch user's tenants
    const tenants = await getCachedUserTenants(userId);

    // Pre-fetch context for personal tenant
    const personalTenant = tenants.find((t) => t.is_personal);
    if (personalTenant) {
      await getCachedTenantContext(personalTenant.tenant_id, userId);
    }

    // Pre-fetch access for active tenants (limit to avoid overload)
    const activeTenants = tenants.slice(0, 3); // Warm top 3 tenants
    await Promise.all(
      activeTenants.map((tenant) =>
        getCachedTenantAccess(tenant.tenant_id, userId, 'member'),
      ),
    );
  } catch (error) {
    // Cache warming is best-effort, don't throw
    console.warn('Failed to warm tenant cache for user:', userId, error);
  }
}

// =============================================================================
// CACHED WRAPPER FUNCTIONS (Compatible with tenant-helpers.ts)
// =============================================================================

/**
 * Cached version of checkTenantAccess from tenant-helpers.ts
 * Provides the same interface but with caching for better performance
 */
export async function checkTenantAccessCached(
  tenantId: string,
  requiredRole?: MemberRole,
): Promise<{
  hasAccess: boolean;
  userRole: MemberRole | null;
  error?: string;
}> {
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

    // Use cached tenant access check
    const cachedResult = await getCachedTenantAccess(
      tenantId,
      user.id,
      requiredRole,
    );

    const result: {
      hasAccess: boolean;
      userRole: MemberRole | null;
      error?: string;
    } = {
      hasAccess: cachedResult.hasAccess,
      userRole: cachedResult.userRole,
    };

    if (cachedResult.error !== undefined) {
      result.error = cachedResult.error;
    }

    return result;
  } catch (error) {
    console.error('Error checking tenant access (cached):', error);
    return {
      hasAccess: false,
      userRole: null,
      error: 'Internal server error',
    };
  }
}

/**
 * Cached version of getTenantContext from tenant-helpers.ts
 * Provides the same interface but with caching for better performance
 */
export async function getTenantContextCached(
  tenantId: string,
): Promise<Record<string, unknown> | null> {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError !== null || user === null) {
      return null;
    }

    // Use cached tenant context
    const context = await getCachedTenantContext(tenantId, user.id);

    if (!context) {
      return null;
    }

    // Check if user has access (also cached)
    const accessCheck = await checkTenantAccessCached(tenantId);
    if (!accessCheck.hasAccess) {
      return null;
    }

    // Convert to the same format as the original function
    return {
      tenant_id: context.tenant_id,
      name: context.name,
      slug: context.slug,
      type: context.type,
      description: context.description,
      is_public: context.is_public,
      member_count: context.member_count,
      created_at: context.created_at,
      user_role: context.user_role,
    };
  } catch (error) {
    console.error('Error getting tenant context (cached):', error);
    return null;
  }
}

/**
 * Cached function to get user's available tenants
 * Optimized version for getting all tenants user has access to
 */
export async function getUserTenantsCached(): Promise<
  CachedUserTenant[] | null
> {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError !== null || user === null) {
      return null;
    }

    // Use cached user tenants
    const tenants = await getCachedUserTenants(user.id);
    return tenants;
  } catch (error) {
    console.error('Error getting user tenants (cached):', error);
    return null;
  }
}

/**
 * Cached version of checkTenantMembership from tenant-helpers.ts
 * Provides the same interface but with caching for better performance
 */
export async function checkTenantMembershipCached(
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

    // Use cached tenant access (with member as minimum role)
    const cachedAccess = await getCachedTenantAccess(
      tenantId,
      targetUserId,
      'member',
    );

    const result: {
      isMember: boolean;
      role: MemberRole | null;
      error?: string;
    } = {
      isMember: cachedAccess.hasAccess,
      role: cachedAccess.userRole,
    };

    if (cachedAccess.error !== undefined) {
      result.error = cachedAccess.error;
    }

    return result;
  } catch (error) {
    console.error('Error checking tenant membership (cached):', error);
    return {
      isMember: false,
      role: null,
      error:
        error instanceof Error ? error.message : 'Failed to check membership',
    };
  }
}

// Functions are exported inline above
