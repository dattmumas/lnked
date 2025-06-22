'use client';

import { API_ROUTES } from '@/lib/constants/api-routes';

import type { MessageWithSender } from './types';
import type { Database } from '@/lib/database.types';

type ConversationWithDetails = Database['public']['Tables']['conversations']['Row'] & {
  unread_count: number;
  last_message: {
    id: string;
    content: string;
    created_at: string;
    sender: {
      id: string;
      username: string | null;
      full_name: string | null;
      avatar_url: string | null;
    };
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

export class ChatApiClient {
  /**
   * Fetch user's conversations with unread counts and participants
   */
  async getConversations(): Promise<{ conversations: ConversationWithDetails[] }> {
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

    return response.json() as Promise<{ conversations: ConversationWithDetails[] }>;
  }

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
    console.trace(`[ChatAPI] markAsRead called for conversation: ${conversationId}`);
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
  }): Promise<Database['public']['Tables']['conversations']['Row']> {
    const response = await fetch(API_ROUTES.CHAT_CONVERSATIONS, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json() as { error?: string };
      throw new Error(error.error ?? 'Failed to create conversation');
    }

    return response.json() as Promise<Database['public']['Tables']['conversations']['Row']>;
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
}

export const chatApiClient = new ChatApiClient(); 