'use client';

import { API_ROUTES } from '@/lib/constants/api-routes';

import type { MessageWithSender, ConversationWithParticipants } from './types';

/**
 * Chat API Client - Updated to use tenant-scoped routes
 *
 * This client now uses the modern /api/tenants/[tenantId]/conversations
 * endpoints instead of the deprecated /api/chat/conversations route.
 */

// Type definitions for API responses
interface TenantsResponse {
  tenants?: Array<{
    tenant_id: string;
    is_personal: boolean;
    [key: string]: unknown;
  }>;
}

interface ErrorResponse {
  error?: string;
  [key: string]: unknown;
}

/**
 * Fetch conversations for a specific tenant
 */
export async function fetchTenantConversations(tenantId: string) {
  const response = await fetch(`/api/tenants/${tenantId}/conversations`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = (await response
      .json()
      .catch(() => ({}))) as ErrorResponse;
    throw new Error(
      errorData.error || `Failed to fetch conversations: ${response.status}`,
    );
  }

  return response.json();
}

/**
 * @deprecated Legacy function - use fetchTenantConversations instead
 * This function is maintained for backward compatibility during migration
 */
export async function fetchConversations() {
  // For backward compatibility, we need to get the user's personal tenant
  // and then fetch conversations for that tenant
  try {
    // First, get user tenants to find personal tenant
    const tenantsResponse = await fetch('/api/user/tenants');
    if (!tenantsResponse.ok) {
      throw new Error('Failed to fetch user tenants');
    }

    const tenantsData = (await tenantsResponse.json()) as TenantsResponse;
    const personalTenant = tenantsData.tenants?.find((t) => t.is_personal);

    if (!personalTenant) {
      throw new Error('No personal tenant found');
    }

    // Use the new tenant-scoped endpoint
    return await fetchTenantConversations(personalTenant.tenant_id);
  } catch (error) {
    console.error('Error in legacy fetchConversations:', error);
    throw error;
  }
}

export class ChatApiClient {
  /**
   * @deprecated Use fetchTenantConversations instead for better performance
   * Fetch user's conversations with unread counts and participants
   */
  async getConversations(): Promise<{
    conversations: ConversationWithParticipants[];
  }> {
    try {
      // Get user's personal tenant and use the optimized endpoint
      const tenantsResponse = await fetch('/api/user/tenants');
      if (!tenantsResponse.ok) {
        throw new Error('Failed to fetch user tenants');
      }

      const tenantsData = (await tenantsResponse.json()) as TenantsResponse;
      const personalTenant = tenantsData.tenants?.find((t) => t.is_personal);

      if (!personalTenant) {
        throw new Error('No personal tenant found');
      }

      // Use the new optimized tenant-scoped endpoint
      return await fetchTenantConversations(personalTenant.tenant_id);
    } catch (error) {
      console.error('Error in getConversations:', error);
      throw error;
    }
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
    options?: { before?: string; limit?: number },
  ): Promise<MessageWithSender[]> {
    const params = new URLSearchParams();
    if (options?.before !== undefined && options?.before !== null) {
      params.append('before', options.before);
    }
    if (
      options?.limit !== undefined &&
      options?.limit !== null &&
      options?.limit !== 0
    ) {
      params.append('limit', options.limit.toString());
    }

    const response = await fetch(
      `${API_ROUTES.CHAT_CONVERSATION_MESSAGES(conversationId)}?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    if (!response.ok) {
      const error = (await response.json()) as ErrorResponse;
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
    const response = await fetch(
      API_ROUTES.CHAT_CONVERSATION_MESSAGE(params.conversation_id),
      {
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
      },
    );

    if (!response.ok) {
      const error = (await response.json()) as ErrorResponse;
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
    const response = await fetch(
      API_ROUTES.CHAT_CONVERSATION_READ(conversationId),
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    if (!response.ok) {
      const error = (await response.json()) as ErrorResponse;
      throw new Error(error.error ?? 'Failed to mark as read');
    }

    return response.json() as Promise<{
      success: boolean;
      last_read_at: string;
      unread_count: number;
    }>;
  }

  /**
   * Create a conversation in a specific tenant
   */
  async createTenantConversation(
    tenantId: string,
    conversationData: {
      title?: string;
      type: 'direct' | 'group' | 'channel';
      description?: string;
      is_private?: boolean;
      participant_ids: string[];
    },
  ): Promise<ConversationWithParticipants> {
    const response = await fetch(`/api/tenants/${tenantId}/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(conversationData),
    });

