import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useUser } from '@/hooks/useUser';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { useTenant } from '@/providers/TenantProvider';

import type { ConversationWithParticipants } from '@/lib/chat/types';

const DIRECT_MESSAGES_STALE_TIME = 5 * 60 * 1000; // 5 minutes

export const directMessageKeys = {
  all: ['direct-messages'] as const,
  byTenant: (tenantId: string) => [...directMessageKeys.all, tenantId] as const,
};

export function useDirectMessages() {
  const { currentTenant } = useTenant();
  const { user } = useUser();
  const queryClient = useQueryClient();
  const isPersonal = currentTenant?.is_personal === true;
  const tenantId = currentTenant?.tenant_id;

  // Real-time subscription for conversation list updates
  useEffect(() => {
    if (!user?.id || !tenantId || !isPersonal) return;

    const supabase = createSupabaseBrowserClient();
    
    // Subscribe to conversation changes that affect this user
    const conversationSubscription = supabase
      .channel(`conversations-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `type=eq.direct`,
        },
        (payload) => {
          // Invalidate and refetch conversation list
          void queryClient.invalidateQueries({
            queryKey: directMessageKeys.byTenant(tenantId),
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversation_participants',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // Invalidate and refetch conversation list when user is added/removed
          void queryClient.invalidateQueries({
            queryKey: directMessageKeys.byTenant(tenantId),
          });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(conversationSubscription);
    };
  }, [user?.id, tenantId, isPersonal, queryClient]);

  return useQuery({
    queryKey: directMessageKeys.byTenant(tenantId ?? 'personal'),
    queryFn: async (): Promise<ConversationWithParticipants[]> => {
      if (!tenantId) {
        return [];
      }

      const response = await fetch(`/api/tenants/${tenantId}/conversations`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData: unknown = await response.json().catch(() => ({}));
        const message = (errorData as { error?: string }).error ?? 'Failed to load conversations';
        throw new Error(message);
      }

      // Handle wrapped response from createTenantSuccessResponse
      const body = (await response.json()) as unknown as {
        data?: { conversations: ConversationWithParticipants[] };
        conversations?: ConversationWithParticipants[];
      };

      const conversations =
        body.data?.conversations ?? body.conversations ?? [];

      return conversations.filter((c) => c.type === 'direct');
    },
    enabled: isPersonal && Boolean(tenantId),
    staleTime: DIRECT_MESSAGES_STALE_TIME,
  });
} 