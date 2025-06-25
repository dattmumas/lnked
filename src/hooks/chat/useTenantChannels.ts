import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useTenant } from '@/providers/TenantProvider';

const TENANT_CHANNELS_STALE_TIME = 5 * 60 * 1000; // 5 minutes

export const tenantChannelKeys = {
  all: ['tenant-channels'] as const,
  tenant: (tenantId: string) => [...tenantChannelKeys.all, tenantId] as const,
};

export interface TenantChannel {
  id: string;
  title: string | null;
  type: string;
  tenant_id: string | null;
  is_private: boolean | null;
}

export interface CreateTenantChannelParams {
  title: string;
  description?: string;
  isPrivate?: boolean;
  type?: 'channel' | 'group';
}

export function useTenantChannels() {
  const { currentTenant } = useTenant();
  const isCollective = currentTenant?.is_personal === false;
  const tenantId = currentTenant?.tenant_id;

  return useQuery({
    queryKey: tenantChannelKeys.tenant(tenantId ?? ''),
    queryFn: async (): Promise<TenantChannel[]> => {
      if (!tenantId) return [];

      const response = await fetch(`/api/tenants/${tenantId}/conversations`);
      if (!response.ok) {
        throw new Error('Failed to fetch tenant channels');
      }
      const json = await response.json();
      const channels: TenantChannel[] =
        json?.data?.channels ?? json.channels ?? [];
      return channels;
    },
    enabled: isCollective && Boolean(tenantId),
    staleTime: TENANT_CHANNELS_STALE_TIME,
  });
}

export function useCreateTenantChannel(tenantId?: string) {
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();
  const effectiveTenantId = tenantId || currentTenant?.tenant_id;

  return useMutation({
    mutationFn: async (params: CreateTenantChannelParams): Promise<TenantChannel> => {
      if (!effectiveTenantId) {
        throw new Error('No tenant context available');
      }

      const response = await fetch(`/api/tenants/${effectiveTenantId}/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to create channel' })) as { message?: string };
        throw new Error(error.message ?? 'Failed to create channel');
      }
      const json = await response.json();
      return json.data ?? json;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: tenantChannelKeys.tenant(effectiveTenantId || ''),
      });
    },
  });
} 