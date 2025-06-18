import { createBrowserClient, createServerClient } from '@supabase/ssr';

import { 
  parseConversation,
  parseConversations,
  parseMessage,
  parseMessages,
  parseMessagesWithSender,
  ConversationInsertSchema,
  MessageInsertSchema,
  ParticipantInsertSchema,
  type Conversation,
  type ConversationInsert,
  type Message,
  type MessageInsert,
  type MessageWithSender,
  type ParticipantInsert,
  type ConversationParticipant,
  type MessageReaction
} from './schemas/conversation.schema';

import type { Database } from '@/lib/database.types';

/**
 * Conversation Repository
 * 
 * Handles all conversation and message operations with automatic null/undefined conversion.
 */
export class ConversationRepository {
  constructor(private supabase: ReturnType<typeof createBrowserClient<Database>> | ReturnType<typeof createServerClient<Database>>) {}

  /**
   * Create a new conversation
   */
  async createConversation(conversation: ConversationInsert): Promise<Conversation | undefined> {
    const dbConversation = ConversationInsertSchema.parse(conversation);
    
    const { data, error } = await this.supabase
      .from('conversations')
      .insert(dbConversation)
      .select()
      .single();

    if (error !== undefined || data === undefined) {
      return undefined;
    }

    return parseConversation(data);
  }

  /**
   * Get a conversation by ID
   */
  async getConversationById(id: string): Promise<Conversation | undefined> {
    const { data, error } = await this.supabase
      .from('conversations')
      .select('*')
      .eq('id', id)
      .single();

    if (error !== undefined || data === undefined) {
      return undefined;
    }

    return parseConversation(data);
  }

  /**
   * Get conversations for a user
   */
  async getUserConversations(userId: string): Promise<Conversation[]> {
    // Query conversations directly with an inner join on participants
    const { data, error } = await this.supabase
      .from('conversations')
      .select(`
        *,
        conversation_participants!inner (
          user_id
        )
      `)
      .eq('conversation_participants.user_id', userId)
      .order('last_message_at', { ascending: false });

    if (error !== undefined || data === undefined) {
      return [];
    }

    // Parse the conversations (ignoring the joined data)
    const conversations = data.map((item: any) => {
      const { conversation_participants, ...conversation } = item;
      return conversation;
    });

    return parseConversations(conversations);
  }

  /**
   * Add participants to a conversation
   */
  async addParticipants(participants: ParticipantInsert[]): Promise<boolean> {
    const dbParticipants = participants.map(p => ParticipantInsertSchema.parse(p));
    
    const { error } = await this.supabase
      .from('conversation_participants')
      .insert(dbParticipants);

    return error === undefined;
  }

  /**
   * Remove a participant from a conversation
   */
  async removeParticipant(conversationId: string, userId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('conversation_participants')
      .delete()
      .match({
        conversation_id: conversationId,
        user_id: userId
      });

    return error === undefined;
  }

  /**
   * Send a message
   */
  async sendMessage(message: MessageInsert): Promise<Message | undefined> {
    const dbMessage = MessageInsertSchema.parse(message);
    
    const { data, error } = await this.supabase
      .from('messages')
      .insert(dbMessage)
      .select()
      .single();

    if (error !== undefined || data === undefined) {
      return undefined;
    }

    return parseMessage(data);
  }

  /**
   * Get messages for a conversation
   */
  async getMessages(conversationId: string, limit = 50): Promise<MessageWithSender[]> {
    const { data, error } = await this.supabase
      .from('messages')
      .select(`
        *,
        sender:users!sender_id (
          id,
          username,
          full_name,
          avatar_url
        )
      `)
      .eq('conversation_id', conversationId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error !== undefined || data === undefined) {
      return [];
    }

    return parseMessagesWithSender(data);
  }

  /**
   * Edit a message
   */
  async editMessage(messageId: string, content: string): Promise<Message | undefined> {
    const { data, error } = await this.supabase
      .from('messages')
      .update({
        content,
        edited_at: new Date().toISOString()
      })
      .eq('id', messageId)
      .select()
      .single();

    if (error !== undefined || data === undefined) {
      return undefined;
    }

    return parseMessage(data);
  }

  /**
   * Delete a message (soft delete)
   */
  async deleteMessage(messageId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('messages')
      .update({
        deleted_at: new Date().toISOString()
      })
      .eq('id', messageId);

    return error === undefined;
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(conversationId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId);

    return error === undefined;
  }

  /**
   * Mark messages as read
   */
  async markMessagesAsRead(conversationId: string, userId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('conversation_participants')
      .update({
        last_read_at: new Date().toISOString()
      })
      .match({
        conversation_id: conversationId,
        user_id: userId
      });

    return error === undefined;
  }

  /**
   * Add a reaction to a message
   */
  async addMessageReaction(messageId: string, userId: string, emoji: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('message_reactions')
      .insert({
        message_id: messageId,
        user_id: userId,
        emoji
      });

    return error === undefined;
  }

  /**
   * Remove a reaction from a message
   */
  async removeMessageReaction(messageId: string, userId: string, emoji: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('message_reactions')
      .delete()
      .match({
        message_id: messageId,
        user_id: userId,
        emoji
      });

    return error === undefined;
  }

  /**
   * Get unread message count for a conversation
   */
  async getUnreadCount(conversationId: string, userId: string): Promise<number> {
    const { data, error } = await this.supabase
      .rpc('get_unread_message_count', {
        p_conversation_id: conversationId,
        p_user_id: userId
      });

    if (error !== undefined || data === undefined) {
      return 0;
    }

    return data as number;
  }

  /**
   * Update conversation settings
   */
  async updateConversation(conversationId: string, updates: Partial<ConversationInsert>): Promise<Conversation | undefined> {
    const dbUpdates = ConversationInsertSchema.partial().parse(updates);
    
    const { data, error } = await this.supabase
      .from('conversations')
      .update(dbUpdates)
      .eq('id', conversationId)
      .select()
      .single();

    if (error !== undefined || data === undefined) {
      return undefined;
    }

    return parseConversation(data);
  }

  /**
   * Check if user is participant in conversation
   */
  async isParticipant(conversationId: string, userId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('conversation_participants')
      .select('id')
      .match({
        conversation_id: conversationId,
        user_id: userId
      })
      .single();

    return error === undefined && data !== undefined;
  }
} 