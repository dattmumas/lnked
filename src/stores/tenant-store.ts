// src/stores/tenant-store.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { clearTenantPersistence } from '@/lib/utils/clearTenantPersistence';

import type { Database } from '@/lib/database.types';

type Tenant = Database['public']['Tables']['tenants']['Row'];
type UserRole = Database['public']['Enums']['member_role'];

interface TenantContext {
  id: string;
  tenant_id: string;
  name: string;
  tenant_name: string;
  slug: string;
  tenant_slug: string;
  type: 'personal' | 'collective';
  tenant_type: 'personal' | 'collective';
  description?: string;
  is_public: boolean;
  is_personal: boolean;
  user_role: UserRole;
  member_count?: number;
}

interface TenantStateData {
  currentTenantId: string | null;
  currentTenant: TenantContext | null;
  feedScope: 'tenant' | 'global';
  userTenants: Tenant[];
  personalTenant: Tenant | null;
  collectiveTenants: Tenant[];
  isLoading: boolean;
  error: string | null;
}

const initialState: TenantStateData = {
  currentTenantId: null,
  currentTenant: null,
  feedScope: 'tenant',
  userTenants: [],
  personalTenant: null,
  collectiveTenants: [],
  isLoading: true,
  error: null,
};

interface TenantState extends TenantStateData {
  actions: {
    init: (initialTenants?: Tenant[]) => Promise<void>;
    switchTenant: (tenantId: string) => Promise<void>;
    setFeedScope: (scope: 'tenant' | 'global') => void;
    refreshTenants: () => Promise<void>;
    refreshCurrentTenant: () => Promise<void>;
    clear: () => Promise<void>;
    _setCurrentTenantId: (tenantId: string | null) => void;
  };
}

const supabase = createSupabaseBrowserClient();

export const useTenantStore = create<TenantState>()(
  persist(
    (set, get) => ({
      ...initialState,
      actions: {
        _setCurrentTenantId: (tenantId) => set({ currentTenantId: tenantId }),
        setFeedScope: (scope) => set({ feedScope: scope }),
        clear: async () => {
          set(initialState);
          await useTenantStore.persist.clearStorage();
          clearTenantPersistence();
        },
        init: async (initialTenants) => {
          if (initialTenants && initialTenants.length > 0) {
            const personal =
              initialTenants.find((t) => t.type === 'personal') ?? null;
            const collectives = initialTenants.filter(
              (t) => t.type === 'collective',
            );

            const { currentTenantId } = get();

            // Security Gate: If the persisted tenant ID is not in the user's list, invalidate it.
            const isValidPersistedId =
              currentTenantId &&
              initialTenants.some((t) => t.id === currentTenantId);

            const fallbackTenantId =
              personal?.id ?? initialTenants[0]?.id ?? null;

            set({
              userTenants: initialTenants,
              personalTenant: personal,
              collectiveTenants: collectives,
              currentTenantId: isValidPersistedId
                ? currentTenantId
                : fallbackTenantId,
              isLoading: false,
            });

            await get().actions.refreshCurrentTenant();
          } else {
            await get().actions.refreshTenants();
          }
        },
        switchTenant: async (tenantId) => {
          const { userTenants, currentTenantId } = get();
          if (tenantId === currentTenantId) return;

          const targetTenant = userTenants.find((t) => t.id === tenantId);
          if (!targetTenant) {
            set({ error: 'No access to this tenant' });
            return;
          }

          set({ currentTenantId: tenantId });
          await get().actions.refreshCurrentTenant();
        },
        refreshTenants: async () => {
          set({ isLoading: true, error: null });
          try {
            const { data: tenants, error } =
              await supabase.rpc('get_user_tenants');
            if (error) throw error;

            const transformedTenants: Tenant[] = tenants.map(
              (t: {
                tenant_id: string;
                tenant_name: string;
                tenant_slug: string;
                tenant_type: 'personal' | 'collective';
                tenant_description?: string;
                is_public: boolean;
                member_count?: number;
              }) => ({
                id: t.tenant_id,
                name: t.tenant_name,
                slug: t.tenant_slug,
                type: t.tenant_type,
                description: t.tenant_description ?? null,
                is_public: t.is_public,
                created_at: '', // Placeholder
                updated_at: '', // Placeholder
                member_count: t.member_count ?? 0,
              }),
            );

            const personal =
              transformedTenants.find((t) => t.type === 'personal') || null;
            const collectives = transformedTenants.filter(
              (t) => t.type === 'collective',
            );

            set({
              userTenants: transformedTenants,
              personalTenant: personal,
              collectiveTenants: collectives,
            });

            if (!get().currentTenantId && personal) {
              set({ currentTenantId: personal.id });
            }
            await get().actions.refreshCurrentTenant();
          } catch (e: unknown) {
            const errorMessage =
              e instanceof Error ? e.message : 'Unknown error';
            set({ error: errorMessage });
          } finally {
            set({ isLoading: false });
          }
        },
        refreshCurrentTenant: async () => {
          const { currentTenantId } = get();
          if (!currentTenantId) {
            set({ currentTenant: null });
            return;
          }

          set({ isLoading: true });
          try {
            const { data, error } = await supabase.rpc('get_tenant_context', {
              target_tenant_id: currentTenantId,
            });
            if (error) throw error;

            const tenantData = data as {
              tenant_id: string;
              name: string;
              slug: string;
              type: 'personal' | 'collective';
              is_public: boolean;
              user_role: UserRole;
              member_count: number;
              description?: string;
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
              member_count: tenantData.member_count,
              ...(tenantData.description
                ? { description: tenantData.description }
                : {}),
            };
            set({ currentTenant: context });
          } catch (e: unknown) {
            const errorMessage =
              e instanceof Error ? e.message : 'Unknown error';
            set({ error: errorMessage });
          } finally {
            set({ isLoading: false });
          }
        },
      },
    }),
    {
      name: 'lnked.active-tenant',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        currentTenantId: state.currentTenantId,
        feedScope: state.feedScope,
      }),
    },
  ),
);
