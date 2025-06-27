import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useTenant } from '@/providers/TenantProvider';

import { conversationKeys } from './useTenantConversations';

import type { ConversationWithParticipants } from '@/lib/chat/types';

export interface CreateTenantChannelParams {
  title: string;
  description?: string;
  isPrivate?: boolean;
  type?: 'channel' | 'group';
}

export function useCreateTenantChannel(tenantId?: string) {
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();
  const effectiveTenantId = tenantId || currentTenant?.tenant_id;

  return useMutation({
    mutationFn: async (params: CreateTenantChannelParams): Promise<ConversationWithParticipants> => {
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
        queryKey: conversationKeys.byTenant(effectiveTenantId || ''),
      });
    },
  });
} 