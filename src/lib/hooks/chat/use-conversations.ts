'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatApiClient } from '@/lib/chat/api-client';
import type { Database } from '@/lib/database.types';

type ConversationWithDetails = Database['public']['Tables']['conversations']['Row'] & {
  unread_count: number;
  last_message: {
    id: string;
    content: string;
    created_at: string;
    sender: {
      id: string;
      username: string | null;
      full_name: string | null;
      avatar_url: string | null;
    } | null;
  } | null;
  participants: Array<{
    user_id: string;
    role: string;
    user: {
      id: string;
      username: string | null;
      full_name: string | null;
      avatar_url: string | null;
    };
  }>;
};

// Query keys
export const conversationKeys = {
  all: ['conversations'] as const,
  lists: () => [...conversationKeys.all, 'list'] as const,
  detail: (id: string) => [...conversationKeys.all, 'detail', id] as const,
};

// Hook to fetch all conversations
export function useConversations() {
  return useQuery({
    queryKey: conversationKeys.lists(),
    queryFn: async () => {
      const { conversations } = await chatApiClient.getConversations();
      return conversations;
    },
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    refetchOnWindowFocus: false, // Disable refetch on window focus
    refetchOnMount: 'always', // Only refetch on mount if stale
  });
}

// Hook to get a single conversation
export function useConversation(conversationId: string | null) {
  const { data: conversations } = useConversations();
  
  return conversations?.find(c => c.id === conversationId) || null;
}

// Hook to create a new conversation
export function useCreateConversation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: {
      title?: string;
      type: 'direct' | 'group' | 'channel';
      description?: string;
      is_private?: boolean;
      participant_ids: string[];
    }) => {
      return await chatApiClient.createConversation(params);
    },
    onSuccess: () => {
      // Invalidate conversations list to refetch
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });
    },
  });
}

// Hook to mark conversation as read
export function useMarkAsRead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (conversationId: string) => {
      return await chatApiClient.markAsRead(conversationId);
    },
    onSuccess: (data, conversationId) => {
      // Update the unread count in the cache
      queryClient.setQueryData<ConversationWithDetails[]>(
        conversationKeys.lists(),
        (old) => {
          if (!old) return old;
          return old.map(conv =>
            conv.id === conversationId
              ? { ...conv, unread_count: data.unread_count }
              : conv
          );
        }
      );
    },
  });
} 