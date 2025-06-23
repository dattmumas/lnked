'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { chatApiClient } from '@/lib/chat/api-client';

import type { ConversationWithParticipants } from '@/lib/chat/types';

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

// Hook to fetch a single conversation
export function useConversation(conversationId: string): {
  conversation: ConversationWithParticipants | undefined;
  isLoading: boolean;
  error: Error | null;
} {
  const query = useQuery({
    queryKey: conversationKeys.detail(conversationId),
    queryFn: () => chatApiClient.getConversation(conversationId),
    enabled: Boolean(conversationId),
  });

  return {
    conversation: query.data,
    isLoading: query.isLoading,
    error: query.error,
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
        title: params.title,
        description: undefined, // Not used by frontend
        is_private: params.isPrivate,
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