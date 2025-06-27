/* eslint-disable import/order */
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { chatApiClient } from '@/lib/chat/api-client';

import type { ConversationWithParticipants } from '@/lib/chat/types';
import { useChatUIStore } from '@/lib/stores/chat-ui-store';

const CONVERSATION_STALE_TIME = 5 * 60 * 1000; // 5 minutes
const CONVERSATION_RETRY_DELAY = 5 * 60 * 1000; // 5 minutes

// Query keys for conversations
export const conversationKeys = {
  all: ['conversations'] as const,
  lists: (): readonly string[] => [...conversationKeys.all, 'list'] as const,
  detail: (id: string): readonly string[] => [...conversationKeys.all, 'detail', id] as const,
  participants: (id: string): readonly string[] => [...conversationKeys.all, 'participants', id] as const,
};

// Hook to fetch user's conversations
export function useConversations(): {
  conversations: ConversationWithParticipants[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
} {
  const query = useQuery({
    queryKey: conversationKeys.lists(),
    queryFn: async () => {
      const result = await chatApiClient.getConversations();
      return result.conversations;
    },
    staleTime: CONVERSATION_STALE_TIME,
    retry: 3,
    retryDelay: CONVERSATION_RETRY_DELAY,
  });

  return {
    conversations: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

// Hook to create a new conversation
export function useCreateConversation(): {
  mutate: (params: {
    type: 'direct' | 'group' | 'channel';
    title?: string;
    participantIds: string[];
    isPrivate?: boolean;
    collectiveId?: string;
  }) => Promise<ConversationWithParticipants>;
  isLoading: boolean;
  error: Error | null;
} {
  const queryClient = useQueryClient();
  
  const mutation = useMutation({
    mutationFn: (params: {
      type: 'direct' | 'group' | 'channel';
      title?: string;
      participantIds: string[];
      isPrivate?: boolean;
      collectiveId?: string;
    }) => {
      // Map frontend parameter names to API parameter names
      return chatApiClient.createConversation({
        type: params.type,
        ...(params.title ? { title: params.title } : {}),
        ...(params.isPrivate !== undefined ? { is_private: params.isPrivate } : {}),
        participant_ids: params.participantIds,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });
    },
  });

  return {
    mutate: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}

// Hook to leave a conversation
export function useLeaveConversation(): {
  mutate: (conversationId: string) => Promise<void>;
  isLoading: boolean;
  error: Error | null;
} {
  const queryClient = useQueryClient();
  
  const mutation = useMutation({
    mutationFn: (conversationId: string) => {
      return chatApiClient.leaveConversation(conversationId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });
    },
  });

  return {
    mutate: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}

// Hook to mark conversation as read
export function useMarkAsRead(): {
  mutate: (conversationId: string) => void;
  mutateAsync: (conversationId: string) => Promise<void>;
  isPending: boolean;
} {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string): Promise<void> => {
      // --- Guard Clause ---
      // Get conversation from cache to check if it's already read
      const conversations = queryClient.getQueryData<ConversationWithParticipants[]>(
        conversationKeys.lists()
      );
      const targetConversation = conversations?.find(c => c.id === conversationId);
      
      // If we have the conversation and its unread count is 0, do nothing.
      if (targetConversation && (targetConversation.unread_count ?? 0) === 0) {
        console.log(`[useMarkAsRead] Skipping mutation for ${conversationId}, already marked as read.`);
        return;
      }
      // --- End Guard ---
      
      await chatApiClient.markAsRead(conversationId);
    },
    onSuccess: (_, conversationId) => {
      void queryClient.invalidateQueries({
        queryKey: conversationKeys.detail(conversationId),
      });
      void queryClient.invalidateQueries({
        queryKey: conversationKeys.lists(),
      });
    },
  });
}

// Delete chat for current user
export function useDeleteConversation(): { mutate: (conversationId: string)=>void; isPending: boolean } {
  const queryClient = useQueryClient();
  const { setActiveConversation, activeConversationId } = useChatUIStore();

  return useMutation({
    mutationFn: async (conversationId: string): Promise<void> => {
      await chatApiClient.deleteConversationForMe(conversationId);
    },
    onMutate: async (conversationId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: conversationKeys.lists() });

      // Snapshot the previous value
      const previousConversations = queryClient.getQueryData(conversationKeys.lists());

      // Optimistically remove the conversation from cache
      queryClient.setQueryData(
        conversationKeys.lists(),
        (oldData: ConversationWithParticipants[] | undefined) => {
          if (!oldData) return oldData;
          return oldData.filter(c => c.id !== conversationId);
        }
      );

      // Clear active conversation if it's the one being deleted
      if (activeConversationId === conversationId) {
        setActiveConversation(undefined);
      }

      // Return a context object with the snapshotted value
      return { previousConversations };
    },
    onError: (_err, _variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousConversations) {
        queryClient.setQueryData(conversationKeys.lists(), context.previousConversations);
      }
    },
    onSuccess: (_data, conversationId) => {
      // Invalidate ALL conversation-related caches for immediate UI updates
      void queryClient.invalidateQueries({
        queryKey: conversationKeys.lists(),
      });
      void queryClient.invalidateQueries({
        queryKey: ['direct-messages'],
      });
      void queryClient.invalidateQueries({
        queryKey: ['tenant-channels'],
      });
      void queryClient.invalidateQueries({
        queryKey: ['chat'],
      });
    },
  });
} 