'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

import { chatApiClient } from '@/lib/chat/api-client';
import { realtimeService } from '@/lib/chat/realtime-service';

import type { MessageWithSender, TypingIndicator } from '@/lib/chat/types';
import type { Database } from '@/lib/database.types';

type ConversationWithDetails = Database['public']['Tables']['conversations']['Row'] & {
  unread_count: number;
  last_message: {
    id: string;
    content: string;
    created_at: string;
    sender: {
      id: string;
      full_name: string | null;
      username: string | null;
      avatar_url: string | null;
      email?: string | null;
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

interface ChatStateV2 {
  conversations: ConversationWithDetails[];
  activeConversationId: string | undefined;
  messages: MessageWithSender[];
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  isSendingMessage: boolean;
  error: string | undefined;
  hasMoreMessages: boolean;
  oldestMessageTimestamp: string | undefined;
}

/**
 * The public API returned by the useChatV2 hook.
 * Keeping this in‑file avoids an export cycle while satisfying
 * @typescript-eslint/explicit-function-return-type.
 */
interface UseChatV2Return {
  conversations: ConversationWithDetails[];
  activeConversation: ConversationWithDetails | undefined;
  messages: MessageWithSender[];
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  isSendingMessage: boolean;
  error: string | undefined;
  hasMoreMessages: boolean;
  typingUsers: TypingIndicator[];
  onlineUsers: Set<string>;
  loadConversations: () => Promise<void>;
  setActiveConversation: (conversationId: string | undefined) => Promise<void>;
  sendMessage: (params: {
    content: string;
    message_type?: 'text' | 'image' | 'file' | 'system';
    reply_to_id?: string;
    metadata?: Record<string, unknown>;
  }) => Promise<MessageWithSender | undefined>;
  createConversation: (params: {
    title?: string;
    type: 'direct' | 'group' | 'channel';
    description?: string;
    is_private?: boolean;
    participant_ids: string[];
  }) => Promise<ConversationWithDetails | undefined>;
  loadMoreMessages: () => Promise<void>;
  startTyping: () => void;
  stopTyping: () => void;
  addReaction: (messageId: string, emoji: string) => Promise<void>;
  removeReaction: (messageId: string, emoji: string) => Promise<void>;
  searchMessages: (query: string, conversationId?: string) => Promise<MessageWithSender[]>;
  clearError: () => void;
  isUserOnline: (userId: string) => boolean;
}

const MESSAGES_PER_PAGE = 50;
const ENABLE_REALTIME = true;

// Helper function to normalize sender data
const normalizeSender = (sender: MessageWithSender['sender']): {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  email?: string | null;
} | null => {
  if (!sender) return null;
  
  return {
    id: sender.id,
    full_name: sender.full_name,
    username: sender.username,
    avatar_url: sender.avatar_url,
    email: sender.email,
  };
};

export const useChatV2 = (): UseChatV2Return => {
  const [state, setState] = useState<ChatStateV2>({
    conversations: [],
    activeConversationId: undefined,
    messages: [],
    isLoadingConversations: false,
    isLoadingMessages: false,
    isSendingMessage: false,
    error: undefined,
    hasMoreMessages: true,
    oldestMessageTimestamp: undefined,
  });

  const [typingUsers, setTypingUsers] = useState<TypingIndicator[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const initialized = useRef(false);

  /**
   * Load conversations from the server
   */
  const loadConversations = useCallback(async () => {
    setState(prev => ({ ...prev, isLoadingConversations: true, error: undefined }));
    
    try {
      const { conversations } = await chatApiClient.getConversations();
      setState(prev => ({
        ...prev,
        conversations,
        isLoadingConversations: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load conversations',
        isLoadingConversations: false,
      }));
    }
  }, []);

  /**
   * Load messages for a conversation
   */
  const loadMessages = useCallback(async (conversationId: string, loadMore = false) => {
    setState(prev => ({ ...prev, isLoadingMessages: true, error: undefined }));
    
    try {
      // Get current state to determine options
      let currentOldestTimestamp: string | undefined;
      setState(prev => {
        currentOldestTimestamp = prev.oldestMessageTimestamp;
        return prev;
      });

      const options =
        loadMore && currentOldestTimestamp !== undefined
          ? { before: currentOldestTimestamp, limit: MESSAGES_PER_PAGE }
          : { limit: MESSAGES_PER_PAGE };

      const newMessages = await chatApiClient.getMessages(conversationId, options);
      
      // API returns messages newest-first, but we want oldest-first for display
      const sortedMessages = [...newMessages].reverse();
      
      setState(prev => ({
        ...prev,
        messages: loadMore 
          ? [...sortedMessages, ...prev.messages]
          : sortedMessages,
        isLoadingMessages: false,
        hasMoreMessages: newMessages.length === MESSAGES_PER_PAGE,
        oldestMessageTimestamp: newMessages.length > 0
          ? (newMessages[newMessages.length - 1].created_at ?? undefined)
          : prev.oldestMessageTimestamp,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load messages',
        isLoadingMessages: false,
      }));
    }
  }, []); // Remove dependency on state.oldestMessageTimestamp to break circular dependency

  /**
   * Set active conversation
   */
  const setActiveConversation = useCallback(async (conversationId: string | undefined) => {
    // Unsubscribe from previous conversation
    if (state.activeConversationId !== undefined && ENABLE_REALTIME) {
      void realtimeService.unsubscribeFromConversation(state.activeConversationId);
    }

    setState(prev => ({ 
      ...prev, 
      activeConversationId: conversationId,
      messages: [],
      hasMoreMessages: true,
      oldestMessageTimestamp: undefined,
    }));

    if (conversationId === undefined) return;

    // Load initial messages
    await loadMessages(conversationId);

    // Mark as read
    try {
      const { unread_count } = await chatApiClient.markAsRead(conversationId);
      
      // Update unread count in conversations list
      setState(prev => ({
        ...prev,
        conversations: prev.conversations.map(conv =>
          conv.id === conversationId
            ? { ...conv, unread_count }
            : conv
        ),
      }));
    } catch (error) {
      console.error('Failed to mark messages as read:', error);
    }

    // Subscribe to real-time updates
    if (ENABLE_REALTIME) {
      await realtimeService.subscribeToConversation(conversationId, {
        onMessage: (message: MessageWithSender) => {
          setState(prev => {
            // Check for duplicates
            if (prev.messages.some(m => m.id === message.id)) {
              return prev;
            }
            
            return {
              ...prev,
              messages: [...prev.messages, message],
            };
          });

          // Update last message in conversations
          setState(prev => ({
            ...prev,
            conversations: prev.conversations.map(conv =>
              conv.id === conversationId
                ? {
                    ...conv,
                    last_message: {
                      id: message.id,
                      content: message.content,
                      created_at: message.created_at ?? new Date().toISOString(),
                      sender: normalizeSender(message.sender),
                    },
                    last_message_at: message.created_at,
                  }
                : conv
            ),
          }));
        },

        onMessageUpdate: (message: MessageWithSender) => {
          setState(prev => ({
            ...prev,
            messages: prev.messages.map(m => m.id === message.id ? message : m),
          }));
        },

        onMessageDelete: (messageId: string) => {
          setState(prev => ({
            ...prev,
            messages: prev.messages.filter(m => m.id !== messageId),
          }));
        },

        onTyping: (typing: TypingIndicator[]) => {
          setTypingUsers(typing);
        },

        onUserJoin: (userId: string) => {
          setOnlineUsers(prev => new Set([...prev, userId]));
        },

        onUserLeave: (userId: string) => {
          setOnlineUsers(prev => {
            const newSet = new Set(prev);
            newSet.delete(userId);
            return newSet;
          });
        },
      });
    }
  }, [state.activeConversationId, loadMessages]);

  /**
   * Send a message
   */
  const sendMessage = useCallback(async (params: {
    content: string;
    message_type?: 'text' | 'image' | 'file' | 'system';
    reply_to_id?: string;
    metadata?: Record<string, unknown>;
  }) => {
    if (state.activeConversationId === undefined) return undefined;

    setState(prev => ({ ...prev, isSendingMessage: true, error: undefined }));

    try {
      // Stop typing indicator
      if (ENABLE_REALTIME) {
        void realtimeService.broadcastTypingStop(state.activeConversationId);
      }

      const message = await chatApiClient.sendMessage({
        conversation_id: state.activeConversationId,
        ...params,
      });

      // Add to local state immediately (real-time will handle duplicates)
      setState(prev => ({
        ...prev,
        messages: [...prev.messages, message],
        isSendingMessage: false,
      }));

      // Update conversation last message
      setState(prev => ({
        ...prev,
        conversations: prev.conversations.map(conv =>
          conv.id === state.activeConversationId
            ? {
                ...conv,
                last_message: {
                  id: message.id,
                  content: message.content,
                  created_at: message.created_at ?? new Date().toISOString(),
                  sender: normalizeSender(message.sender),
                },
                last_message_at: message.created_at,
              }
            : conv
        ),
      }));

      return message;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to send message',
        isSendingMessage: false,
      }));
      return undefined;
    }
  }, [state.activeConversationId]);

  /**
   * Create a new conversation
   */
  const createConversation = useCallback(async (params: {
    title?: string;
    type: 'direct' | 'group' | 'channel';
    description?: string;
    is_private?: boolean;
    participant_ids: string[];
  }): Promise<ConversationWithDetails | undefined> => {
    try {
      const conversation = await chatApiClient.createConversation(params);
      
      if (conversation === null || conversation === undefined) {
        return undefined;
      }

      // Transform the basic conversation to ConversationWithDetails format
      const conversationWithDetails: ConversationWithDetails = {
        ...conversation,
        unread_count: 0,
        last_message: null,
        participants: [],
      };
      
      // Reload conversations to get the new one with full details
      await loadConversations();
      
      return conversationWithDetails;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to create conversation',
      }));
      return undefined;
    }
  }, [loadConversations]);

  /**
   * Load more messages (pagination)
   */
  const loadMoreMessages = useCallback(async () => {
    if (
      state.activeConversationId === undefined ||
      !state.hasMoreMessages ||
      state.isLoadingMessages
    ) {
      return;
    }

    await loadMessages(state.activeConversationId, true);
  }, [state.activeConversationId, state.hasMoreMessages, state.isLoadingMessages, loadMessages]);

  /**
   * Typing indicators
   */
  const startTyping = useCallback(() => {
    if (state.activeConversationId !== undefined && ENABLE_REALTIME) {
      void realtimeService.broadcastTypingStart(state.activeConversationId);
    }
  }, [state.activeConversationId]);

  const stopTyping = useCallback(() => {
    if (state.activeConversationId !== undefined && ENABLE_REALTIME) {
      void realtimeService.broadcastTypingStop(state.activeConversationId);
    }
  }, [state.activeConversationId]);

  /**
   * Reactions
   */
  const addReaction = useCallback(async (messageId: string, emoji: string) => {
    try {
      await chatApiClient.addReaction(messageId, emoji);
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to add reaction',
      }));
    }
  }, []);

  const removeReaction = useCallback(async (messageId: string, emoji: string) => {
    try {
      await chatApiClient.removeReaction(messageId, emoji);
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to remove reaction',
      }));
    }
  }, []);

  /**
   * Search messages
   */
  const searchMessages = useCallback(async (query: string, conversationId?: string) => {
    try {
      return await chatApiClient.searchMessages(query, conversationId);
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to search messages',
      }));
      return [];
    }
  }, []);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: undefined }));
  }, []);

  /**
   * Initialize on mount
   */
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      void loadConversations();
    }

    return () => {
      // Cleanup: unsubscribe from active conversation
      if (state.activeConversationId !== undefined && ENABLE_REALTIME) {
        void realtimeService.unsubscribeFromConversation(state.activeConversationId);
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    // State
    conversations: state.conversations,
    activeConversation: state.conversations.find(c => c.id === state.activeConversationId),
    messages: state.messages,
    isLoadingConversations: state.isLoadingConversations,
    isLoadingMessages: state.isLoadingMessages,
    isSendingMessage: state.isSendingMessage,
    error: state.error,
    hasMoreMessages: state.hasMoreMessages,
    typingUsers,
    onlineUsers,

    // Actions
    loadConversations,
    setActiveConversation,
    sendMessage,
    createConversation,
    loadMoreMessages,
    startTyping,
    stopTyping,
    addReaction,
    removeReaction,
    searchMessages,
    clearError,

    // Helpers
    isUserOnline: (userId: string) => onlineUsers.has(userId),
  };
}