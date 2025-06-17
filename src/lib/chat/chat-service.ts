/**
 * Chat service following Supabase's official patterns with enhanced security
 * Based on: https://supabase.com/docs/guides/realtime
 */

import { z } from 'zod';

import { USER_SEARCH_LIMIT, DEFAULT_MESSAGE_LIMIT, MAX_TITLE_LENGTH } from '@/lib/constants/chat';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { createServerSupabaseClient } from '@/lib/supabase/server';

import { chatSecurity } from './security';

import type {
  ConversationWithParticipants,
  MessageWithSender,
  ConversationInsert,
  MessageInsert,
  ConversationParticipantInsert,
} from './types';

import type { Database } from '@/lib/database.types';

/**
 * Convert anything caught in a catch‑block into a real Error object.
 */
const toError = (err: unknown): Error =>
  err instanceof Error ? err : new Error(typeof err === 'string' ? err : 'Unknown error');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const CreateConversationSchema = z.object({
  title: z.string().max(MAX_TITLE_LENGTH).optional(),
  type: z.enum(['direct', 'group', 'channel']),
  description: z.string().optional(),
  is_private: z.boolean().optional(),
  participant_ids: z.array(z.string().uuid()).min(1),
});

export const SendMessageSchema = z.object({
  conversation_id: z.string().uuid(),
  content: z.string().min(1),
  message_type: z.enum(['text', 'image', 'file', 'system']).default('text').optional(),
  reply_to_id: z.string().uuid().optional(),
  metadata: z.any().optional(),
});

// Client-side chat service
export class ChatService {
  private supabase = createSupabaseBrowserClient<Database>();

  /**
   * Look up user by email
   */
  async getUserByEmail(email: string): Promise<{ data: unknown; error: Error | undefined }> {
    try {
      const { data, error: dbError } = await this.supabase
        .from('users')
        .select('id, full_name, username, avatar_url')
        .eq('users.email', email) // This will need to be handled differently since email is in auth.users
        .single();

      if (dbError !== null) throw dbError;

      return { data, error: undefined };
    } catch (err: unknown) {
      return { data: undefined, error: toError(err) };
    }
  }

  /**
   * Search users by email or username
   */
  async searchUsers(query: string): Promise<{ data: unknown[]; error: Error | undefined }> {
    try {
      const { data, error: dbError } = await this.supabase
        .from('users')
        .select('id, full_name, username, avatar_url')
        .or(`full_name.ilike.%${query}%,username.ilike.%${query}%`)
        .limit(USER_SEARCH_LIMIT);

      if (dbError !== null) throw dbError;

      return { data: data ?? [], error: undefined };
    } catch (err: unknown) {
      return { data: [], error: toError(err) };
    }
  }

