// Tenant Management Hook
// Provides access to current tenant context and user permissions

'use client';

import { useEffect, useState } from 'react';

import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

import type {
  Tenant,
  MemberRole,
  TenantPermissions,
  UseTenantReturn,
  TenantContextResponse,
} from '@/types/tenant.types';

/**
 * Hook to get tenant information and user permissions
 * @param tenantId - The tenant ID to get information for
 * @returns Tenant data, user role, permissions, and loading state
 */
export function useTenant(tenantId: string | null): UseTenantReturn {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [userRole, setUserRole] = useState<MemberRole | null>(null);
  const [permissions, setPermissions] = useState<TenantPermissions>({
    canRead: false,
    canWrite: false,
    canEdit: false,
    canDelete: false,
    canManageMembers: false,
    canManageSettings: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId) {
      setTenant(null);
      setUserRole(null);
      setPermissions({
        canRead: false,
        canWrite: false,
        canEdit: false,
        canDelete: false,
        canManageMembers: false,
        canManageSettings: false,
      });
      setIsLoading(false);
      return;
    }

    const fetchTenantData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const supabase = createSupabaseBrowserClient();

        // Get tenant context (includes user role)
        const { data: contextData, error: contextError } = await supabase.rpc(
          'get_tenant_context',
          { target_tenant_id: tenantId },
        );

        if (contextError) {
          throw contextError;
        }

        if (!contextData) {
          throw new Error('Tenant not found or access denied');
        }

        const context = contextData as unknown as TenantContextResponse;

        // Set tenant data
        const tenantData: Tenant = {
          id: context.tenant_id,
          type: context.type,
          name: context.name,
          slug: context.slug,
          description: context.description,
          is_public: context.is_public,
          member_count: context.member_count,
          created_at: context.created_at,
          updated_at: context.created_at, // Using created_at as fallback
        };

        setTenant(tenantData);
        setUserRole(context.user_role);

        // Calculate permissions based on role
        const calculatedPermissions = calculatePermissions(
          context.user_role,
          context.type,
        );
        setPermissions(calculatedPermissions);
      } catch (err) {
        console.error('Error fetching tenant data:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to fetch tenant data',
        );
        setTenant(null);
        setUserRole(null);
        setPermissions({
          canRead: false,
          canWrite: false,
          canEdit: false,
          canDelete: false,
          canManageMembers: false,
          canManageSettings: false,
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchTenantData();
  }, [tenantId]);

  return {
    tenant,
    userRole,
    permissions,
    isLoading,
    error,
  };
}

/**
 * Calculate user permissions based on role and tenant type
 */
function calculatePermissions(
  role: MemberRole,
  tenantType: 'personal' | 'collective',
): TenantPermissions {
  const basePermissions = {
    canRead: false,
    canWrite: false,
    canEdit: false,
    canDelete: false,
    canManageMembers: false,
    canManageSettings: false,
  };

  // No role means no permissions
  if (!role) {
    return basePermissions;
  }

  switch (role) {
    case 'owner':
      return {
        canRead: true,
        canWrite: true,
        canEdit: true,
        canDelete: true,
        canManageMembers: true,
        canManageSettings: true,
      };

    case 'admin':
      return {
        canRead: true,
        canWrite: true,
        canEdit: true,
        canDelete: true,
        canManageMembers: true,
        canManageSettings: tenantType === 'personal', // Only personal tenant settings
      };

    case 'editor':
      return {
        canRead: true,
        canWrite: true,
        canEdit: true,
        canDelete: false,
        canManageMembers: false,
        canManageSettings: false,
      };

    case 'member':
      return {
        canRead: true,
        canWrite: true,
        canEdit: false,
        canDelete: false,
        canManageMembers: false,
        canManageSettings: false,
      };

    default:
      return basePermissions;
  }
}

/**
 * Hook to check if user has specific access to a tenant
 * @param tenantId - The tenant ID to check access for
 * @param requiredRole - The minimum role required (defaults to 'member')
 * @returns Boolean indicating if user has access and loading state
 */
export function useTenantAccess(
  tenantId: string | null,
  requiredRole: MemberRole = 'member',
): { hasAccess: boolean; isLoading: boolean; error: string | null } {
  const [hasAccess, setHasAccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId) {
      setHasAccess(false);
      setIsLoading(false);
      return;
    }

    const checkAccess = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const supabase = createSupabaseBrowserClient();

        const { data, error: accessError } = await supabase.rpc(
          'user_has_tenant_access',
          {
            target_tenant_id: tenantId,
            required_role: requiredRole,
          },
        );

        if (accessError) {
          throw accessError;
        }

        setHasAccess(Boolean(data));
      } catch (err) {
        console.error('Error checking tenant access:', err);
        setError(err instanceof Error ? err.message : 'Failed to check access');
        setHasAccess(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAccess();
  }, [tenantId, requiredRole]);

  return { hasAccess, isLoading, error };
}

/**
 * Hook to get user's personal tenant
 * @returns Personal tenant ID and loading state
 */
export function usePersonalTenant(): {
  personalTenantId: string | null;
  isLoading: boolean;
  error: string | null;
} {
  const [personalTenantId, setPersonalTenantId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPersonalTenant = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const supabase = createSupabaseBrowserClient();

        const { data, error: tenantError } = await supabase.rpc(
          'get_user_personal_tenant',
        );

        if (tenantError) {
          throw tenantError;
        }

        setPersonalTenantId(data);
      } catch (err) {
        console.error('Error fetching personal tenant:', err);
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to fetch personal tenant',
        );
        setPersonalTenantId(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPersonalTenant();
  }, []);

  return { personalTenantId, isLoading, error };
}
