// Tenant Context Provider
// Provides app-wide tenant state management and switching functionality

'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from 'react';

import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

import type { Database } from '@/lib/database.types';

type TenantType = Database['public']['Tables']['tenants']['Row'];
type UserRole = Database['public']['Enums']['member_role'];

interface TenantContext {
  id: string;
  tenant_id: string; // Alias for id for backward compatibility
  name: string;
  tenant_name: string; // Alias for name for backward compatibility
  slug: string;
  tenant_slug: string; // Alias for slug for backward compatibility
  type: 'personal' | 'collective';
  tenant_type: 'personal' | 'collective'; // Alias for type for backward compatibility
  description?: string;
  is_public: boolean;
  is_personal: boolean; // Computed from type === 'personal'
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
  collectiveTenants: TenantType[];
  isLoading: boolean;
  error: string | null;

  // Actions
  switchTenant: (tenantId: string) => Promise<void>;
  switchToPersonal: () => Promise<void>;
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

// Define proper types for global cache
interface GlobalTenantCache {
  tenants: unknown;
  currentTenant: unknown;
  currentTenantId: string | null;
}

interface GlobalInflightPromises {
  tenants: Promise<void> | null;
  currentTenant: Promise<void> | null;
}

// Use proper type for globalThis with our extensions
declare global {
  // eslint-disable-next-line no-var
  var __tenant_provider_cache__: GlobalTenantCache | undefined;
  // eslint-disable-next-line no-var
  var __tenant_provider_inflight__: GlobalInflightPromises | undefined;
}

const globalCacheKey = '__tenant_provider_cache__';
const globalInflightKey = '__tenant_provider_inflight__';

// Initialize global cache if it doesn't exist
if (typeof globalThis !== 'undefined') {
  globalThis[globalCacheKey] = globalThis[globalCacheKey] || {
    tenants: null,
    currentTenant: null,
    currentTenantId: null,
  };
  globalThis[globalInflightKey] = globalThis[globalInflightKey] || {
    tenants: null,
    currentTenant: null,
  };
}

// DEBUG: module reload indicator
// eslint-disable-next-line no-console
console.log(
  '[TenantProvider] module evaluated. cachedId =',
  globalThis[globalCacheKey]?.currentTenantId ?? null,
);

export function TenantProvider({
  children,
  initialTenantId,
}: TenantProviderProps): React.JSX.Element {
  const [currentTenantId, setCurrentTenantId] = useState<string | null>(
    initialTenantId ?? globalThis[globalCacheKey]?.currentTenantId ?? null,
  );
  const [currentTenant, setCurrentTenant] = useState<TenantContext | null>(
    null,
  );
  const [userTenants, setUserTenants] = useState<TenantType[]>([]);
  const [personalTenant, setPersonalTenant] = useState<TenantType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasInitialized = useRef(false);

  const supabase = createSupabaseBrowserClient();

  // Fetch all user tenants
  const refreshTenants = useCallback((): Promise<void> => {
    // Use global inflight promises to survive HMR
    const inflightPromises = globalThis[globalInflightKey];
    if (!inflightPromises) {
      throw new Error('Global inflight promises not initialized');
    }

    if (inflightPromises.tenants) {
      // eslint-disable-next-line no-console
      console.log('[TenantProvider] refreshTenants() await existing');
      return inflightPromises.tenants;
    }

    inflightPromises.tenants = (async () => {
      // eslint-disable-next-line no-console
      console.log('[TenantProvider] refreshTenants() BEGIN');
      try {
        setError(null);
        setIsLoading(true);

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
        const transformedTenants: TenantType[] = tenants.map((t: unknown) => {
          const tenant = t as {
            tenant_id: string;
            tenant_name: string;
            tenant_slug: string;
            tenant_type: 'personal' | 'collective';
            tenant_description?: string;
            is_public: boolean;
            logo_url?: string;
            cover_image_url?: string;
            settings?: Record<string, unknown>;
            created_at: string;
            updated_at: string;
            member_count?: number;
          };

          return {
            id: tenant.tenant_id,
            name: tenant.tenant_name,
            slug: tenant.tenant_slug,
            type: tenant.tenant_type,
            description: tenant.tenant_description ?? null,
            is_public: tenant.is_public,
            logo_url: tenant.logo_url ?? null,
            cover_image_url: tenant.cover_image_url ?? null,
            settings: tenant.settings || {},
            created_at: tenant.created_at,
            updated_at: tenant.updated_at,
            deleted_at: null,
            member_count: tenant.member_count ?? 0,
          };
        });

        setUserTenants(transformedTenants);
        // eslint-disable-next-line no-console
        console.log(
          '[TenantProvider] refreshTenants() fetched',
          transformedTenants.length,
          'tenants',
        );

        // Find personal tenant
        const personal = transformedTenants.find((t) => t.type === 'personal');
        setPersonalTenant(personal || null);

        // If no current tenant is set, default to personal tenant
        if (!currentTenantId && personal) {
          setCurrentTenantId(personal.id);
        }

        // Update global cache
        if (typeof globalThis !== 'undefined' && globalThis[globalCacheKey]) {
          globalThis[globalCacheKey] = {
            ...globalThis[globalCacheKey],
            tenants,
          };
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to fetch tenants';
        setError(errorMessage);
        console.error('Error fetching user tenants:', err);
      } finally {
        setIsLoading(false);
        // eslint-disable-next-line no-console
        console.log('[TenantProvider] refreshTenants() END');
        if (inflightPromises) {
          inflightPromises.tenants = null;
        }
      }
    })();

    return inflightPromises.tenants;
  }, [supabase, currentTenantId]);

  // Fetch current tenant context and user role
  const refreshCurrentTenant = useCallback((): Promise<void> => {
    // Use global inflight promises to survive HMR
    const inflightPromises = globalThis[globalInflightKey];
    if (!inflightPromises) {
      throw new Error('Global inflight promises not initialized');
    }

    if (inflightPromises.currentTenant) {
      // eslint-disable-next-line no-console
      console.log('[TenantProvider] refreshCurrentTenant() await existing');
      return inflightPromises.currentTenant;
    }

    inflightPromises.currentTenant = (async () => {
      // eslint-disable-next-line no-console
      console.log(
        '[TenantProvider] refreshCurrentTenant() BEGIN id=',
        currentTenantId,
      );

      if (!currentTenantId) {
        setCurrentTenant(null);
        if (inflightPromises) {
          inflightPromises.currentTenant = null;
        }
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

        // Transform to our context format (cast to type for RPC response)
        const tenantData = tenantContext as {
          tenant_id: string; // RPC returns tenant_id, not id
          name: string;
          slug: string;
          type: 'personal' | 'collective';
          description?: string;
          is_public: boolean;
          user_role: UserRole;
          member_count?: number;
        };
        const context: TenantContext = {
          id: tenantData.tenant_id,
          tenant_id: tenantData.tenant_id,
          name: tenantData.name,
          tenant_name: tenantData.name,
          slug: tenantData.slug,
          tenant_slug: tenantData.slug,
          type: tenantData.type,
          tenant_type: tenantData.type,
          is_public: tenantData.is_public,
          is_personal: tenantData.type === 'personal',
          user_role: tenantData.user_role,
          ...(tenantData.member_count !== undefined
            ? { member_count: tenantData.member_count }
            : {}),
          ...(tenantData.description
            ? { description: tenantData.description }
            : {}),
        };

        setCurrentTenant(context);
        // eslint-disable-next-line no-console
        console.log('[TenantProvider] refreshCurrentTenant() SUCCESS');
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to fetch tenant context';
        setError(errorMessage);
        console.error('Error fetching tenant context:', err);

        // If we can't access this tenant, fall back to personal tenant
        if (personalTenant && currentTenantId !== personalTenant.id) {
          setCurrentTenantId(personalTenant.id);
          if (globalThis[globalCacheKey]) {
            globalThis[globalCacheKey].currentTenantId = personalTenant.id;
          }
        }
      } finally {
        if (inflightPromises) {
          inflightPromises.currentTenant = null;
        }
        // eslint-disable-next-line no-console
        console.log('[TenantProvider] refreshCurrentTenant() END');
      }
    })();

    return inflightPromises.currentTenant;
  }, [currentTenantId, supabase, personalTenant]);

  // Switch to a different tenant
  const switchTenant = useCallback(
    (tenantId: string): Promise<void> => {
      if (tenantId === currentTenantId) {
        return Promise.resolve(); // Already on this tenant
      }

      // Verify user has access to this tenant
      const targetTenant = userTenants.find((t) => t.id === tenantId);
      if (!targetTenant) {
        return Promise.reject(new Error('No access to this tenant'));
      }

      setCurrentTenantId(tenantId);
      if (globalThis[globalCacheKey]) {
        globalThis[globalCacheKey].currentTenantId = tenantId; // soft-persist
      }
      return Promise.resolve();
    },
    [currentTenantId, userTenants],
  );

  const switchToPersonal = useCallback((): Promise<void> => {
    if (personalTenant) {
      return switchTenant(personalTenant.id);
    }
    return Promise.resolve();
  }, [personalTenant, switchTenant]);

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

  // Compute collective tenants (non-personal tenants)
  const collectiveTenants = userTenants.filter((t) => t.type === 'collective');

  // Initialize tenants on mount (only once)
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('[TenantProvider] initialiseTenants effect fired');
    if (hasInitialized.current) {
      // eslint-disable-next-line no-console
      console.log('[TenantProvider] already initialised – skipping');
      return;
    }

    const initializeTenants = (): void => {
      // eslint-disable-next-line no-console
      console.log('[TenantProvider] initializeTenants() START');
      hasInitialized.current = true;
      void refreshTenants();
      // eslint-disable-next-line no-console
      console.log('[TenantProvider] initializeTenants() FINISH');
    };

    initializeTenants();
  }, [refreshTenants]);

