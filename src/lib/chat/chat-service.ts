import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { Json } from '@/lib/database.types';
import type { 
  ConversationWithParticipants, 
  MessageWithSender, 
  ConversationInsert,
  MessageInsert,
  ConversationParticipantInsert 
} from './types';
import { chatSecurity } from './security';

/**
 * Chat service following Supabase's official patterns with enhanced security
 * Based on: https://supabase.com/docs/guides/realtime
 */

// Client-side chat service
export class ChatService {
  private supabase = createSupabaseBrowserClient();

  /**
   * Look up user by email
   */
  async getUserByEmail(email: string) {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('id, full_name, username, avatar_url')
        .eq('users.email', email) // This will need to be handled differently since email is in auth.users
        .single();

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  /**
   * Search users by email or username
   */
  async searchUsers(query: string) {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('id, full_name, username, avatar_url')
        .or(`full_name.ilike.%${query}%,username.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;

      return { data: data || [], error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  /**
   * Create a new conversation following Supabase patterns
   */
  async createConversation(data: {
    title?: string;
    type: 'direct' | 'group' | 'channel';
    description?: string;
    is_private?: boolean;
    participant_ids: string[];
  }) {
    try {
      const user = await this.getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      // Validate participant IDs are UUIDs, not emails
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const invalidIds = data.participant_ids.filter((id) => !uuidRegex.test(id));
      
      if (invalidIds.length > 0) {
        await chatSecurity.logSecurityEvent({
          action: 'create_conversation_denied',
          userId: user.id,
          success: false,
          details: { reason: 'Invalid participant IDs provided', invalidIds },
        });
        throw new Error(
          `Invalid participant IDs. Please provide valid user IDs, not emails: ${invalidIds.join(', ')}`,
        );
      }

      // Security check: Validate all participants exist
      const participantValidation = await chatSecurity.validateParticipants(data.participant_ids);
      if (!participantValidation.valid) {
        await chatSecurity.logSecurityEvent({
          action: 'create_conversation_denied',
          userId: user.id,
          success: false,
          details: { reason: 'Invalid participant IDs', invalidIds: participantValidation.invalidIds },
        });
        throw new Error(`Invalid participant IDs: ${participantValidation.invalidIds.join(', ')}`);
      }

      // Ensure the creator is not accidentally duplicated in participant list
      const uniqueParticipantIds = Array.from(new Set(data.participant_ids.filter((id) => id !== user.id)));

      // Check if all participants exist
      const { data: participants, error: participantError } = await this.supabase
        .from('users')
        .select('id')
        .in('id', uniqueParticipantIds);

      if (participantError) throw participantError;

      if (!participants || participants.length !== uniqueParticipantIds.length) {
        throw new Error('One or more participants not found');
      }

      // 1. Create conversation
      const conversationData: ConversationInsert = {
        title: data.title ?? null,
        type: data.type,
        description: data.description ?? null,
        is_private: data.is_private ?? true,
        created_by: user.id,
      } as ConversationInsert;

      const { data: conversation, error: conversationError } = await this.supabase
        .from('conversations')
        .insert(conversationData)
        .select()
        .single();

      if (conversationError) throw conversationError;

      // 2. Insert creator row first (required for RLS admin permissions)
      const { error: creatorInsertError } = await this.supabase
        .from('conversation_participants')
        .insert({
          conversation_id: conversation.id,
          user_id: user.id,
          role: 'admin',
          last_read_at: new Date().toISOString(),
          is_muted: false,
          is_pinned: false,
        });

      if (creatorInsertError) throw creatorInsertError;

      // 3. Insert other participants (role member)
      if (uniqueParticipantIds.length > 0) {
        const participantRows: ConversationParticipantInsert[] = uniqueParticipantIds.map((id) => ({
          conversation_id: conversation.id,
          user_id: id,
          role: 'member',
          last_read_at: new Date().toISOString(),
          is_muted: false,
          is_pinned: false,
        }));

        const { error: memberInsertError } = await this.supabase
          .from('conversation_participants')
          .insert(participantRows);

        if (memberInsertError) throw memberInsertError;
      }

      return { data: conversation, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  /**
   * Get user's conversations with participants and unread counts
   */
  async getConversations(): Promise<{ data: ConversationWithParticipants[] | null; error: Error | null }> {
    try {
      const user = await this.getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      // First, get all conversation IDs where the user is a participant
      const { data: userConversations, error: convError } = await this.supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (convError) throw convError;

      const conversationIds = (userConversations?.map(c => c.conversation_id).filter(id => id !== null) || []) as string[];

      if (conversationIds.length === 0) {
        return { data: [], error: null };
      }

      // Then fetch full conversation data with ALL participants
      const { data, error } = await this.supabase
        .from('conversations')
        .select(`
          *,
          created_by_user:users!conversations_created_by_fkey(id, full_name, username, avatar_url),
          participants:conversation_participants(
            *,
            user:users(id, full_name, username, avatar_url)
          )
        `)
        .in('id', conversationIds)
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      // Get last message for each conversation separately
      const conversationsWithLastMessage = await Promise.all(
        (data || []).map(async (conversation) => {
          const { data: messages } = await this.supabase
            .from('messages')
            .select(`
              *,
              sender:users!messages_sender_id_fkey(id, full_name, username, avatar_url)
            `)
            .eq('conversation_id', conversation.id)
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .limit(1);

          return {
            ...conversation,
            last_message: messages?.[0] || null,
          };
        }),
      );

      // Get unread counts for each conversation
      const conversationsWithUnread = await Promise.all(
        conversationsWithLastMessage.map(async (conversation) => {
          const { data: unreadCount } = await this.supabase.rpc('get_unread_message_count', {
              p_user_id: user.id,
              p_conversation_id: conversation.id,
            });

          return {
            ...conversation,
            unread_count: unreadCount || 0,
          } as ConversationWithParticipants;
        }),
      );

      return { data: conversationsWithUnread, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  /**
   * Get messages for a conversation with security checks
   */
  async getMessages(conversationId: string, limit = 50, offset = 0): Promise<{ data: MessageWithSender[] | null; error: Error | null }> {
    try {
      const user = await this.getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      // Security check: Verify user can view this conversation
      const canView = await chatSecurity.canViewConversation(conversationId, user.id);
      if (!canView) {
        await chatSecurity.logSecurityEvent({
          action: 'get_messages_denied',
          userId: user.id,
          conversationId: conversationId,
          success: false,
          details: { reason: 'User not authorized to view messages in this conversation' },
        });
        throw new Error('You are not authorized to view messages in this conversation');
      }

      const { data, error } = await this.supabase
        .from('messages')
        .select(`
          *,
          sender:users!messages_sender_id_fkey(id, full_name, username, avatar_url),
          reply_to:messages(
            *,
            sender:users!messages_sender_id_fkey(id, full_name, username, avatar_url)
          ),
          reactions:message_reactions(*)
        `)
        .eq('conversation_id', conversationId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return { data: (data || []).reverse() as unknown as MessageWithSender[], error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  /**
   * Send a message following Supabase patterns with security checks
   */
  async sendMessage(data: {
    conversation_id: string;
    content: string;
    message_type?: 'text' | 'image' | 'file' | 'system';
    reply_to_id?: string;
    metadata?: Json;
  }) {
    try {
      const user = await this.getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      // Security check: Verify user can send messages to this conversation
      const canSend = await chatSecurity.canSendMessage(data.conversation_id, user.id);
      if (!canSend) {
        await chatSecurity.logSecurityEvent({
          action: 'send_message_denied',
          userId: user.id,
          conversationId: data.conversation_id,
          success: false,
          details: { reason: 'User not authorized to send messages to this conversation' },
        });
        throw new Error('You are not authorized to send messages to this conversation');
      }

      const messageData: MessageInsert = {
        conversation_id: data.conversation_id,
        sender_id: user.id,
        content: data.content,
        message_type: data.message_type || 'text',
        reply_to_id: data.reply_to_id ?? null,
        metadata: data.metadata || {},
        deleted_at: null,
        edited_at: null,
      };

      const { data: message, error } = await this.supabase
        .from('messages')
        .insert(messageData)
        .select(`
          *,
          sender:users!messages_sender_id_fkey(id, full_name, username, avatar_url),
          reply_to:messages(
            *,
            sender:users!messages_sender_id_fkey(id, full_name, username, avatar_url)
          )
        `)
        .single();

      if (error) throw error;

      return { data: message as unknown as MessageWithSender, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  /**
   * Mark messages as read
   */
  async markMessagesAsRead(conversationId: string) {
    try {
      const user = await this.getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await this.supabase
        .rpc('mark_messages_as_read', {
          p_user_id: user.id,
          p_conversation_id: conversationId,
        });

      if (error) throw error;

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }

  /**
   * React to a message
   */
  async addReaction(messageId: string, emoji: string) {
    try {
      const user = await this.getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await this.supabase
        .from('message_reactions')
        .upsert({
          message_id: messageId,
          user_id: user.id,
          emoji,
        })
        .select()
        .single();

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  /**
   * Remove reaction from message
   */
  async removeReaction(messageId: string, emoji: string) {
    try {
      const user = await this.getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await this.supabase
        .from('message_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', user.id)
        .eq('emoji', emoji);

      if (error) throw error;

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }

  /**
   * Search messages
   */
  async searchMessages(query: string, conversationId?: string) {
    try {
      let queryBuilder = this.supabase
        .from('messages')
        .select(`
          *,
          sender:users!messages_sender_id_fkey(id, full_name, username, avatar_url)
        `)
        .textSearch('content', query)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (conversationId) {
        queryBuilder = queryBuilder.eq('conversation_id', conversationId);
      }

      const { data, error } = await queryBuilder;

      if (error) throw error;

      return { data: data as MessageWithSender[], error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  /**
   * Get current authenticated user
   */
  private async getCurrentUser() {
    const { data: { user } } = await this.supabase.auth.getUser();
    return user;
  }

  /**
   * Get current user with profile data
   */
  async getCurrentUserWithProfile() {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) return null;

      // Get user profile data
      const { data: profile } = await this.supabase
        .from('users')
        .select('id, full_name, username, avatar_url')
        .eq('id', user.id)
        .single();

      return {
        ...user,
        ...profile,
        email: user.email,
      };
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  }
}

// Server-side chat service for SSR
export class ServerChatService {
  private supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>;

  constructor(supabaseClient: Awaited<ReturnType<typeof createServerSupabaseClient>>) {
    this.supabase = supabaseClient;
  }

  /**
   * Get conversations server-side
   */
  async getConversations(): Promise<{ data: ConversationWithParticipants[] | null; error: Error | null }> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // First, get all conversation IDs where the user is a participant
      const { data: userConversations, error: convError } = await this.supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (convError) throw convError;

      const conversationIds = (userConversations?.map(c => c.conversation_id).filter(id => id !== null) || []) as string[];

      if (conversationIds.length === 0) {
        return { data: [], error: null };
      }

      // Then fetch full conversation data with ALL participants
      const { data, error } = await this.supabase
        .from('conversations')
        .select(`
          *,
          created_by_user:users!conversations_created_by_fkey(id, full_name, username, avatar_url),
          participants:conversation_participants(
            *,
            user:users(id, full_name, username, avatar_url)
          )
        `)
        .in('id', conversationIds)
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      // Get last message for each conversation separately
      const conversationsWithLastMessage = await Promise.all(
        (data || []).map(async (conversation) => {
          const { data: messages } = await this.supabase
            .from('messages')
            .select(`
              *,
              sender:users!messages_sender_id_fkey(id, full_name, username, avatar_url)
            `)
            .eq('conversation_id', conversation.id)
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .limit(1);

          return {
            ...conversation,
            last_message: messages?.[0] || null,
          };
        }),
      );

      // Get unread counts for each conversation
      const conversationsWithUnread = await Promise.all(
        conversationsWithLastMessage.map(async (conversation) => {
          const { data: unreadCount } = await this.supabase.rpc('get_unread_message_count', {
              p_user_id: user.id,
              p_conversation_id: conversation.id,
            });

          return {
            ...conversation,
            unread_count: unreadCount || 0,
          } as ConversationWithParticipants;
        }),
      );

      return { data: conversationsWithUnread, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  /**
   * Get messages server-side
   */
  async getMessages(conversationId: string, limit = 50): Promise<{ data: MessageWithSender[] | null; error: Error | null }> {
    try {
      const { data, error } = await this.supabase
        .from('messages')
        .select(`
          *,
          sender:users!messages_sender_id_fkey(id, full_name, username, avatar_url),
          reply_to:messages(
            *,
            sender:users!messages_sender_id_fkey(id, full_name, username, avatar_url)
          )
        `)
        .eq('conversation_id', conversationId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return { data: (data || []).reverse() as unknown as MessageWithSender[], error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }
}

// Export singleton instance
export const chatService = new ChatService(); 