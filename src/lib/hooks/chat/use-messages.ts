'use client';

import { useInfiniteQuery, useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { chatApiClient } from '@/lib/chat/api-client';
import { useChatUIStore } from '@/lib/stores/chat-ui-store';

import { conversationKeys } from './use-conversations';

import type { MessageWithSender } from '@/lib/chat/types';

const MESSAGES_PER_PAGE = 50;
const MESSAGES_STALE_TIME = 5 * 60 * 1000; // 5 minutes
const SEARCH_STALE_TIME = 30 * 1000; // 30 seconds

// Query keys
export const messageKeys = {
  all: ['messages'] as const,
  conversation: (conversationId: string): readonly string[] => [...messageKeys.all, conversationId] as const,
  search: (query: string, conversationId?: string): readonly string[] => {
    const baseKey = [...messageKeys.all, 'search', query] as const;
    return conversationId ? [...baseKey, conversationId] as const : baseKey;
  },
};

interface UseMessagesReturn {
  messages: MessageWithSender[];
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isLoading: boolean;
  error: Error | null;
  fetchNextPage: () => Promise<unknown>;
}

// Hook to fetch messages for a conversation
export function useMessages(conversationId: string | null): UseMessagesReturn {
  // Handle null conversationId case
  const enabledQuery = Boolean(conversationId);
  const safeConversationId = conversationId || '';

  const query = useInfiniteQuery({
    queryKey: enabledQuery ? messageKeys.conversation(safeConversationId) : ['messages', 'empty'],
    queryFn: async ({ pageParam }: { pageParam?: string }) => {
      if (!conversationId) {
        return [];
      }
      
      const oldestMessage = pageParam ? { created_at: pageParam } : undefined;
      return chatApiClient.getMessages(conversationId, {
        before: oldestMessage?.created_at || undefined,
        limit: MESSAGES_PER_PAGE,
      });
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage || lastPage.length === 0) return undefined;
      const oldestMessage = lastPage[lastPage.length - 1];
      return oldestMessage?.created_at || undefined;
    },
    initialPageParam: undefined as string | undefined,
    enabled: enabledQuery,
    staleTime: MESSAGES_STALE_TIME,
  });

  // Flatten all pages into a single array
  const messages = useMemo(() => {
    if (!query.data) return [];
    return query.data.pages.flat();
  }, [query.data]);

  return {
    messages,
    hasNextPage: query.hasNextPage || false,
    isFetchingNextPage: query.isFetchingNextPage,
    isLoading: query.isLoading,
    error: query.error,
    fetchNextPage: query.fetchNextPage,
  };
}

// Hook to send a message
export function useSendMessage(): {
  mutate: (params: {
    content: string;
    message_type?: 'text' | 'image' | 'file' | 'system';
    reply_to_id?: string;
    metadata?: Record<string, unknown>;
  }) => void;
  mutateAsync: (params: {
    content: string;
    message_type?: 'text' | 'image' | 'file' | 'system';
    reply_to_id?: string;
    metadata?: Record<string, unknown>;
  }) => Promise<MessageWithSender>;
  isPending: boolean;
  error: Error | null;
} {
  const queryClient = useQueryClient();
  const { activeConversationId } = useChatUIStore();

  return useMutation({
    mutationFn: async (params: {
      content: string;
      message_type?: 'text' | 'image' | 'file' | 'system';
      reply_to_id?: string;
      metadata?: Record<string, unknown>;
    }): Promise<MessageWithSender> => {
      if (!activeConversationId) {
        throw new Error('No active conversation');
      }

      return chatApiClient.sendMessage({
        conversation_id: activeConversationId,
        content: params.content,
        message_type: params.message_type || 'text',
        reply_to_id: params.reply_to_id,
        metadata: params.metadata,
      });
    },
    onSuccess: (newMessage) => {
      if (!activeConversationId) return;

      // Update the messages cache
      void queryClient.invalidateQueries({
        queryKey: messageKeys.conversation(activeConversationId)
      });

      // Update conversation list to show latest message
      void queryClient.invalidateQueries({
        queryKey: conversationKeys.lists(),
      });

      // Optimistically add the message to cache
      const optimisticMessage: MessageWithSender = {
        ...newMessage,
        conversation_id: activeConversationId,
      };

      queryClient.setQueryData(
        messageKeys.conversation(activeConversationId),
        (oldData: { pages: MessageWithSender[][]; pageParams: unknown[] } | undefined) => {
          if (!oldData) return oldData;
          
          const newPages = [...oldData.pages];
          if (newPages.length > 0) {
            newPages[0] = [optimisticMessage, ...newPages[0]];
          } else {
            newPages.push([optimisticMessage]);
          }
          
          return {
            ...oldData,
            pages: newPages,
          };
        }
      );
    },
    onError: () => {
      if (!activeConversationId) return;
      
      // Invalidate to refetch on error
      void queryClient.invalidateQueries({
        queryKey: messageKeys.conversation(activeConversationId)
      });
    },
  });
}

// Hook to add reaction to a message
export function useAddReaction(): {
  mutate: (params: { messageId: string; emoji: string }) => void;
  isPending: boolean;
} {
  const queryClient = useQueryClient();
  const { activeConversationId } = useChatUIStore();

  return useMutation({
    mutationFn: async (params: { messageId: string; emoji: string }): Promise<void> => {
      return chatApiClient.addReaction(params.messageId, params.emoji);
    },
    onSuccess: () => {
      if (!activeConversationId) return;
      
      void queryClient.invalidateQueries({
        queryKey: messageKeys.conversation(activeConversationId)
      });
    },
  });
}

// Hook to remove reaction from a message
export function useRemoveReaction(): {
  mutate: (params: { messageId: string; emoji: string }) => void;
  isPending: boolean;
} {
  const queryClient = useQueryClient();
  const { activeConversationId } = useChatUIStore();

  return useMutation({
    mutationFn: async (params: { messageId: string; emoji: string }): Promise<void> => {
      return chatApiClient.removeReaction(params.messageId, params.emoji);
    },
    onSuccess: () => {
      if (!activeConversationId) return;
      
      void queryClient.invalidateQueries({
        queryKey: messageKeys.conversation(activeConversationId)
      });
    },
  });
}

// Hook to search messages
export function useSearchMessages(
  query: string,
  conversationId?: string
): {
  messages: MessageWithSender[];
  isLoading: boolean;
  error: Error | null;
} {
  const searchQuery = useQuery({
    queryKey: messageKeys.search(query, conversationId),
    queryFn: () => chatApiClient.searchMessages(query, conversationId),
    enabled: Boolean(query.trim()),
    staleTime: SEARCH_STALE_TIME,
  });

  return {
    messages: searchQuery.data || [],
    isLoading: searchQuery.isLoading,
    error: searchQuery.error,
  };
} 