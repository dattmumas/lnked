// User Tenants Management Hook
// Provides access to all tenants a user belongs to

'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, useCallback, useMemo } from 'react';

import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { UserTenantsResponse } from '@/types/tenant.types';

export interface UseUserTenantsReturn {
  tenants: UserTenantsResponse[];
  currentTenant: UserTenantsResponse | null;
  personalTenant: UserTenantsResponse | null;
  collectiveTenants: UserTenantsResponse[];
  isLoading: boolean;
  error: string | null;
  refreshTenants: () => Promise<void>;
  setCurrentTenantId: (tenantId: string | null) => void;
}

/**
 * Hook to get all tenants that the current user belongs to
 * @returns User tenants, loading state, and refresh function
 */
export function useUserTenants(userId?: string): UseUserTenantsReturn {
  const [currentTenantId, setCurrentTenantId] = useState<string | null>(userId ?? null);
  const queryClient = useQueryClient();

  const {
    data: tenants = [],
    isLoading,
    isError,
    error,
  } = useQuery<UserTenantsResponse[], Error>({
    queryKey: ['user-tenants', userId],
    queryFn: async () => {
      if (!userId) return [];
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase.rpc('get_user_tenants');
      if (error) throw error;
      // The RPC returns a different shape, let's map it to have an 'id' for consistency
      return (data || []).map(t => ({ ...t, id: t.tenant_id }));
    },
    enabled: Boolean(userId),
  });

  const { personalTenant, collectiveTenants } = useMemo(() => {
    const personal = tenants.find(t => t.is_personal) ?? null;
    const collectives = tenants.filter(t => !t.is_personal);
    return { personalTenant: personal, collectiveTenants: collectives };
  }, [tenants]);

  const currentTenant = useMemo(() => {
    return tenants.find(t => t.tenant_id === currentTenantId) ?? personalTenant;
  }, [tenants, currentTenantId, personalTenant]);

  useEffect(() => {
    if (!currentTenantId && personalTenant) {
      setCurrentTenantId(personalTenant.tenant_id);
    }
  }, [personalTenant, currentTenantId]);

  return {
    tenants,
    personalTenant,
    collectiveTenants,
    currentTenant,
    isLoading,
    error: isError ? error.message : null,
    refreshTenants: () =>
      queryClient.invalidateQueries({ queryKey: ['user-tenants', userId] }),
    setCurrentTenantId,
  };
}

/**
 * Hook to create a new collective tenant
 * @returns Create function and loading state
 */
export function useCreateCollective(): {
  createCollective: (data: {
    name: string;
    slug: string;
    description?: string;
    is_public?: boolean;
  }) => Promise<string>;
  isCreating: boolean;
  error: string | null;
} {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createCollective = useCallback(async (data: {
    name: string;
    slug: string;
    description?: string;
    is_public?: boolean;
  }): Promise<string> => {
    try {
      setIsCreating(true);
      setError(null);

      const supabase = createSupabaseBrowserClient();

      const { data: tenantId, error: createError } = await supabase
        .rpc('create_collective_tenant', {
          tenant_name: data.name,
          tenant_slug: data.slug,
          // @ts-expect-error tenant-migration: null vs undefined type mismatch will be resolved
          tenant_description: data.description || null,
          is_public: data.is_public ?? true,
        });

      if (createError) {
        throw createError;
      }

      if (!tenantId) {
        throw new Error('Failed to create collective');
      }

      return tenantId;

    } catch (err) {
      console.error('Error creating collective:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create collective';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsCreating(false);
    }
  }, []);

  return {
    createCollective,
    isCreating,
    error,
  };
}

/**
 * Hook to switch between tenants (for UI state management)
 * @returns Current tenant ID, switch function, and available tenants
 */
export function useTenantSwitcher(): {
  currentTenantId: string | null;
  switchTenant: (tenantId: string) => void;
  availableTenants: UserTenantsResponse[];
  isLoading: boolean;
} {
  const [currentTenantId, setCurrentTenantId] = useState<string | null>(null);
  const { tenants, personalTenant, isLoading } = useUserTenants();

  // Initialize with personal tenant if available
  useEffect(() => {
    if (!currentTenantId && personalTenant) {
      setCurrentTenantId(personalTenant.tenant_id);
    }
  }, [currentTenantId, personalTenant]);

  const switchTenant = useCallback((tenantId: string) => {
    setCurrentTenantId(tenantId);
  }, []);

  return {
    currentTenantId,
    switchTenant,
    availableTenants: tenants,
    isLoading,
  };
} 