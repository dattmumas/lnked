// Tenant Context Provider
// Provides app-wide tenant state management and switching functionality

'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react';

import { useUserTenants } from '@/hooks/useUserTenants';

import type { UserTenantsResponse } from '@/types/tenant.types';

// =============================================================================
// CONTEXT TYPES
// =============================================================================

interface TenantContextValue {
  // Current tenant state
  currentTenant: UserTenantsResponse | null;
  currentTenantId: string | null;

  // All user tenants
  userTenants: UserTenantsResponse[];
  personalTenant: UserTenantsResponse | null;
  collectiveTenants: UserTenantsResponse[];

  // Actions
  switchTenant: (tenantId: string) => void;
  refreshTenants: () => Promise<void>;

  // Loading states
  isLoading: boolean;
  error: string | null;
}

// =============================================================================
// CONTEXT CREATION
// =============================================================================

const TenantContext = createContext<TenantContextValue | null>(null);

const STORAGE_KEY = 'lnked_current_tenant_id';

// =============================================================================
// PROVIDER COMPONENT
// =============================================================================

interface TenantProviderProps {
  children: React.ReactNode;
  initialTenantId?: string;
}

export function TenantProvider({
  children,
  initialTenantId,
}: TenantProviderProps): React.JSX.Element {
  const {
    tenants,
    personalTenant,
    collectiveTenants,
    isLoading,
    error,
    refreshTenants,
  } = useUserTenants();
  const [currentTenantId, setCurrentTenantId] = useState<string | null>(
    initialTenantId !== null && initialTenantId !== undefined
      ? initialTenantId
      : null,
  );

  // Initialize current tenant from localStorage or default to personal tenant
  useEffect(() => {
    if (isLoading) return;

    // Check if user needs onboarding (no tenants available)
    if (
      tenants.length === 0 &&
      personalTenant === null &&
      personalTenant === undefined &&
      !isLoading
    ) {
      // User might need onboarding - this will be handled by the auth system
      // For now, we'll wait for tenants to be available
      return;
    }

    // If we already have a current tenant, don't change it
    if (
      currentTenantId !== null &&
      currentTenantId !== undefined &&
      tenants.find((t) => t.tenant_id === currentTenantId)
    ) {
      return;
    }

    let targetTenantId: string | null = null;

    // 1. Try initial prop
    if (
      initialTenantId !== null &&
      initialTenantId !== undefined &&
      tenants.find((t) => t.tenant_id === initialTenantId)
    ) {
      targetTenantId = initialTenantId;
    }
    // 2. Try localStorage
    else if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (
        stored !== null &&
        stored !== undefined &&
        tenants.find((t) => t.tenant_id === stored)
      ) {
        targetTenantId = stored;
      }
    }

    // 3. Default to personal tenant (this should be the fallback)
    if (
      (targetTenantId === null || targetTenantId === undefined) &&
      personalTenant !== null &&
      personalTenant !== undefined
    ) {
      targetTenantId = personalTenant.tenant_id;
    }
    // 4. Fallback to first available tenant
    else if (
      (targetTenantId === null || targetTenantId === undefined) &&
      tenants.length > 0
    ) {
      targetTenantId = tenants[0].tenant_id;
    }

    if (
      targetTenantId !== null &&
      targetTenantId !== undefined &&
      targetTenantId !== currentTenantId
    ) {
      setCurrentTenantId(targetTenantId);
    }
  }, [tenants, personalTenant, isLoading, currentTenantId, initialTenantId]);

  // Switch tenant function
  const switchTenant = useCallback(
    (tenantId: string) => {
      const tenant = tenants.find((t) => t.tenant_id === tenantId);
      if (tenant === null || tenant === undefined) {
        return;
      }

      setCurrentTenantId(tenantId);

      // Persist to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, tenantId);
      }

      // Optional: Navigate based on tenant type
      // This could be customized based on your routing strategy
      if (tenant.is_personal) {
        // Stay on current page or navigate to personal dashboard
      } else {
        // Could navigate to collective dashboard
        // router.push(`/collectives/${tenant.tenant_slug}`);
      }
    },
    [tenants],
  );

  // Get current tenant object
  const currentTenant = useMemo(() => {
    if (currentTenantId === null || currentTenantId === undefined) return null;
    return tenants.find((t) => t.tenant_id === currentTenantId) || null;
  }, [tenants, currentTenantId]);

  // Context value
  const contextValue = useMemo<TenantContextValue>(
    () => ({
      currentTenant,
      currentTenantId,
      userTenants: tenants,
      personalTenant,
      collectiveTenants,
      switchTenant,
      refreshTenants,
      isLoading,
      error,
    }),
    [
      currentTenant,
      currentTenantId,
      tenants,
      personalTenant,
      collectiveTenants,
      switchTenant,
      refreshTenants,
      isLoading,
      error,
    ],
  );

  return (
    <TenantContext.Provider value={contextValue}>
      {children}
    </TenantContext.Provider>
  );
}

// =============================================================================
// HOOK FOR CONSUMING CONTEXT
// =============================================================================

export function useTenantContext(): TenantContextValue {
  const context = useContext(TenantContext);
  if (context === null || context === undefined) {
    throw new Error('useTenantContext must be used within a TenantProvider');
  }
  return context;
}

// =============================================================================
// CONVENIENCE HOOKS
// =============================================================================

/**
 * Hook to get just the current tenant
 */
export function useCurrentTenant(): UserTenantsResponse | null {
  const { currentTenant } = useTenantContext();
  return currentTenant;
}

/**
 * Hook to check if user is in a specific tenant
 */
export function useIsInTenant(tenantId: string): boolean {
  const { currentTenantId } = useTenantContext();
  return currentTenantId === tenantId;
}

/**
 * Hook to check if current tenant is personal
 */
export function useIsPersonalTenant(): boolean {
  const { currentTenant } = useTenantContext();
  return currentTenant?.is_personal ?? false;
}

/**
 * Hook to get tenant switching function
 */
export function useTenantSwitcher(): {
  switchTenant: (tenantId: string) => void;
  availableTenants: UserTenantsResponse[];
  currentTenantId: string | null;
  isLoading: boolean;
} {
  const { switchTenant, userTenants, currentTenantId, isLoading } =
    useTenantContext();
  return {
    switchTenant,
    availableTenants: userTenants,
    currentTenantId,
    isLoading,
  };
}

// Export types for external use
export type { TenantContextValue };
