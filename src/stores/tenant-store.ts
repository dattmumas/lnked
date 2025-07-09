// src/stores/tenant-store.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
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

interface TenantState {
  currentTenantId: string | null;
  currentTenant: TenantContext | null;
  feedScope: 'tenant' | 'global'; // <-- New state for feed scope
  userTenants: Tenant[];
  personalTenant: Tenant | null;
  collectiveTenants: Tenant[];
  isLoading: boolean;
  error: string | null;
  actions: {
    init: (initialTenants?: Tenant[]) => Promise<void>;
    switchTenant: (tenantId: string) => Promise<void>;
    setFeedScope: (scope: 'tenant' | 'global') => void; // <-- New action
    refreshTenants: () => Promise<void>;
    refreshCurrentTenant: () => Promise<void>;
    _setCurrentTenantId: (tenantId: string | null) => void;
  };
}

const supabase = createSupabaseBrowserClient();

export const useTenantStore = create<TenantState>()(
  persist(
    (set, get) => ({
      currentTenantId: null,
      currentTenant: null,
      feedScope: 'tenant', // <-- Default to tenant-scoped
      userTenants: [],
      personalTenant: null,
      collectiveTenants: [],
      isLoading: true,
      error: null,
      actions: {
        _setCurrentTenantId: (tenantId) => set({ currentTenantId: tenantId }),
        setFeedScope: (scope) => set({ feedScope: scope }), // <-- New action implementation
        init: async (initialTenants) => {
          // When initial tenants are supplied (e.g., from server-side props) we can skip the RPC
          // round-trip and populate the store immediately. We still need to derive
          // personal/collective slices and establish a currentTenantId so that
          // `refreshCurrentTenant` can succeed.

          if (initialTenants && initialTenants.length > 0) {
            const personal =
              initialTenants.find((t) => t.type === 'personal') ?? null;
            const collectives = initialTenants.filter(
              (t) => t.type === 'collective',
            );

            // If we don't already have a persisted tenant selection, default to personal
            // or the first available tenant.
            const { currentTenantId } = get();
            const fallbackTenantId =
              personal?.id ?? initialTenants[0]?.id ?? null;

            set({
              userTenants: initialTenants,
              personalTenant: personal,
              collectiveTenants: collectives,
              currentTenantId: currentTenantId ?? fallbackTenantId,
              isLoading: false,
            });

            await get().actions.refreshCurrentTenant();
          } else {
            // No initial list provided – fetch from Supabase instead
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

            const transformedTenants: Tenant[] = tenants.map((t: any) => ({
              id: t.tenant_id,
              name: t.tenant_name,
              slug: t.tenant_slug,
              type: t.tenant_type,
              description: t.tenant_description ?? null,
              is_public: t.is_public,
              created_at: '', // Placeholder
              updated_at: '', // Placeholder
              member_count: t.member_count ?? 0,
            }));

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
          } catch (e: any) {
            set({ error: e.message });
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

            const tenantData = data as any;
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
              description: tenantData.description,
            };
            set({ currentTenant: context });
          } catch (e: any) {
            set({ error: e.message });
          } finally {
            set({ isLoading: false });
          }
        },
      },
    }),
    {
      name: 'lnked.active-tenant', // <-- Renamed for clarity
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        currentTenantId: state.currentTenantId,
        feedScope: state.feedScope, // <-- Persist the new state
      }),
    },
  ),
);