  /**
   * Create a new conversation following Supabase patterns
   */
  async createConversation(data: z.infer<typeof CreateConversationSchema>): Promise<{ data: ConversationInsert | undefined; error: Error | undefined }> {
    try {
      const user = await this.getCurrentUser();
      if (user === undefined) throw new Error('User not authenticated');

      const parsed = CreateConversationSchema.parse(data);

      // Validate participant IDs are UUIDs, not emails
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const invalidIds = parsed.participant_ids.filter((id) => !uuidRegex.test(id));
      
      if (invalidIds.length > 0) {
        chatSecurity.logSecurityEvent({
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
      const participantValidation = await chatSecurity.validateParticipants(parsed.participant_ids);
      if (!participantValidation.valid) {
        chatSecurity.logSecurityEvent({
          action: 'create_conversation_denied',
          userId: user.id,
          success: false,
          details: { reason: 'Invalid participant IDs', invalidIds: participantValidation.invalidIds },
        });
        throw new Error(`Invalid participant IDs: ${participantValidation.invalidIds.join(', ')}`);
      }

      // Ensure the creator is not accidentally duplicated in participant list
      const uniqueParticipantIds = Array.from(new Set(parsed.participant_ids.filter((id) => id !== user.id)));

      // Check if all participants exist
      const { data: participants, error: dbError } = await this.supabase
        .from('users')
        .select('id')
        .in('id', uniqueParticipantIds);

      if (dbError !== null) throw dbError;

      if (participants === undefined || participants.length !== uniqueParticipantIds.length) {
        throw new Error('One or more participants not found');
      }

      // 1. Create conversation
      const conversationData: ConversationInsert = {
        title: parsed.title,
        type: parsed.type,
        description: parsed.description,
        is_private: parsed.is_private ?? true,
        created_by: user.id,
      } as ConversationInsert;

      const { data: conversation, error: dbError2 } = await this.supabase
        .from('conversations')
        .insert(conversationData)
        .select()
        .single();

      if (dbError2 !== null) throw dbError2;

      // 2. Insert creator row first (required for RLS admin permissions)
      const { error: dbError3 } = await this.supabase
        .from('conversation_participants')
        .insert({
          conversation_id: conversation.id,
          user_id: user.id,
          role: 'admin',
          last_read_at: new Date().toISOString(),
          is_muted: false,
          is_pinned: false,
        });

      if (dbError3 !== null) throw dbError3;

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

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { data, error } = await this.supabase
          .from('conversation_participants')
          .insert(participantRows)
          .select(`
            *,
            user:users!conversation_participants_user_id_fkey (
              id,
              full_name,
              username,
              avatar_url
            )
          `);

        if (error) {
          throw error;
        }
      }

      // Create the conversation object with participants
      const conversationWithParticipants: ConversationWithParticipants = {
        ...conversation,
        participants: data ?? [],
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        created_by_user: user ? {
          id: user.id,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          full_name: user.full_name ?? undefined,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          username: user.username ?? undefined,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          avatar_url: user.avatar_url ?? undefined,
        } : undefined,
      };

      return { data: conversationWithParticipants, error: undefined };
    } catch (err: unknown) {
      const error = toError(err);
      return { data: undefined, error };
    }
  }

  /**
   * Get user's conversations with participants and unread counts
   */
  async getConversations(): Promise<{ data: ConversationWithParticipants[]; error: Error | undefined }> {
    try {
      const user = await this.getCurrentUser();
      if (user === undefined) throw new Error('User not authenticated');

      // First, get all conversation IDs where the user is a participant
      const { data: userConversations, error: dbError } = await this.supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (dbError !== null) throw dbError;

      const conversationIds = (userConversations?.map(c => c.conversation_id).filter((id): id is string => id !== null && id !== undefined) ?? []);

      if (conversationIds.length === 0) {
        return { data: [], error: undefined };
      }

      // Then fetch full conversation data with ALL participants
      const { data, error: dbError2 } = await this.supabase
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

      if (dbError2 !== null) throw dbError2;

      // Get last message for each conversation separately
      const conversationsWithLastMessage = await Promise.all(
        (data ?? []).map(async (conversation) => {
          const { data: messageRows, error: msgError } = await this.supabase
            .from('messages')
            .select(`
              *,
              sender:users!messages_sender_id_fkey(id, full_name, username, avatar_url)
            `)
            .eq('conversation_id', conversation.id)
            // eslint-disable-next-line unicorn/no-null
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .limit(1);

          if (msgError !== null) throw msgError;

          const lastMessage: MessageWithSender | undefined =
            Array.isArray(messageRows) && messageRows.length > 0
              ? (messageRows[0] as unknown as MessageWithSender)
              : undefined;

          return {
            ...conversation,
            last_message: lastMessage,
          } as ConversationWithParticipants;
        }),
      );

      // Get unread counts for each conversation
      const conversationsWithUnread = await Promise.all(
        conversationsWithLastMessage.map(async (conversation) => {
          const { data: unreadCount, error: unreadError } =
            await this.supabase.rpc('get_unread_message_count', {
              p_user_id: user.id,
              p_conversation_id: conversation.id,
            });

          if (unreadError !== null) throw unreadError;

          return {
            ...conversation,
            unread_count: typeof unreadCount === 'number' ? unreadCount : 0,
          } as ConversationWithParticipants;
        }),
      );

      return { data: conversationsWithUnread, error: undefined };
    } catch (err: unknown) {
      return { data: undefined, error: toError(err) };
    }
  }

  /**
   * Get messages for a conversation with security checks
   */
  async getMessages(conversationId: string, limit = DEFAULT_MESSAGE_LIMIT, offset = 0): Promise<{ data: MessageWithSender[] | undefined; error: Error | undefined }> {
    try {
      const user = await this.getCurrentUser();
      if (user === undefined) throw new Error('User not authenticated');

      // Security check: Verify user can view this conversation
      const canView = await chatSecurity.canViewConversation(conversationId, user.id);
      if (!canView) {
        // eslint-disable-next-line @typescript-eslint/await-thenable
        await chatSecurity.logSecurityEvent({
          action: 'get_messages_denied',
          userId: user.id,
          conversationId,
          success: false,
          details: { reason: 'User not authorized to view messages in this conversation' },
        });
        throw new Error('You are not authorized to view messages in this conversation');
      }

      const { data, error: dbError } = await this.supabase
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
        // eslint-disable-next-line unicorn/no-null
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (dbError !== null) throw dbError;

      const messages: MessageWithSender[] = (data ?? []).map(msg => ({
        ...msg,
        sender: msg.sender ?? undefined,
        reply_to: msg.reply_to ?? undefined,
      }));

      return { data: messages, error: undefined };
    } catch (err: unknown) {
      const error = toError(err);
      return { data: undefined, error };
    }
  }

  /**
   * Send a message following Supabase patterns with security checks
   */
  async sendMessage(data: z.infer<typeof SendMessageSchema>): Promise<{ data: MessageWithSender | undefined; error: Error | undefined }> {
    try {
      const user = await this.getCurrentUser();
      if (user === undefined) throw new Error('User not authenticated');

      const parsed = SendMessageSchema.parse(data);

      // Security check: Verify user can send messages to this conversation
      const canSend = await chatSecurity.canSendMessage(parsed.conversation_id, user.id);
      if (!canSend) {
        chatSecurity.logSecurityEvent({
          action: 'send_message_denied',
          userId: user.id,
          conversationId: parsed.conversation_id,
          success: false,
          details: { reason: 'User not authorized to send messages to this conversation' },
        });
        throw new Error('You are not authorized to send messages to this conversation');
      }

      const messageData: MessageInsert = {
        conversation_id: parsed.conversation_id,
        sender_id: user.id,
        content: parsed.content,
        message_type: parsed.message_type ?? 'text',
        ...(parsed.reply_to_id !== undefined ? { reply_to_id: parsed.reply_to_id } : {}),
        metadata: parsed.metadata ?? {},
        // eslint-disable-next-line unicorn/no-null
        deleted_at: null,
        // eslint-disable-next-line unicorn/no-null
        edited_at: null,
      };

      const { data: messageRow, error: dbError } = await this.supabase
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

      if (dbError !== null) throw dbError;
      if (!messageRow) throw new Error('Failed to create message');

      // Transform the raw database row to MessageWithSender
      const message: MessageWithSender = {
        ...messageRow,
        sender: messageRow.sender ?? null,
        reply_to: messageRow.reply_to ?? undefined,
        reactions: messageRow.reactions ?? undefined,
      };

      // Update conversation's last_message_at
      await this.supabase
        .from('conversations')
        .update({ 
          last_message_at: message.created_at,
          updated_at: new Date().toISOString(),
        })
        .eq('id', parsed.conversation_id);

      return { data: message, error: undefined };
    } catch (err: unknown) {
      const error = toError(err);
      return { data: undefined, error };
    }
  }

  /**
   * Mark messages as read
   */
  async markMessagesAsRead(conversationId: string): Promise<{ error: Error | undefined }> {
    try {
      const user = await this.getCurrentUser();
      if (user === undefined) throw new Error('User not authenticated');

      const { error: dbError } = await this.supabase
        .rpc('mark_messages_as_read', {
          p_user_id: user.id,
          p_conversation_id: conversationId,
        });

      if (dbError !== null) throw dbError;

      return { error: undefined };
    } catch (err: unknown) {
      return { error: toError(err) };
    }
  }

  /**
   * React to a message
   */
  async addReaction(messageId: string, emoji: string): Promise<{ data: unknown; error: Error | undefined }> {
    try {
      const user = await this.getCurrentUser();
      if (user === undefined) throw new Error('User not authenticated');

      const { data, error: dbError } = await this.supabase
        .from('message_reactions')
        .upsert({
          message_id: messageId,
          user_id: user.id,
          emoji,
        })
        .select()
        .single();

      if (dbError !== null) throw dbError;

      return { data, error: undefined };
    } catch (err: unknown) {
      return { data: undefined, error: toError(err) };
    }
  }

  /**
   * Remove reaction from message
   */
  async removeReaction(messageId: string, emoji: string): Promise<{ error: Error | undefined }> {
    try {
      const user = await this.getCurrentUser();
      if (user === undefined) throw new Error('User not authenticated');

      const { error: dbError } = await this.supabase
        .from('message_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', user.id)
        .eq('emoji', emoji);

      if (dbError !== null) throw dbError;

      return { error: undefined };
    } catch (err: unknown) {
      return { error: toError(err) };
    }
  }

  /**
   * Search messages
   */
  async searchMessages(query: string, conversationId?: string): Promise<{ data: MessageWithSender[]; error: Error | undefined }> {
    try {
      let queryBuilder = this.supabase
        .from('messages')
        .select(`
          *,
          sender:users!messages_sender_id_fkey(id, full_name, username, avatar_url)
        `)
        .textSearch('content', query)
        // eslint-disable-next-line unicorn/no-null
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (conversationId !== undefined && conversationId !== '') {
        queryBuilder = queryBuilder.eq('conversation_id', conversationId);
      }

      const { data, error: dbError } = await queryBuilder;

      if (dbError !== null) throw dbError;

      return { data: data as MessageWithSender[], error: undefined };
    } catch (err: unknown) {
      return { data: undefined, error: toError(err) };
    }
  }

  /**
   * Get current authenticated user
   */
  private async getCurrentUser(): Promise<{ id: string; email?: string | undefined } | undefined> {
    const { data: { user } } = await this.supabase.auth.getUser();
    return user ?? undefined;
  }

  /**
   * Get current user with profile data
   */
  async getCurrentUserWithProfile(): Promise<({ id: string; email?: string | undefined; full_name?: string; username?: string; avatar_url?: string }) | undefined> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (user === null || user === undefined || typeof user.email !== 'string' || user.email.trim() === '') {
        return undefined;
      }

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
      return undefined;
    }
  }