  // Listen for auth state changes to refresh tenants
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          // Only refresh if this is a real sign-in, not the initial load
          // hasInitialized.current will be true if we've already loaded tenants
          if (!hasInitialized.current) {
            // User just signed in for the first time
            void refreshTenants();
          }
        } else if (event === 'TOKEN_REFRESHED' && session) {
          // Session token refreshed while tab in background – ensure tenants stay fresh
          void refreshTenants();
        } else if (event === 'SIGNED_OUT') {
          // Clear tenant data on sign out
          setUserTenants([]);
          setPersonalTenant(null);
          setCurrentTenantId(null);
          setCurrentTenant(null);
          if (globalThis[globalCacheKey]) {
            globalThis[globalCacheKey].currentTenantId = null;
          }
        }
      },
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [supabase, refreshTenants]);

  // Refresh current tenant when currentTenantId changes
  useEffect(() => {
    if (currentTenantId && userTenants.length > 0) {
      void refreshCurrentTenant();
    }
  }, [currentTenantId, refreshCurrentTenant, userTenants.length]);

  // Auto-switch to first available tenant if none selected
  useEffect(() => {
    if (!currentTenantId && userTenants.length > 0) {
      const firstTenant = userTenants[0];
      if (firstTenant) {
        void switchTenant(firstTenant.id);
      }
    }
  }, [currentTenantId, userTenants, switchTenant]);

  // When currentTenantId changes from elsewhere, sync cache
  useEffect(() => {
    if (globalThis[globalCacheKey]) {
      globalThis[globalCacheKey].currentTenantId = currentTenantId;
    }
  }, [currentTenantId]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      currentTenantId,
      currentTenant,
      userTenants,
      personalTenant,
      collectiveTenants,
      isLoading,
      error,
      switchTenant,
      switchToPersonal,
      refreshTenants,
      refreshCurrentTenant,
      canPerformAction,
      isPersonalTenant,
    }),
    [
      currentTenantId,
      currentTenant,
      userTenants,
      personalTenant,
      collectiveTenants,
      isLoading,
      error,
      switchTenant,
      switchToPersonal,
      refreshTenants,
      refreshCurrentTenant,
      canPerformAction,
      isPersonalTenant,
    ],
  );

  return (
    <TenantContext.Provider value={contextValue}>
      {children}
    </TenantContext.Provider>
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

// Alias for backward compatibility
// export const useTenantContext = useTenant;

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

  const switchToPersonal = useCallback((): Promise<void> => {
    if (personalTenant) {
      return handleSwitchTenant(personalTenant.id);
    }
    return Promise.resolve();
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

  return {
    hasAccess: hasAccess(requiredRole),
    checkAccess: hasAccess,
    currentRole: currentTenant?.user_role,
    isOwner: currentTenant?.user_role === 'owner',
    isAdmin: ['admin', 'owner'].includes(currentTenant?.user_role ?? ''),
    canRead: canPerformAction('read'),
    canWrite: canPerformAction('write'),
    canAdmin: canPerformAction('admin'),
    canManage: canPerformAction('manage'),
  };
}
