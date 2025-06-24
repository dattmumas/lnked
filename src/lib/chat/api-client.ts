'use client';

import { API_ROUTES } from '@/lib/constants/api-routes';

import type { MessageWithSender, ConversationWithParticipants } from './types';

export class ChatApiClient {
  /**
   * Fetch user's conversations with unread counts and participants
   */
  async getConversations(): Promise<{ conversations: ConversationWithParticipants[] }> {
    const response = await fetch(API_ROUTES.CHAT_CONVERSATIONS, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json() as { error?: string };
      throw new Error(error.error ?? 'Failed to fetch conversations');
    }

    return response.json() as Promise<{ conversations: ConversationWithParticipants[] }>;
  }

  /**
   * Fetch a single conversation by ID
   * NOTE: Currently unused - we get individual conversations from the conversations list
   */
  // async getConversation(conversationId: string): Promise<ConversationWithParticipants> {
  //   const response = await fetch(`${API_ROUTES.CHAT_CONVERSATIONS}/${conversationId}`, {
  //     method: 'GET',
  //     headers: {
  //       'Content-Type': 'application/json',
  //     },
  //   });

  //   if (!response.ok) {
  //     const error = await response.json() as { error?: string };
  //     throw new Error(error.error ?? 'Failed to fetch conversation');
  //   }

  //   return response.json() as Promise<ConversationWithParticipants>;
  // }

  /**
   * Fetch messages for a conversation with pagination
   */
  async getMessages(
    conversationId: string,
    options?: { before?: string; limit?: number }
  ): Promise<MessageWithSender[]> {
    const params = new URLSearchParams();
    if (options?.before !== undefined && options?.before !== null) {
      params.append('before', options.before);
    }
    if (options?.limit !== undefined && options?.limit !== null && options?.limit !== 0) {
      params.append('limit', options.limit.toString());
    }

    const response = await fetch(
      `${API_ROUTES.CHAT_CONVERSATION_MESSAGES(conversationId)}?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.json() as { error?: string };
      throw new Error(error.error ?? 'Failed to fetch messages');
    }

    return response.json() as Promise<MessageWithSender[]>;
  }

  /**
   * Send a message to a conversation
   */
  async sendMessage(params: {
    conversation_id: string;
    content: string;
    message_type?: 'text' | 'image' | 'file' | 'system';
    reply_to_id?: string;
    metadata?: Record<string, unknown>;
  }): Promise<MessageWithSender> {
    const response = await fetch(API_ROUTES.CHAT_CONVERSATION_MESSAGE(params.conversation_id), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: params.content,
        message_type: params.message_type || 'text',
        reply_to_id: params.reply_to_id,
        metadata: params.metadata,
      }),
    });

    if (!response.ok) {
      const error = await response.json() as { error?: string };
      throw new Error(error.error ?? 'Failed to send message');
    }

    return response.json() as Promise<MessageWithSender>;
  }

  /**
   * Mark messages in a conversation as read
   */
  async markAsRead(conversationId: string): Promise<{
    success: boolean;
    last_read_at: string;
    unread_count: number;
  }> {
    const response = await fetch(API_ROUTES.CHAT_CONVERSATION_READ(conversationId), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json() as { error?: string };
      throw new Error(error.error ?? 'Failed to mark as read');
    }

    return response.json() as Promise<{
      success: boolean;
      last_read_at: string;
      unread_count: number;
    }>;
  }

  /**
   * Create a new conversation
   */
  async createConversation(params: {
    title?: string;
    type: 'direct' | 'group' | 'channel';
    description?: string;
    is_private?: boolean;
    participant_ids: string[];
  }): Promise<ConversationWithParticipants> {
    try {
      const response = await fetch(API_ROUTES.CHAT_CONVERSATIONS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errorData: unknown = await response.json().catch(() => ({ error: 'Unknown error' }));
        const errorMessage = (errorData as { error?: string }).error ?? 'Failed to create conversation';
        console.error('Create conversation failed:', response.status, errorMessage);
        throw new Error(errorMessage);
      }

      const data = await response.json() as { conversation: ConversationWithParticipants; existing: boolean };
      
      if (data.conversation === null || data.conversation === undefined) {
        console.error('Invalid response structure:', data);
        throw new Error('Invalid response from server');
      }
      
      return data.conversation;
    } catch (error) {
      console.error('Create conversation error:', error);
      throw error;
    }
  }

  /**
   * Leave a conversation
   */
  async leaveConversation(conversationId: string): Promise<void> {
    const response = await fetch(`${API_ROUTES.CHAT_CONVERSATIONS}/${conversationId}/leave`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json() as { error?: string };
      throw new Error(error.error ?? 'Failed to leave conversation');
    }
  }

  /**
   * Search messages across conversations or within a specific one
   */
  async searchMessages(
    query: string,
    conversationId?: string
  ): Promise<MessageWithSender[]> {
    const params = new URLSearchParams({ q: query });
    if (conversationId !== undefined && conversationId !== null) {
      params.append('conversationId', conversationId);
    }

    const response = await fetch(`${API_ROUTES.CHAT_SEARCH}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json() as { error?: string };
      throw new Error(error.error ?? 'Failed to search messages');
    }

    return response.json() as Promise<MessageWithSender[]>;
  }

  /**
   * Add a reaction to a message
   */
  async addReaction(messageId: string, emoji: string): Promise<void> {
    const response = await fetch(API_ROUTES.CHAT_MESSAGE_REACTIONS(messageId), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ emoji }),
    });

    if (!response.ok) {
      const error = await response.json() as { error?: string };
      throw new Error(error.error ?? 'Failed to add reaction');
    }
  }

  /**
   * Remove a reaction from a message
   */
  async removeReaction(messageId: string, emoji: string): Promise<void> {
    const response = await fetch(API_ROUTES.CHAT_MESSAGE_REACTIONS(messageId), {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ emoji }),
    });

    if (!response.ok) {
      const error = await response.json() as { error?: string };
      throw new Error(error.error ?? 'Failed to remove reaction');
    }
  }

  /**
   * Delete (soft) a message
   */
  async deleteMessage(messageId: string, conversationId?: string): Promise<void> {
    // conversationId optional for convenience, construct if provided else caller must send full path constant
    const endpoint = conversationId
      ? API_ROUTES.CHAT_MESSAGE_DELETE(conversationId, messageId)
      : `/api/chat/messages/${messageId}`;

    const response = await fetch(endpoint, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const error = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(error.error ?? 'Failed to delete message');
    }
  }

  /** Delete chat for me */
  async deleteConversationForMe(conversationId: string): Promise<void> {
    const response = await fetch(API_ROUTES.CHAT_CONVERSATION_DELETE_FOR_ME(conversationId), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const error = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(error.error ?? 'Failed to delete conversation');
    }
  }
}

export const chatApiClient = new ChatApiClient(); 