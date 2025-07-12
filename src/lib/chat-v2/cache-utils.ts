/**
 * Enterprise-grade cache utilities for chat message management
 * Centralizes dedupe/merge logic to reduce fragility
 */

import { InfiniteData } from '@tanstack/react-query';

import { ChatMessage, MessagesResponse } from '@/types/chat-v2';

export interface CacheUpdateResult {
  updated: boolean;
  cache: InfiniteData<MessagesResponse>;
}

// Type for simplified last message in conversations cache
export interface ConversationLastMessage {
  id: string;
  content: string;
  created_at: string;
  sender: {
    id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
}

// Type for conversations cache data
export interface ConversationsCache {
  pages: Array<{
    conversations: Array<{
      id: string;
      last_message?: ChatMessage | ConversationLastMessage | null;
      last_message_at?: string | null;
      unread_count?: number;
      [key: string]: unknown;
    }>;
    [key: string]: unknown;
  }>;
  pageParams: unknown[];
}

// Type for single-page conversations cache
export interface SinglePageConversationsCache {
  conversations: Array<{
    id: string;
    last_message?: ChatMessage | ConversationLastMessage | null;
    unread_count?: number;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

// Union type for conversations cache
export type AnyConversationsCache =
  | ConversationsCache
  | SinglePageConversationsCache
  | null
  | undefined;

/**
 * Safely merge a new message into the infinite query cache
 * Handles race conditions and maintains correct page ordering
 */
export function mergeMessageIntoCache(
  existingCache: InfiniteData<MessagesResponse> | undefined,
  newMessage: ChatMessage,
): CacheUpdateResult {
  // Handle race condition - seed cache if it doesn't exist yet
  if (!existingCache) {
    console.log(
      '🌱 [CacheUtils] Seeding cache with new message:',
      newMessage.id,
    );
    return {
      updated: true,
      cache: {
        pages: [
          {
            messages: [newMessage],
            has_more: false,
          },
        ],
        pageParams: [undefined],
      },
    };
  }

  // Check for duplicates across all pages
  const messageExists = existingCache.pages.some((page) => {
    return page.messages.some((msg) => {
      return (
        msg.id === newMessage.id ||
        (msg.optimistic_id &&
          newMessage.optimistic_id &&
          msg.optimistic_id === newMessage.optimistic_id)
      );
    });
  });

  if (messageExists) {
    return {
      updated: false,
      cache: existingCache,
    };
  }

  // Append to the last page (newest messages)
  const newPages = [...existingCache.pages];
  if (newPages.length > 0) {
    const lastPageIndex = newPages.length - 1;
    const lastPage = newPages[lastPageIndex];
    if (lastPage) {
      newPages[lastPageIndex] = {
        ...lastPage,
        messages: [...lastPage.messages, newMessage],
        has_more: lastPage.has_more ?? false,
      };

      console.log('✅ [CacheUtils] Message added to cache:', newMessage.id);
    }
  }

  return {
    updated: true,
    cache: {
      ...existingCache,
      pages: newPages,
    },
  };
}

/**
 * Replace an optimistic message with the real message
 */
export function replaceOptimisticMessage(
  existingCache: InfiniteData<MessagesResponse> | undefined,
  realMessage: ChatMessage & { optimisticId: string },
): CacheUpdateResult {
  if (!existingCache) {
    return {
      updated: false,
      cache: {
        pages: [],
        pageParams: [],
      },
    };
  }

  const newPages = existingCache.pages.map((page) => ({
    ...page,
    messages: page.messages.map((msg) => {
      if (msg.optimistic_id === realMessage.optimisticId) {
        const { optimisticId, ...messageWithoutOptimisticId } = realMessage;
        return messageWithoutOptimisticId as ChatMessage;
      }
      return msg;
    }),
  }));

  return {
    updated: true,
    cache: { ...existingCache, pages: newPages },
  };
}

/**
 * Remove an optimistic message (on error)
 */
export function removeOptimisticMessage(
  existingCache: InfiniteData<MessagesResponse> | undefined,
  optimisticId: string,
): CacheUpdateResult {
  if (!existingCache) {
    return {
      updated: false,
      cache: {
        pages: [],
        pageParams: [],
      },
    };
  }

  const newPages = existingCache.pages.map((page) => ({
    ...page,
    messages: page.messages.filter((msg) => msg.optimistic_id !== optimisticId),
  }));

  return {
    updated: true,
    cache: { ...existingCache, pages: newPages },
  };
}

/**
 * Update conversation last message in conversations cache
 * Handles both single-page and infinite query formats
 */
export function updateConversationLastMessage(
  conversationsCache: AnyConversationsCache,
  conversationId: string,
  message: ChatMessage,
  currentUserId?: string,
  isActiveConversation = false,
): AnyConversationsCache {
  if (!conversationsCache) {
    return conversationsCache;
  }

  // Handle infinite query format (with pages)
  if (
    'pages' in conversationsCache &&
    conversationsCache.pages &&
    Array.isArray(conversationsCache.pages)
  ) {
    const updatedPages = conversationsCache.pages.map((page) => ({
      ...page,
      conversations: page.conversations.map(
        (conv: {
          id: string;
          unread_count?: number;
          [key: string]: unknown;
        }) => {
          if (conv.id === conversationId) {
            return {
              ...conv,
              last_message: message,
              last_message_at: message.created_at,
              // Only increment unread count if this isn't the active conversation
              // and the message isn't from the current user
              unread_count:
                isActiveConversation || message.sender_id === currentUserId
                  ? conv.unread_count || 0
                  : (conv.unread_count || 0) + 1,
            };
          }
          return conv;
        },
      ),
    }));

    return { ...conversationsCache, pages: updatedPages };
  }

  // Handle single-page format (with conversations array)
  if (
    'conversations' in conversationsCache &&
    conversationsCache.conversations &&
    Array.isArray(conversationsCache.conversations)
  ) {
    const lastMessage: ConversationLastMessage = {
      id: message.id,
      content: message.content,
      created_at: message.created_at || new Date().toISOString(),
      sender: message.sender,
    };

    const updatedConversations = conversationsCache.conversations.map(
      (conv) => {
        if (conv.id === conversationId) {
          return {
            ...conv,
            last_message: lastMessage,
            // Increment unread count if message is from someone else
            unread_count:
              message.sender_id !== currentUserId
                ? (conv.unread_count || 0) + 1
                : conv.unread_count || 0,
          };
        }
        return conv;
      },
    );

    return { ...conversationsCache, conversations: updatedConversations };
  }

  return conversationsCache;
}
