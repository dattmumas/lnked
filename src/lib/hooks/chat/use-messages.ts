'use client';

import { useInfiniteQuery, useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { chatApiClient } from '@/lib/chat/api-client';
import {
  DEFAULT_MESSAGE_LIMIT,
  MESSAGE_STALE_TIME_MS,
  SEARCH_STALE_TIME_MS,
} from '@/lib/constants/chat';
import { useChatUIStore } from '@/lib/stores/chat-ui-store';

import { conversationKeys } from './use-conversations';

import type { MessageWithSender } from '@/lib/chat/types';

const MESSAGES_PER_PAGE = DEFAULT_MESSAGE_LIMIT;
const MESSAGES_STALE_TIME = MESSAGE_STALE_TIME_MS;
const SEARCH_STALE_TIME = SEARCH_STALE_TIME_MS;

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
    queryFn: async ({ pageParam }) => {
      if (!conversationId) {
        return [];
      }
      
      return await chatApiClient.getMessages(conversationId, {
        ...(pageParam ? { before: pageParam } : {}),
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

  // Flatten all pages into a single array. The API returns newest-to-oldest.
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
        ...(params.reply_to_id ? { reply_to_id: params.reply_to_id } : {}),
        ...(params.metadata ? { metadata: params.metadata } : {}),
      });
    },
    onSuccess: (newMessage) => {
      if (!activeConversationId) return;

      // Update conversation list to show latest message in the sidebar
      void queryClient.invalidateQueries({
        queryKey: conversationKeys.lists(),
      });

      // Optimistically PREPEND the new message to the messages cache
      queryClient.setQueryData(
        messageKeys.conversation(activeConversationId),
        (oldData: { pages: MessageWithSender[][]; pageParams: unknown[] } | undefined) => {
          if (!oldData) {
            return { pages: [[newMessage]], pageParams: [undefined] };
          }

          const newPages = [...oldData.pages];
          
          if (newPages[0]?.some((m) => m.id === newMessage.id)) {
            return oldData; // Prevent duplicates
          }

          // Prepend to the first page (which contains the newest messages)
          newPages[0] = [newMessage, ...(newPages[0] || [])];

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

// Hook to delete a message (soft delete)
export function useDeleteMessage(): { mutate: (params: { messageId: string; conversationId: string }) => void; isPending: boolean } {
  const queryClient = useQueryClient();
  const { activeConversationId } = useChatUIStore();

  return useMutation({
    mutationFn: ({ messageId, conversationId }: { messageId: string; conversationId: string }): Promise<void> =>
      chatApiClient.deleteMessage(messageId, conversationId),
    onMutate: async ({ messageId, conversationId }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: messageKeys.conversation(conversationId) });

      // Snapshot the previous value
      const previousMessages = queryClient.getQueryData(messageKeys.conversation(conversationId));

      // Optimistically update the message to show as deleted
      queryClient.setQueryData(
        messageKeys.conversation(conversationId),
        (oldData: { pages: MessageWithSender[][]; pageParams: unknown[] } | undefined) => {
          if (!oldData) return oldData;

          const newPages = oldData.pages.map(page =>
            page.map(message =>
              message.id === messageId
                ? { ...message, deleted_at: new Date().toISOString() }
                : message
            )
          );

          return {
            ...oldData,
            pages: newPages,
          };
        }
      );

      // Return a context object with the snapshotted value
      return { previousMessages, conversationId };
    },
    onError: (_err, _variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousMessages) {
        queryClient.setQueryData(
          messageKeys.conversation(context.conversationId),
          context.previousMessages
        );
      }
    },
    onSuccess: (_data, { conversationId }) => {
      // Invalidate queries to ensure consistency
      void queryClient.invalidateQueries({
        queryKey: messageKeys.conversation(conversationId),
      });
      // Also invalidate conversation list in case this was the last message
      void queryClient.invalidateQueries({
        queryKey: conversationKeys.lists(),
      });
    },
  });
} 