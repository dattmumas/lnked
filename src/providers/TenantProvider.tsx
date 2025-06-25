// Tenant Context Provider
// Provides app-wide tenant state management and switching functionality

'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';

import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

import type { Database } from '@/lib/database.types';

type TenantType = Database['public']['Tables']['tenants']['Row'];
type UserRole = Database['public']['Enums']['member_role'];

interface TenantContext {
  id: string;
  name: string;
  slug: string;
  type: 'personal' | 'collective';
  description?: string;
  is_public: boolean;
  user_role: UserRole;
  member_count?: number;
}

interface TenantContextType {
  // Current tenant state
  currentTenantId: string | null;
  currentTenant: TenantContext | null;

  // Available tenants
  userTenants: TenantType[];
  personalTenant: TenantType | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  switchTenant: (tenantId: string) => Promise<void>;
  refreshTenants: () => Promise<void>;
  refreshCurrentTenant: () => Promise<void>;

  // Utilities
  canPerformAction: (action: 'read' | 'write' | 'admin' | 'manage') => boolean;
  isPersonalTenant: boolean;
}

const TenantContext = createContext<TenantContextType | null>(null);

interface TenantProviderProps {
  children: React.ReactNode;
  initialTenantId?: string;
}

export function TenantProvider({
  children,
  initialTenantId,
}: TenantProviderProps): React.JSX.Element {
  const [currentTenantId, setCurrentTenantId] = useState<string | null>(
    initialTenantId || null,
  );
  const [currentTenant, setCurrentTenant] = useState<TenantContext | null>(
    null,
  );
  const [userTenants, setUserTenants] = useState<TenantType[]>([]);
  const [personalTenant, setPersonalTenant] = useState<TenantType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createSupabaseBrowserClient();

  // Fetch all user tenants
  const refreshTenants = useCallback(async (): Promise<void> => {
    try {
      setError(null);

      // Get user's tenants using the RPC
      const { data: tenants, error: tenantsError } =
        await supabase.rpc('get_user_tenants');

      if (tenantsError) {
        throw new Error(`Failed to fetch tenants: ${tenantsError.message}`);
      }

      if (!tenants || tenants.length === 0) {
        setError('No tenants found for user');
        return;
      }

      // Transform RPC result to tenant format
      const transformedTenants: TenantType[] = tenants.map((t: any) => ({
        id: t.tenant_id,
        name: t.tenant_name,
        slug: t.tenant_slug,
        type: t.tenant_type,
        description: t.tenant_description,
        is_public: t.is_public,
        logo_url: t.logo_url,
        cover_image_url: t.cover_image_url,
        settings: t.settings || {},
        created_at: t.created_at,
        updated_at: t.updated_at,
        deleted_at: null,
        member_count: t.member_count || 0,
      }));

      setUserTenants(transformedTenants);

      // Find personal tenant
      const personal = transformedTenants.find((t) => t.type === 'personal');
      setPersonalTenant(personal || null);

      // If no current tenant is set, default to personal tenant
      if (!currentTenantId && personal) {
        setCurrentTenantId(personal.id);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch tenants';
      setError(errorMessage);
      console.error('Error fetching user tenants:', err);
    }
  }, [supabase, currentTenantId]);

  // Fetch current tenant context and user role
  const refreshCurrentTenant = useCallback(async (): Promise<void> => {
    if (!currentTenantId) {
      setCurrentTenant(null);
      return;
    }

    try {
      setError(null);

      // Get tenant context using RPC
      const { data: tenantContext, error: contextError } = await supabase.rpc(
        'get_tenant_context',
        {
          target_tenant_id: currentTenantId,
        },
      );

      if (contextError) {
        throw new Error(
          `Failed to fetch tenant context: ${contextError.message}`,
        );
      }

      if (!tenantContext) {
        throw new Error('No tenant context returned');
      }

      // Transform to our context format (cast to any for RPC response)
      const tenantData = tenantContext as any;
      const context: TenantContext = {
        id: tenantData.id,
        name: tenantData.name,
        slug: tenantData.slug,
        type: tenantData.type,
        description: tenantData.description,
        is_public: tenantData.is_public,
        user_role: tenantData.user_role,
        member_count: tenantData.member_count,
      };

      setCurrentTenant(context);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch tenant context';
      setError(errorMessage);
      console.error('Error fetching tenant context:', err);

      // If we can't access this tenant, fall back to personal tenant
      if (personalTenant && currentTenantId !== personalTenant.id) {
        setCurrentTenantId(personalTenant.id);
      }
    }
  }, [currentTenantId, supabase, personalTenant]);

  // Switch to a different tenant
  const switchTenant = useCallback(
    async (tenantId: string): Promise<void> => {
      if (tenantId === currentTenantId) {
        return; // Already on this tenant
      }

      // Verify user has access to this tenant
      const targetTenant = userTenants.find((t) => t.id === tenantId);
      if (!targetTenant) {
        throw new Error('No access to this tenant');
      }

      setCurrentTenantId(tenantId);
    },
    [currentTenantId, userTenants],
  );

  // Check if user can perform an action in current tenant
  const canPerformAction = useCallback(
    (action: 'read' | 'write' | 'admin' | 'manage'): boolean => {
      if (!currentTenant) {
        return false;
      }

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
    },
    [currentTenant],
  );

  // Check if current tenant is personal
  const isPersonalTenant = Boolean(
    currentTenant && personalTenant && currentTenant.id === personalTenant.id,
  );

  // Initialize tenants on mount
  useEffect(() => {
    const initializeTenants = async (): Promise<void> => {
      setIsLoading(true);
      try {
        await refreshTenants();
      } finally {
        setIsLoading(false);
      }
    };

    void initializeTenants();
  }, [refreshTenants]);

  // Refresh current tenant when currentTenantId changes
  useEffect(() => {
    if (currentTenantId && userTenants.length > 0) {
      void refreshCurrentTenant();
    }
  }, [currentTenantId, refreshCurrentTenant, userTenants.length]);

  const value: TenantContextType = {
    currentTenantId,
    currentTenant,
    userTenants,
    personalTenant,
    isLoading,
    error,
    switchTenant,
    refreshTenants,
    refreshCurrentTenant,
    canPerformAction,
    isPersonalTenant,
  };

  return (
    <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
  );
}

// Hook to use tenant context
export function useTenant(): TenantContextType {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}

// Hook for tenant switching with error handling
export function useTenantSwitcher() {
  const { switchTenant, userTenants, currentTenantId, personalTenant } =
    useTenant();
  const [isSwitching, setIsSwitching] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);

  const handleSwitchTenant = useCallback(
    async (tenantId: string): Promise<void> => {
      if (isSwitching) {
        return;
      }

      setIsSwitching(true);
      setSwitchError(null);

      try {
        await switchTenant(tenantId);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to switch tenant';
        setSwitchError(errorMessage);
        console.error('Error switching tenant:', err);
      } finally {
        setIsSwitching(false);
      }
    },
    [switchTenant, isSwitching],
  );

  const switchToPersonal = useCallback(async (): Promise<void> => {
    if (personalTenant) {
      await handleSwitchTenant(personalTenant.id);
    }
  }, [personalTenant, handleSwitchTenant]);

  return {
    switchTenant: handleSwitchTenant,
    switchToPersonal,
    availableTenants: userTenants,
    currentTenantId,
    isSwitching,
    switchError,
  };
}

// Hook for tenant access validation
export function useTenantAccess(requiredRole?: UserRole) {
  const { currentTenant, canPerformAction } = useTenant();

  const hasAccess = useCallback(
    (role?: UserRole): boolean => {
      if (!currentTenant) {
        return false;
      }

      if (!role) {
        return canPerformAction('read');
      }

      const roleHierarchy: UserRole[] = ['member', 'editor', 'admin', 'owner'];
      const currentRoleIndex = roleHierarchy.indexOf(currentTenant.user_role);
      const requiredRoleIndex = roleHierarchy.indexOf(role);

      return currentRoleIndex >= requiredRoleIndex;
    },
    [currentTenant, canPerformAction],
  );

  const accessLevel = currentTenant?.user_role || null;
  const canRead = canPerformAction('read');
  const canWrite = canPerformAction('write');
  const canAdmin = canPerformAction('admin');
  const canManage = canPerformAction('manage');

  return {
    hasAccess: hasAccess(requiredRole),
    accessLevel,
    canRead,
    canWrite,
    canAdmin,
    canManage,
    tenant: currentTenant,
  };
}