  async deleteConversation(conversationId: string): Promise<ServiceResult<void>> {
    try {
      const user = await this.getCurrentUser();
      if (user === undefined) throw new Error('User not authenticated');

      // Get the conversation first to check permissions
      const { data: conversation, error: getError } = await this.supabase
        .from('conversations')
        .select('created_by')
        .eq('id', conversationId)
        .single();

      if (getError) {
        throw getError;
      }

      // Only creator can delete conversation
      if (conversation.created_by !== user.id) {
        throw new Error('Unauthorized to delete this conversation');
      }

      // Delete conversation (participants will cascade)
      const { error } = await this.supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId);

      if (error) {
        throw error;
      }

      return { data: undefined, error: undefined };
    } catch (err: unknown) {
      const error = toError(err);
      return { data: undefined, error };
    }
  }

  async getFilteredConversations(filters?: { archived?: boolean; type?: string }, limit = DEFAULT_MESSAGE_LIMIT, offset = 0): Promise<{ data: ConversationWithParticipants[]; error: Error | undefined }> {
    try {
      const user = await this.getCurrentUser();
      if (user === undefined) throw new Error('User not authenticated');

      // Query conversations with participants
      let query = this.supabase
        .from('conversations')
        .select(`
          *,
          participants:conversation_participants!inner (
            *,
            user:users!conversation_participants_user_id_fkey (
              id,
              full_name,
              username,
              avatar_url
            )
          ),
          last_message:messages (
            *,
            sender:users!messages_sender_id_fkey (
              id,
              full_name,
              username,
              avatar_url
            )
          ),
          created_by_user:users!conversations_created_by_fkey (
            id,
            full_name,
            username,
            avatar_url
          )
        `)
        .eq('participants.user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(limit)
        .range(offset, offset + limit - 1);

      // Apply filters
      if (filters?.archived !== undefined) {
        query = query.eq('archived', filters.archived);
      }
      if (typeof filters?.type === 'string' && filters.type.trim() !== '') {
        query = query.eq('type', filters.type);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      // Process conversations to match ConversationWithParticipants type
      const conversations: ConversationWithParticipants[] = (data ?? []).map((conv) => {
        // Derive the most‑recent single message
        const lastMessage: MessageWithSender | undefined =
          Array.isArray(conv.last_message) && conv.last_message.length > 0
            ? (conv.last_message[0] as unknown as MessageWithSender)
            : undefined;

        return {
          ...conv,
          // Ensure participants is always a typed array
          participants: (conv.participants ?? []) as ConversationWithParticipants['participants'],
          last_message: lastMessage,
          created_by_user: conv.created_by_user ?? undefined,
        } as ConversationWithParticipants;
      });

      return { data: conversations, error: undefined };
    } catch (err: unknown) {
      const error = toError(err);
      return { data: [], error };
    }
  }
}

// Server-side chat service for SSR
export class ServerChatService {
  private supabase: Awaited<ReturnType<typeof createServerSupabaseClient<Database>>>;

  constructor(supabaseClient: Awaited<ReturnType<typeof createServerSupabaseClient<Database>>>) {
    this.supabase = supabaseClient;
  }

  /**
   * Get conversations server-side
   */
  async getConversations(): Promise<{ data: ConversationWithParticipants[]; error: Error | undefined }> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (user === null || user === undefined) throw new Error('User not authenticated');

      // First, get all conversation IDs where the user is a participant
      const { data: userConversations, error: dbError } = await this.supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (dbError !== null) throw dbError;

      const conversationIds = (userConversations?.map(c => c.conversation_id).filter((id): id is string => id !== null && id !== undefined) ?? []);

      if (conversationIds.length === 0) {
        return { data: [], error: undefined };
      }

      // Then fetch full conversation data with ALL participants
      const { data, error: dbError2 } = await this.supabase
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

      if (dbError2 !== null) throw dbError2;

      // Get last message for each conversation separately
      const conversationsWithLastMessage = await Promise.all(
        (data ?? []).map(async (conversation) => {
          const { data: messageRows, error: msgError } = await this.supabase
            .from('messages')
            .select(`
              *,
              sender:users!messages_sender_id_fkey(id, full_name, username, avatar_url)
            `)
            .eq('conversation_id', conversation.id)
            // eslint-disable-next-line unicorn/no-null
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .limit(1);

          if (msgError !== null) throw msgError;

          const lastMessage: MessageWithSender | undefined =
            Array.isArray(messageRows) && messageRows.length > 0
              ? (messageRows[0] as unknown as MessageWithSender)
              : undefined;

          return {
            ...conversation,
            last_message: lastMessage,
          } as ConversationWithParticipants;
        }),
      );

      // Get unread counts for each conversation
      const conversationsWithUnread = await Promise.all(
        conversationsWithLastMessage.map(async (conversation) => {
          const { data: unreadCount, error: unreadError } =
            await this.supabase.rpc('get_unread_message_count', {
              p_user_id: user.id,
              p_conversation_id: conversation.id,
            });

          if (unreadError !== null) throw unreadError;

          return {
            ...conversation,
            unread_count: typeof unreadCount === 'number' ? unreadCount : 0,
          } as ConversationWithParticipants;
        }),
      );

      return { data: conversationsWithUnread, error: undefined };
    } catch (err: unknown) {
      return { data: undefined, error: toError(err) };
    }
  }

  /**
   * Get messages server-side
   */
  async getMessages(conversationId: string, limit = DEFAULT_MESSAGE_LIMIT): Promise<{ data: MessageWithSender[] | undefined; error: Error | undefined }> {
    try {
      const { data, error: dbError } = await this.supabase
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
        // eslint-disable-next-line unicorn/no-null
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (dbError !== null) throw dbError;

      return { data: ((data ?? []) as MessageWithSender[]).reverse(), error: undefined };
    } catch (err: unknown) {
      return { data: undefined, error: toError(err) };
    }
  }
}

// Export singleton instance
export const chatService = new ChatService(); 