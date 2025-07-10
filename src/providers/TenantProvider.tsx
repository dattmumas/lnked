'use client';

import React, { useEffect, createContext, useContext, useMemo, useCallback } from 'react';

import { useTenantStore } from '@/stores/tenant-store';

// Note: `shallow` equality function import removed after refactor.
import type { Database } from '@/lib/database.types';

type Tenant = Database['public']['Tables']['tenants']['Row'];

interface TenantProviderProps {
  children: React.ReactNode;
  initialTenants?: Tenant[];
}

// Create a context to provide a stable canPerformAction function
const TenantActionContext = createContext<{
  canPerformAction: (action: 'read' | 'write' | 'admin' | 'manage') => boolean;
  isPersonalTenant: boolean;
} | null>(null);

export function TenantProvider({
  children,
  initialTenants,
}: TenantProviderProps) {
  // Select only the needed slices from the tenant store to prevent unnecessary re-renders
  const init = useTenantStore((state) => state.actions.init);
  const currentTenant = useTenantStore((state) => state.currentTenant);

  useEffect(() => {
    void init(initialTenants);
    /*
     * We intentionally wrap the init call in `void` to explicitly ignore the returned
     * Promise. The store's internal state management handles resolution, and awaiting
     * here would cause an unnecessary micro-task → render cycle.
     */
  }, [init, initialTenants]);

  const canPerformAction = useCallback((
    action: 'read' | 'write' | 'admin' | 'manage',
  ): boolean => {
    if (!currentTenant) return false;
    const { user_role } = currentTenant;
    switch (action) {
      case 'read':
        return ['member', 'editor', 'admin', 'owner'].includes(user_role);
      case 'write':
        return ['editor', 'admin', 'owner'].includes(user_role);
      case 'admin':
        return ['admin', 'owner'].includes(user_role);
      case 'manage':
        return user_role === 'owner';
      default:
        return false;
    }
  }, [currentTenant]);

  const isPersonalTenant = Boolean(currentTenant && currentTenant.type === 'personal');

  const contextValue = useMemo(() => ({
    canPerformAction,
    isPersonalTenant,
  }), [canPerformAction, isPersonalTenant]);

  return (
    <TenantActionContext.Provider value={contextValue}>
      {children}
    </TenantActionContext.Provider>
  );
}

export function useTenant() {
  return useTenantStore();
}

export function useTenantActions() {
  const context = useContext(TenantActionContext);
  if (!context) {
    throw new Error('useTenantActions must be used within a TenantProvider');
  }
  return context;
}
