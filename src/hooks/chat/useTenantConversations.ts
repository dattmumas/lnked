import { useQuery, useQueryClient } from '@tanstack/react-query';
import React from 'react';

import { useUser } from '@/hooks/useUser';
import { useTenant } from '@/providers/TenantProvider';

import type { ConversationWithParticipants } from '@/lib/chat/types';

// Cache durations
const STALE_TIME = 5 * 60 * 1000; // 5 minutes

// Query keys factory
export const conversationKeys = {
  all: ['conversations'] as const,
  byTenant: (tenantId: string) => [...conversationKeys.all, 'tenant', tenantId] as const,
  byUser: (userId: string) => [...conversationKeys.all, 'user', userId] as const,
};

interface TenantConversationsResponse {
  data: {
    conversations: ConversationWithParticipants[];
    meta?: {
      tenant_id: string;
      user_role: string;
      total: number;
    };
  }
}

const fetchTenantConversations = async (tenantId: string): Promise<ConversationWithParticipants[]> => {
  if (!tenantId) {
    throw new Error('No tenant ID provided');
  }

  const response = await fetch(`/api/tenants/${tenantId}/conversations`, {
    credentials: 'include', // Ensure cookies are sent
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('API Error response body:', errorText);
    throw new Error(`Failed to fetch conversations: ${response.statusText}`);
  }
  
  const json = await response.json() as TenantConversationsResponse;
  // Correctly parse the nested data structure
  return json.data.conversations || [];
};

// Subscription setup for real-time updates
const setupConversationSubscription = (
  tenantId: string | null, 
  userId: string,
  queryClient: ReturnType<typeof useQueryClient>
): (() => void) | undefined => {
  if (!tenantId) return;

  // We'll implement real-time subscription here when the infrastructure is ready
  // For now, we can use polling or manual invalidation
  console.log('Setting up conversation subscription for tenant:', tenantId, 'user:', userId);
  
  // Example of how we'd set up a Supabase subscription:
  // const subscription = supabase
  //   .channel('conversations')
  //   .on('postgres_changes', 
  //     { event: '*', schema: 'public', table: 'conversations' },
  //     () => {
  //       queryClient.invalidateQueries({
  //         queryKey: conversationKeys.byTenant(tenantId)
  //       });
  //     }
  //   )
  //   .subscribe();
  //
  // return () => {
  //   subscription.unsubscribe();
  // };
  
  return () => {
    // Placeholder cleanup function
  };
};

/**
 * A consolidated hook to fetch all conversations for the current tenant.
 * This replaces useTenantChannels and useDirectMessages to avoid redundant API calls.
 * It fetches all conversation types and lets the component derive channels and DMs.
 */
export function useTenantConversations() {
  const { currentTenant } = useTenant();
  const { user } = useUser();
  const queryClient = useQueryClient();

  const tenantId = currentTenant?.tenant_id;
  const userId = user?.id;

  const query = useQuery({
    queryKey: conversationKeys.byTenant(tenantId || ''),
    queryFn: () => fetchTenantConversations(tenantId!),
    enabled: Boolean(tenantId) && Boolean(userId),
    staleTime: STALE_TIME,
    retry: 2,
  });

  // Set up real-time subscription when we have both tenant and user
  React.useEffect(() => {
    if (!tenantId || !userId) return;

    const cleanup = setupConversationSubscription(tenantId, userId, queryClient);
    return cleanup;
  }, [tenantId, userId, queryClient]);

  return {
    data: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
} 