import { useQuery } from '@tanstack/react-query';

import { chatApiClient } from '@/lib/chat/api-client';
import { useTenant } from '@/providers/TenantProvider';

import type { ConversationWithParticipants } from '@/lib/chat/types';

const DIRECT_MESSAGES_STALE_TIME = 5 * 60 * 1000; // 5 minutes

export const directMessageKeys = {
  all: ['direct-messages'] as const,
  byTenant: (tenantId: string) => [...directMessageKeys.all, tenantId] as const,
};

export function useDirectMessages() {
  const { currentTenant } = useTenant();
  const isPersonal = currentTenant?.is_personal === true;
  const tenantId = currentTenant?.tenant_id;

  return useQuery({
    queryKey: directMessageKeys.byTenant(tenantId ?? 'personal'),
    queryFn: async (): Promise<ConversationWithParticipants[]> => {
      const result = await chatApiClient.getConversations();
      return result.conversations.filter((c) => c.type === 'direct');
    },
    enabled: isPersonal,
    staleTime: DIRECT_MESSAGES_STALE_TIME,
  });
} 