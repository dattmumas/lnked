'use client';

import { useInfiniteQuery, useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { chatApiClient } from '@/lib/chat/api-client';
import type { MessageWithSender } from '@/lib/chat/types';
import { useChatUIStore } from '@/lib/stores/chat-ui-store';
import { conversationKeys } from './use-conversations';
import { useEffect, useMemo } from 'react';

const MESSAGES_PER_PAGE = 50;

// Query keys
export const messageKeys = {
  all: ['messages'] as const,
  conversation: (conversationId: string) => [...messageKeys.all, conversationId] as const,
  search: (query: string, conversationId?: string) => [...messageKeys.all, 'search', query, conversationId] as const,
};

// Hook to fetch messages with infinite scroll
export function useMessages(conversationId: string | null) {
  const queryClient = useQueryClient();
  
  const query = useInfiniteQuery({
    queryKey: conversationId ? messageKeys.conversation(conversationId) : ['disabled'],
    queryFn: async ({ pageParam }: { pageParam?: string }) => {
      if (!conversationId) throw new Error('No conversation selected');
      
      const options = pageParam 
        ? { before: pageParam, limit: MESSAGES_PER_PAGE }
        : { limit: MESSAGES_PER_PAGE };
      
      return await chatApiClient.getMessages(conversationId, options);
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.length < MESSAGES_PER_PAGE) return undefined;
      
      // Get the oldest message's timestamp for pagination
      const oldestMessage = lastPage[0];
      return oldestMessage?.created_at;
    },
    initialPageParam: undefined as string | undefined,
    enabled: !!conversationId,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
  });
  
  // Flatten all pages into a single array
  const messages = useMemo(() => {
    if (!query.data) return [];
    return query.data.pages.flat();
  }, [query.data]);
  
  return {
    messages,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
  };
}

// Hook to send a message with optimistic updates
export function useSendMessage() {
  const queryClient = useQueryClient();
  const activeConversationId = useChatUIStore(state => state.activeConversationId);
  
  return useMutation({
    mutationFn: async (params: {
      content: string;
      message_type?: 'text' | 'image' | 'file' | 'system';
      reply_to_id?: string;
      metadata?: Record<string, unknown>;
    }) => {
      if (!activeConversationId) throw new Error('No active conversation');
      
      return await chatApiClient.sendMessage({
        conversation_id: activeConversationId,
        ...params,
      });
    },
    
    // Optimistic update
    onMutate: async (params) => {
      if (!activeConversationId) return;
      
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: messageKeys.conversation(activeConversationId) 
      });
      
      // Snapshot previous value
      const previousMessages = queryClient.getQueryData(
        messageKeys.conversation(activeConversationId)
      );
      
      // Create optimistic message
      const optimisticMessage: MessageWithSender = {
        id: `temp-${Date.now()}`,
        conversation_id: activeConversationId,
        sender_id: 'current-user', // Will be replaced by actual user ID
        content: params.content,
        message_type: params.message_type || 'text',
        reply_to_id: params.reply_to_id || null,
        metadata: (params.metadata as any) || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        edited_at: null,
        deleted_at: null,
        sender: null, // Will be populated by server response
        reply_to: null,
      };
      
      // Optimistically update to the new value
      queryClient.setQueryData(
        messageKeys.conversation(activeConversationId),
        (old: any) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page: MessageWithSender[], index: number) => 
              index === old.pages.length - 1 
                ? [...page, optimisticMessage]
                : page
            ),
          };
        }
      );
      
      // Return context for rollback
      return { previousMessages, activeConversationId };
    },
    
    // Always refetch after error or success
    onSettled: (data, error, variables, context) => {
      if (context?.activeConversationId) {
        queryClient.invalidateQueries({ 
          queryKey: messageKeys.conversation(context.activeConversationId) 
        });
        
        // Also update conversations list to show latest message
        queryClient.invalidateQueries({ 
          queryKey: conversationKeys.lists() 
        });
      }
    },
  });
}

// Hook to add a reaction
export function useAddReaction() {
  const queryClient = useQueryClient();
  const activeConversationId = useChatUIStore(state => state.activeConversationId);
  
  return useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      return await chatApiClient.addReaction(messageId, emoji);
    },
    onSuccess: () => {
      if (activeConversationId) {
        queryClient.invalidateQueries({ 
          queryKey: messageKeys.conversation(activeConversationId) 
        });
      }
    },
  });
}

// Hook to remove a reaction
export function useRemoveReaction() {
  const queryClient = useQueryClient();
  const activeConversationId = useChatUIStore(state => state.activeConversationId);
  
  return useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      return await chatApiClient.removeReaction(messageId, emoji);
    },
    onSuccess: () => {
      if (activeConversationId) {
        queryClient.invalidateQueries({ 
          queryKey: messageKeys.conversation(activeConversationId) 
        });
      }
    },
  });
}

// Hook to search messages
export function useSearchMessages(query: string, conversationId?: string) {
  return useQuery({
    queryKey: messageKeys.search(query, conversationId),
    queryFn: async () => {
      return await chatApiClient.searchMessages(query, conversationId);
    },
    enabled: query.length > 0,
    staleTime: 30 * 1000, // Cache search results for 30 seconds
  });
} 