    if (!response.ok) {
      const errorData = (await response
        .json()
        .catch(() => ({}))) as ErrorResponse;
      throw new Error(
        errorData.error || `Failed to create conversation: ${response.status}`,
      );
    }

    return response.json() as Promise<ConversationWithParticipants>;
  }

  /**
   * @deprecated Legacy function - use createTenantConversation instead
   */
  async createConversation(conversationData: {
    title?: string;
    type: 'direct' | 'group' | 'channel';
    description?: string;
    is_private?: boolean;
    participant_ids: string[];
  }): Promise<ConversationWithParticipants> {
    try {
      // Get user's personal tenant
      const tenantsResponse = await fetch('/api/user/tenants');
      if (!tenantsResponse.ok) {
        throw new Error('Failed to fetch user tenants');
      }

      const tenantsData = (await tenantsResponse.json()) as TenantsResponse;
      const personalTenant = tenantsData.tenants?.find((t) => t.is_personal);

      if (!personalTenant) {
        throw new Error('No personal tenant found');
      }

      return await this.createTenantConversation(
        personalTenant.tenant_id,
        conversationData,
      );
    } catch (error) {
      console.error('Error in legacy createConversation:', error);
      throw error;
    }
  }

  /**
   * Leave a conversation
   */
  async leaveConversation(conversationId: string): Promise<void> {
    try {
      // For leaving, we need to determine which tenant the conversation belongs to
      // This requires a different approach since we need the tenant context

      // For now, try the personal tenant approach
      const tenantsResponse = await fetch('/api/user/tenants');
      if (!tenantsResponse.ok) {
        throw new Error('Failed to fetch user tenants');
      }

      const tenantsData = (await tenantsResponse.json()) as TenantsResponse;
      const personalTenant = tenantsData.tenants?.find((t) => t.is_personal);

      if (!personalTenant) {
        throw new Error('No personal tenant found');
      }

      const response = await fetch(
        `/api/tenants/${personalTenant.tenant_id}/conversations/${conversationId}/leave`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        const errorData = (await response
          .json()
          .catch(() => ({}))) as ErrorResponse;
        throw new Error(
          errorData.error || `Failed to leave conversation: ${response.status}`,
        );
      }

      return response.json();
    } catch (error) {
      console.error('Error leaving conversation:', error);
      throw error;
    }
  }

  /**
   * Search messages across conversations or within a specific one
   */
  async searchMessages(
    query: string,
    conversationId?: string,
  ): Promise<MessageWithSender[]> {
    const params = new URLSearchParams({ q: query });
    if (conversationId !== undefined && conversationId !== null) {
      params.append('conversationId', conversationId);
    }

    const response = await fetch(
      `${API_ROUTES.CHAT_SEARCH}?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    if (!response.ok) {
      const error = (await response.json()) as ErrorResponse;
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
      const error = (await response.json()) as ErrorResponse;
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
      const error = (await response.json()) as ErrorResponse;
      throw new Error(error.error ?? 'Failed to remove reaction');
    }
  }

  /**
   * Delete (soft) a message
   */
  async deleteMessage(
    messageId: string,
    conversationId?: string,
  ): Promise<void> {
    // conversationId optional for convenience, construct if provided else caller must send full path constant
    const endpoint = conversationId
      ? API_ROUTES.CHAT_MESSAGE_DELETE(conversationId, messageId)
      : `/api/chat/messages/${messageId}`;

    const response = await fetch(endpoint, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const error = (await response.json().catch(() => ({}))) as ErrorResponse;
      throw new Error(error.error ?? 'Failed to delete message');
    }
  }

  /** Delete chat for me */
  async deleteConversationForMe(conversationId: string): Promise<void> {
    const response = await fetch(
      API_ROUTES.CHAT_CONVERSATION_DELETE_FOR_ME(conversationId),
      {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      },
    );

    if (!response.ok) {
      const error = (await response.json().catch(() => ({}))) as ErrorResponse;
      throw new Error(error.error ?? 'Failed to delete conversation');
    }
  }
}

export const chatApiClient = new ChatApiClient();
