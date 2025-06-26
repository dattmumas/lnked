// User Tenants Management Hook
// Provides access to all tenants a user belongs to

'use client';

import { useEffect, useState, useCallback } from 'react';

import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

import type { UserTenantsResponse } from '@/types/tenant.types';

/**
 * Hook to get all tenants that the current user belongs to
 * @returns User tenants, loading state, and refresh function
 */
export function useUserTenants(): {
  tenants: UserTenantsResponse[];
  personalTenant: UserTenantsResponse | null;
  collectiveTenants: UserTenantsResponse[];
  isLoading: boolean;
  error: string | null;
  refreshTenants: () => Promise<void>;
} {
  const [tenants, setTenants] = useState<UserTenantsResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTenants = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const supabase = createSupabaseBrowserClient();

      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Authentication required');
      }

  

      // Use the RPC function to get user tenants (this bypasses RLS issues)
      const { data: tenantData, error: tenantError } = await supabase
        .rpc('get_user_tenants');

      console.log('📡 RPC response:', { tenantData, tenantError });

      if (tenantError) {
        console.error('❌ RPC error:', tenantError);
        throw tenantError;
      }

      // The RPC function returns data in the correct format already
      const transformedTenants: UserTenantsResponse[] = tenantData || [];

      console.log('📋 Fetched tenants:', transformedTenants);
      setTenants(transformedTenants);

    } catch (err) {
      console.error('Error fetching user tenants:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch tenants');
      setTenants([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  // Derived data
  const personalTenant = tenants.find(t => t.is_personal) || null;
  const collectiveTenants = tenants.filter(t => !t.is_personal);

  return {
    tenants,
    personalTenant,
    collectiveTenants,
    isLoading,
    error,
    refreshTenants: fetchTenants,
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