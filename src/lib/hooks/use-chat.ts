'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { chatService } from '@/lib/chat/chat-service';
import { realtimeService } from '@/lib/chat/realtime-service';
import type { Json } from '@/lib/database.types';
import type { 
  MessageWithSender, 
  TypingIndicator,
  ChatState, 
} from '@/lib/chat/types';

/**
 * React hook for managing chat state
 * Integrates with Supabase real-time functionality
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
/** Default number of messages to fetch per page */
const DEFAULT_MESSAGE_LIMIT = 50;

/** Background refresh interval (ms) for message polling */
const BACKGROUND_REFRESH_INTERVAL_MS = 30_000;

/** Flag to toggle realtime functionality. Useful for local testing */
const ENABLE_REALTIME = true;

export function useChat() {
  const [state, setState] = useState<ChatState>({
    conversations: [],
    activeConversation: null,
    messages: {},
    typing: {},
    isLoading: false,
    error: null,
  });

  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const initialized = useRef(false);
  const refreshInterval = useRef<NodeJS.Timeout | null>(null);

  /**
   * Load user's conversations
   */
  const loadConversations = useCallback(async (): Promise<void> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const { data, error } = await chatService.getConversations();
      
      if (error) throw error;
      
      setState(prev => ({
        ...prev,
        conversations: data || [],
        isLoading: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load conversations',
        isLoading: false,
      }));
    }
  }, []);

  /**
   * Load messages for a conversation
   */
  const loadMessages = useCallback(
    async (
      conversationId: string,
      limit: number = DEFAULT_MESSAGE_LIMIT,
      offset: number = 0,
    ): Promise<MessageWithSender[]> => {
    try {
      const { data, error } = await chatService.getMessages(conversationId, limit, offset);
      
      if (error !== null && error !== undefined) {
        throw error;
      }
      
      setState(prev => ({
        ...prev,
        messages: {
          ...prev.messages,
          [conversationId]: offset === 0 ? (data || []) : [
            ...(prev.messages[conversationId] || []),
            ...(data || [])
          ],
        },
      }));
      
      return data ?? [];
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load messages',
      }));
      return [];
    }
  }, []);

  /**
   * Send a message
   */
  const sendMessage = useCallback(async (
    data: {
      conversation_id: string;
      content: string;
      message_type?: 'text' | 'image' | 'file' | 'system';
      reply_to_id?: string;
      metadata?: Json;
    },
  ): Promise<MessageWithSender | null> => {
    try {
      // Stop typing indicator
      if (ENABLE_REALTIME) {
      realtimeService.broadcastTypingStop(data.conversation_id);
      }
      
      const { data: message, error } = await chatService.sendMessage(data);
      
      if (error !== null && error !== undefined) {
        throw error;
      }
      
      // Immediately add message to local state (don't wait for realtime)
      if (message) {
        setState(prev => ({
          ...prev,
          messages: {
            ...prev.messages,
            [data.conversation_id]: [
              ...(prev.messages[data.conversation_id] || []),
              message,
            ],
          },
        }));
        
        // Update conversation last message time
        setState(prev => ({
          ...prev,
          conversations: prev.conversations.map(conv =>
            conv.id === data.conversation_id
              ? { ...conv, last_message_at: message.created_at }
              : conv
          ),
        }));
      }
      
      return message ?? null;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to send message',
      }));
      return null;
    }
  }, []);

  /**
   * Create a new conversation
   */
  const createConversation = useCallback(async (
    data: {
      title?: string;
      type: 'direct' | 'group' | 'channel';
      description?: string;
      is_private?: boolean;
      participant_ids: string[];
    },
  ): Promise<unknown | null> => {
    try {
      const { data: conversation, error } = await chatService.createConversation(data);
      
      if (error !== null && error !== undefined) {
        throw error;
      }
      
      // Reload conversations to get the new one with full data
      await loadConversations();
      
      return conversation ?? null;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to create conversation',
      }));
      return null;
    }
  }, [loadConversations]);

  /**
   * Set active conversation and subscribe to real-time updates
   */
  const setActiveConversation = useCallback(async (conversationId: string | null): Promise<void> => {
    // Unsubscribe from previous conversation
    if (state.activeConversation !== null && ENABLE_REALTIME) {
      realtimeService.unsubscribeFromConversation(state.activeConversation);
    }
    
    // Clear any existing refresh interval
    if (refreshInterval.current) {
      clearInterval(refreshInterval.current);
      refreshInterval.current = null;
    }

    setState(prev => ({ ...prev, activeConversation: conversationId }));

    if (conversationId === null) return;

    // Load messages if not already loaded
    if (state.messages[conversationId] === undefined) {
      await loadMessages(conversationId);
    }

    // Mark messages as read
    try {
      await chatService.markMessagesAsRead(conversationId);
    } catch (error) {
      console.error('Failed to mark messages as read:', error);
    }

    // Subscribe to real-time updates (only if enabled)
    if (ENABLE_REALTIME) {
    await realtimeService.subscribeToConversation(conversationId, {
      onMessage: (message: MessageWithSender) => {
          setState(prev => {
            const existingMessages = prev.messages[conversationId] || [];
            // Check if message already exists (prevent duplicates)
            const messageExists = existingMessages.some(msg => msg.id === message.id);
            
            if (messageExists) {
              return prev; // Don't add duplicate
            }
            
            return {
          ...prev,
          messages: {
            ...prev.messages,
            [conversationId]: [
                  ...existingMessages,
              message,
            ],
          },
            };
          });
        
        // Update conversation last message time
        setState(prev => ({
          ...prev,
          conversations: prev.conversations.map(conv =>
            conv.id === conversationId
              ? { ...conv, last_message_at: message.created_at }
              : conv
          ),
        }));
      },

      onMessageUpdate: (message: MessageWithSender) => {
        setState(prev => ({
          ...prev,
          messages: {
            ...prev.messages,
            [conversationId]: (prev.messages[conversationId] || []).map(msg =>
              msg.id === message.id ? message : msg
            ),
          },
        }));
      },

      onMessageDelete: (messageId: string) => {
        setState(prev => ({
          ...prev,
          messages: {
            ...prev.messages,
            [conversationId]: (prev.messages[conversationId] || []).filter(msg =>
              msg.id !== messageId
            ),
          },
        }));
      },

      onTyping: (typing: TypingIndicator[]) => {
        setState(prev => ({
          ...prev,
          typing: {
            ...prev.typing,
            [conversationId]: typing,
          },
        }));
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
    } else {
       
      console.warn('Realtime disabled - using polling/manual refresh only');
    }
    
    // Set up auto-refresh as backup (every 30 seconds)
    if (refreshInterval.current) {
      clearInterval(refreshInterval.current);
    }
    
    refreshInterval.current = setInterval(async () => {
      if (conversationId !== null) {
        // Silently refresh messages without changing loading state
        try {
          const { data } = await chatService.getMessages(
            conversationId,
            DEFAULT_MESSAGE_LIMIT,
            0,
          );
          if (data) {
            setState(prev => ({
              ...prev,
              messages: {
                ...prev.messages,
                [conversationId]: data,
              },
            }));
          }
        } catch (error) {
          // Silently ignore refresh errors
          console.warn('Background refresh failed:', error);
        }
      }
    }, BACKGROUND_REFRESH_INTERVAL_MS); // Refresh every 30 seconds
  }, [state.activeConversation, state.messages, loadMessages]);

  /**
   * Start typing indicator
   */
  const startTyping = useCallback((): void => {
    if (state.activeConversation !== null && ENABLE_REALTIME) {
      realtimeService.broadcastTypingStart(state.activeConversation);
    }
  }, [state.activeConversation]);

  /**
   * Stop typing indicator
   */
  const stopTyping = useCallback((): void => {
    if (state.activeConversation !== null && ENABLE_REALTIME) {
      realtimeService.broadcastTypingStop(state.activeConversation);
    }
  }, [state.activeConversation]);

  /**
   * Add reaction to message
   */
  const addReaction = useCallback(async (messageId: string, emoji: string): Promise<void> => {
    try {
      const { error } = await chatService.addReaction(messageId, emoji);
      if (error !== null && error !== undefined) {
        throw error;
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to add reaction',
      }));
    }
  }, []);

  /**
   * Remove reaction from message
   */
  const removeReaction = useCallback(async (messageId: string, emoji: string): Promise<void> => {
    try {
      const { error } = await chatService.removeReaction(messageId, emoji);
      if (error !== null && error !== undefined) {
        throw error;
      }
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
  const searchMessages = useCallback(async (
    query: string,
    conversationId?: string,
  ): Promise<MessageWithSender[]> => {
    try {
      const { data, error } = await chatService.searchMessages(query, conversationId);
      if (error !== null && error !== undefined) {
        throw error;
      }
      return data ?? [];
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
  const clearError = useCallback((): void => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  /**
   * Get typing users for active conversation
   */
  const getTypingUsers = useCallback((): TypingIndicator[] => {
    if (state.activeConversation === null) return [];
    return state.typing[state.activeConversation] || [];
  }, [state.activeConversation, state.typing]);

  /**
   * Get messages for active conversation
   */
  const getActiveMessages = useCallback((): MessageWithSender[] => {
    if (state.activeConversation === null) return [];
    return state.messages[state.activeConversation] || [];
  }, [state.activeConversation, state.messages]);

  /**
   * Get unread count for a conversation
   */
  const getUnreadCount = useCallback((conversationId: string): number => {
    const conversation = state.conversations.find(c => c.id === conversationId);
    return conversation?.unread_count || 0;
  }, [state.conversations]);

  /**
   * Check if user is online
   */
  const isUserOnline = useCallback((userId: string): boolean => {
    return onlineUsers.has(userId);
  }, [onlineUsers]);

  // Initialize chat on mount
  useEffect((): () => void => {
    if (initialized.current === false) {
      initialized.current = true;
      loadConversations();
    }

    // Cleanup on unmount
    return () => {
      if (ENABLE_REALTIME) {
      realtimeService.unsubscribeFromAll();
      }
      // Clear refresh interval
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
      }
    };
  }, [loadConversations]);

  return {
    // State
    conversations: state.conversations,
    activeConversation: state.activeConversation,
    messages: getActiveMessages(),
    isLoading: state.isLoading,
    error: state.error,
    typingUsers: getTypingUsers(),
    onlineUsers,

    // Actions
    loadConversations,
    loadMessages,
    sendMessage,
    createConversation,
    setActiveConversation,
    startTyping,
    stopTyping,
    addReaction,
    removeReaction,
    searchMessages,
    clearError,

    // Utilities
    getUnreadCount,
    isUserOnline,
    getActiveMessages,
    getTypingUsers,
  };
}

export type UseChatReturn = ReturnType<typeof useChat>; 