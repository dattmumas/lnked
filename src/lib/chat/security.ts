/**
 * Chat security utilities
 * Provides application-level security checks in addition to database RLS policies
 */

import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export class ChatSecurity {
  private supabase = createSupabaseBrowserClient();

  /**
   * Check if user is a participant in a conversation
   */
  async isParticipant(conversationId: string, userId?: string): Promise<boolean> {
    try {
      const currentUser = userId || await this.getCurrentUserId();
      if (!currentUser) return false;

      const { data, error } = await this.supabase
        .from('conversation_participants')
        .select('id')
        .eq('conversation_id', conversationId)
        .eq('user_id', currentUser)
        .single();

      return !error && Boolean(data);
    } catch {
      return false;
    }
  }

  /**
   * Check if user is an admin of a conversation
   */
  async isConversationAdmin(conversationId: string, userId?: string | null): Promise<boolean> {
    try {
      const currentUser = userId || await this.getCurrentUserId();
      if (!currentUser) return false;

      const { data, error } = await this.supabase
        .from('conversation_participants')
        .select('role')
        .eq('conversation_id', conversationId)
        .eq('user_id', currentUser)
        .eq('role', 'admin')
        .single();

      return !error && Boolean(data);
    } catch {
      return false;
    }
  }

  /**
   * Check if user can send messages to a conversation
   */
  async canSendMessage(conversationId: string, userId?: string): Promise<boolean> {
    return this.isParticipant(conversationId, userId);
  }

  /**
   * Check if user can view a conversation
   */
  async canViewConversation(conversationId: string, userId?: string): Promise<boolean> {
    return this.isParticipant(conversationId, userId);
  }

  /**
   * Check if user can add participants to a conversation
   */
  async canAddParticipants(conversationId: string, userId?: string): Promise<boolean> {
    return this.isConversationAdmin(conversationId, userId);
  }

  /**
   * Check if user can remove participants from a conversation
   */
  async canRemoveParticipants(conversationId: string, userId?: string): Promise<boolean> {
    return this.isConversationAdmin(conversationId, userId);
  }

  /**
   * Check if user can edit a message
   */
  async canEditMessage(messageId: string, userId?: string): Promise<boolean> {
    try {
      const currentUser = userId || await this.getCurrentUserId();
      if (!currentUser) return false;

      const { data, error } = await this.supabase
        .from('messages')
        .select('sender_id')
        .eq('id', messageId)
        .eq('sender_id', currentUser)
        .single();

      return !error && Boolean(data);
    } catch {
      return false;
    }
  }

  /**
   * Check if user can delete a message
   */
  async canDeleteMessage(messageId: string, userId?: string): Promise<boolean> {
    try {
      const currentUser = userId || await this.getCurrentUserId();
      if (!currentUser) return false;

      // User can delete their own messages
      const { data: message } = await this.supabase
        .from('messages')
        .select('sender_id, conversation_id')
        .eq('id', messageId)
        .single();

      if (!message) return false;

      // Check if user is the sender
      if (message.sender_id === currentUser) return true;

      // Check if user is a conversation admin  
      // `currentUser` is guaranteed to be a string at this point due to the
      // null check above. Use a non-null assertion to satisfy the type checker.
      return await this.isConversationAdmin(
        message.conversation_id as string,
        currentUser!,
      );
    } catch {
      return false;
    }
  }

  /**
   * Validate that all participant IDs are valid users
   */
  async validateParticipants(participantIds: string[]): Promise<{
    valid: boolean;
    invalidIds: string[];
  }> {
    try {
      const { data: users, error } = await this.supabase
        .from('users')
        .select('id')
        .in('id', participantIds);

      if (error) throw error;

      const validIds = users?.map(u => u.id) || [];
      const invalidIds = participantIds.filter(id => !validIds.includes(id));

      return {
        valid: invalidIds.length === 0,
        invalidIds,
      };
    } catch {
      return {
        valid: false,
        invalidIds: participantIds,
      };
    }
  }

  /**
   * Get current authenticated user ID
   */
  private async getCurrentUserId(): Promise<string | null> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      return user?.id || null;
    } catch {
      return null;
    }
  }

  /**
   * Log security events for audit trail
   */
  async logSecurityEvent(event: {
    action: string;
    userId?: string;
    conversationId?: string;
    messageId?: string;
    details?: Record<string, unknown>;
    success: boolean;
  }): Promise<void> {
    try {
      // In a production environment, you might want to log to a dedicated security log table
      console.info('Chat Security Event:', {
        ...event,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }
}

/**
 * Server-side security utilities for SSR and API routes
 */
export class ServerChatSecurity {
  private supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>;

  constructor(supabaseClient: Awaited<ReturnType<typeof createServerSupabaseClient>>) {
    this.supabase = supabaseClient;
  }

  /**
   * Check if user is a participant in a conversation (server-side)
   */
  async isParticipant(conversationId: string, userId?: string): Promise<boolean> {
    try {
      const currentUser = userId || await this.getCurrentUserId();
      if (!currentUser) return false;

      const { data, error } = await this.supabase
        .from('conversation_participants')
        .select('id')
        .eq('conversation_id', conversationId)
        .eq('user_id', currentUser)
        .single();

      return !error && Boolean(data);
    } catch {
      return false;
    }
  }

  /**
   * Get current authenticated user ID (server-side)
   */
  private async getCurrentUserId(): Promise<string | null> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      return user?.id || null;
    } catch {
      return null;
    }
  }
}

// Export singleton instances
export const chatSecurity = new ChatSecurity();

// Export function to create server security instance
export const createServerChatSecurity = (supabaseClient: Awaited<ReturnType<typeof createServerSupabaseClient>>) => {
  return new ServerChatSecurity(supabaseClient);
}; 