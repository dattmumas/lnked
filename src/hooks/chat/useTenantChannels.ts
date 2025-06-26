import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { useTenant } from '@/providers/TenantProvider';
import { useUser } from '@/hooks/useUser';

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
  const { user } = useUser();
  const queryClient = useQueryClient();
  const isCollective = currentTenant?.is_personal === false;
  const tenantId = currentTenant?.tenant_id;

  // Real-time subscription for tenant channel updates
  useEffect(() => {
    if (!user?.id || !tenantId || !isCollective) return;

    const supabase = createSupabaseBrowserClient();
    
    // Subscribe to channel conversation changes for this tenant
    const channelSubscription = supabase
      .channel(`tenant-channels-${tenantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          console.log('🔔 Tenant channel change detected:', payload);
          
          // Invalidate and refetch channel list
          void queryClient.invalidateQueries({
            queryKey: tenantChannelKeys.tenant(tenantId),
          });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channelSubscription);
    };
  }, [user?.id, tenantId, isCollective, queryClient]);

  return useQuery({
    queryKey: tenantChannelKeys.tenant(tenantId ?? ''),
    queryFn: async (): Promise<TenantChannel[]> => {
      if (!tenantId) return [];

      const response = await fetch(`/api/tenants/${tenantId}/conversations`);
      if (!response.ok) {
        throw new Error('Failed to fetch tenant channels');
      }
      const json = await response.json();
      
      // Extract conversations from the response and filter for channels
      const conversations = json?.data?.conversations ?? json.conversations ?? [];
      
      // Filter to only include channel-type conversations for collectives
      const channels: TenantChannel[] = conversations
        .filter((conv: any) => conv.type === 'channel')
        .map((conv: any) => ({
          id: conv.id,
          title: conv.title,
          type: conv.type,
          tenant_id: tenantId,
          created_at: conv.created_at,
          updated_at: conv.updated_at,
          description: conv.description,
          is_private: conv.is_private,
        }));
      
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