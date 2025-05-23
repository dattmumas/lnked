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

// Temporary flag to disable realtime for testing
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
  const loadConversations = useCallback(async () => {
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
  const loadMessages = useCallback(async (conversationId: string, limit = 50, offset = 0) => {
    try {
      const { data, error } = await chatService.getMessages(conversationId, limit, offset);
      
      if (error) throw error;
      
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
      
      return data || [];
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
  const sendMessage = useCallback(async (data: {
    conversation_id: string;
    content: string;
    message_type?: 'text' | 'image' | 'file' | 'system';
    reply_to_id?: string;
    metadata?: Json;
  }) => {
    try {
      // Stop typing indicator
      if (ENABLE_REALTIME) {
        realtimeService.broadcastTypingStop(data.conversation_id);
      }
      
      const { data: message, error } = await chatService.sendMessage(data);
      
      if (error) throw error;
      
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
      
      return message;
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
  const createConversation = useCallback(async (data: {
    title?: string;
    type: 'direct' | 'group' | 'channel';
    description?: string;
    is_private?: boolean;
    participant_ids: string[];
  }) => {
    try {
      const { data: conversation, error } = await chatService.createConversation(data);
      
      if (error) throw error;
      
      // Reload conversations to get the new one with full data
      await loadConversations();
      
      return conversation;
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
  const setActiveConversation = useCallback(async (conversationId: string | null) => {
    // Unsubscribe from previous conversation
    if (state.activeConversation && ENABLE_REALTIME) {
      realtimeService.unsubscribeFromConversation(state.activeConversation);
    }
    
    // Clear any existing refresh interval
    if (refreshInterval.current) {
      clearInterval(refreshInterval.current);
      refreshInterval.current = null;
    }

    setState(prev => ({ ...prev, activeConversation: conversationId }));

    if (!conversationId) return;

    // Load messages if not already loaded
    if (!state.messages[conversationId]) {
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
      realtimeService.subscribeToConversation(conversationId, {
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
      console.log('Realtime disabled - using polling/manual refresh only');
    }
    
    // Set up auto-refresh as backup (every 30 seconds)
    if (refreshInterval.current) {
      clearInterval(refreshInterval.current);
    }
    
    refreshInterval.current = setInterval(async () => {
      if (conversationId) {
        // Silently refresh messages without changing loading state
        try {
          const { data } = await chatService.getMessages(conversationId, 50, 0);
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
    }, 30000); // Refresh every 30 seconds
  }, [state.activeConversation, state.messages, loadMessages]);

  /**
   * Start typing indicator
   */
  const startTyping = useCallback(() => {
    if (state.activeConversation && ENABLE_REALTIME) {
      realtimeService.broadcastTypingStart(state.activeConversation);
    }
  }, [state.activeConversation]);

  /**
   * Stop typing indicator
   */
  const stopTyping = useCallback(() => {
    if (state.activeConversation && ENABLE_REALTIME) {
      realtimeService.broadcastTypingStop(state.activeConversation);
    }
  }, [state.activeConversation]);

  /**
   * Add reaction to message
   */
  const addReaction = useCallback(async (messageId: string, emoji: string) => {
    try {
      const { error } = await chatService.addReaction(messageId, emoji);
      if (error) throw error;
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
  const removeReaction = useCallback(async (messageId: string, emoji: string) => {
    try {
      const { error } = await chatService.removeReaction(messageId, emoji);
      if (error) throw error;
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
      const { data, error } = await chatService.searchMessages(query, conversationId);
      if (error) throw error;
      return data || [];
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
    setState(prev => ({ ...prev, error: null }));
  }, []);

  /**
   * Get typing users for active conversation
   */
  const getTypingUsers = useCallback(() => {
    if (!state.activeConversation) return [];
    return state.typing[state.activeConversation] || [];
  }, [state.activeConversation, state.typing]);

  /**
   * Get messages for active conversation
   */
  const getActiveMessages = useCallback(() => {
    if (!state.activeConversation) return [];
    return state.messages[state.activeConversation] || [];
  }, [state.activeConversation, state.messages]);

  /**
   * Get unread count for a conversation
   */
  const getUnreadCount = useCallback((conversationId: string) => {
    const conversation = state.conversations.find(c => c.id === conversationId);
    return conversation?.unread_count || 0;
  }, [state.conversations]);

  /**
   * Check if user is online
   */
  const isUserOnline = useCallback((userId: string) => {
    return onlineUsers.has(userId);
  }, [onlineUsers]);

  // Initialize chat on mount
  useEffect(() => {
    if (!initialized.current) {
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