import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

import type { MessageWithSender } from './types';
import type { Database, Json } from '@/lib/database.types';
import type { SupabaseClient } from '@supabase/supabase-js';

export const DEFAULT_PAGE_SIZE = 50;

/** Standard service response wrapper */
type ServiceResponse<T> = Promise<{ data: T | null; error: Error | null }>;

type Tables = Database['public']['Tables'];

class ChatService {
  private supabase: SupabaseClient<Database>;

  constructor(supabaseClient: SupabaseClient<Database>) {
    this.supabase = supabaseClient;
  }

  async getConversations(): ServiceResponse<unknown[]> {
    const { data: { user } } = await this.supabase.auth.getUser();
    
    if (user === null) {
      return { data: null, error: new Error('Not authenticated') };
    }

    const { data, error } = await this.supabase
      .from('conversation_participants')
      .select(`
        conversation_id,
        conversations!inner(
          id,
          title,
          type,
          description,
          is_private,
          last_message_at,
          created_at
        )
      `)
      .eq('user_id', user.id)
      .order('conversations(last_message_at)', { ascending: false });

    if (error !== null) return { data: null, error };

    // Transform the data to match expected format
    const conversations = data?.map(item => ({
      ...item.conversations,
      unread_count: 0, // TODO: Calculate actual unread count
      archived: null,
      created_by: null,
      updated_at: null,
      participants: [], // TODO: Fetch participants if needed
      last_message: null, // TODO: Fetch last message if needed
      created_by_user: null // TODO: Fetch creator user if needed
    })) ?? [];

    return { data: conversations, error: null };
  }

  async getMessages(
    conversationId: string,
    limit = DEFAULT_PAGE_SIZE,
    offset = 0
  ): ServiceResponse<MessageWithSender[]> {
    
    const { data, error } = await this.supabase
      .from('messages')
      .select(`
        *,
        sender:users(
          id,
          username,
          full_name,
          avatar_url
        ),
        reply_to:messages!reply_to_id(
          id,
          content,
          deleted_at,
          sender:users(
            id,
            username,
            full_name,
            avatar_url
          )
        )
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error !== null) return { data: null, error };

    // Reverse to show oldest first
    const reversedData = data !== null ? data.reverse() : [];
    return { data: reversedData as MessageWithSender[], error: null };
  }

  async sendMessage(params: {
    conversation_id: string;
    content: string;
    message_type?: 'text' | 'image' | 'file' | 'system';
    reply_to_id?: string;
    metadata?: Json | null;
  }): ServiceResponse<MessageWithSender> {
    const { data: { user } } = await this.supabase.auth.getUser();
    
    if (user === null) {
      return { data: null, error: new Error('Not authenticated') };
    }

    const { data, error } = await this.supabase
      .from('messages')
      .insert({
        ...params,
        sender_id: user.id,
        message_type: params.message_type || 'text'
      })
      .select(`
        *,
        sender:users(
          id,
          username,
          full_name,
          avatar_url
        ),
        reply_to:messages!reply_to_id(
          id,
          content,
          deleted_at,
          sender:users(
            id,
            username,
            full_name,
            avatar_url
          )
        )
      `)
      .single();

    return { data: data as MessageWithSender | null, error };
  }

  async createConversation(params: {
    title?: string;
    type: 'direct' | 'group' | 'channel';
    description?: string;
    is_private?: boolean;
    participant_ids: string[];
  }): ServiceResponse<Tables['conversations']['Row']> {
    const { data: { user } } = await this.supabase.auth.getUser();
    
    if (user === null) {
      return { data: null, error: new Error('Not authenticated') };
    }

    // Create conversation
    const { data: conversation, error: convError } = await this.supabase
      .from('conversations')
      .insert({
        title: params.title,
        type: params.type,
        description: params.description,
        is_private: params.is_private ?? false,
        created_by: user.id
      })
      .select()
      .single();

    if (convError !== null || conversation === null) {
      return { data: null, error: convError };
    }

    // Add participants
    const participants = [user.id, ...params.participant_ids].map(userId => ({
      conversation_id: conversation.id,
      user_id: userId,
      role: userId === user.id ? 'admin' : 'member' as const
    }));

    const { error: participantError } = await this.supabase
      .from('conversation_participants')
      .insert(participants);

    if (participantError !== null) {
      // Rollback conversation creation
      await this.supabase.from('conversations').delete().eq('id', conversation.id);
      return { data: null, error: participantError };
    }

    return { data: conversation, error: null };
  }

  async markMessagesAsRead(conversationId: string): Promise<{ error: Error | null }> {
    const { data: { user } } = await this.supabase.auth.getUser();
    
    if (user === null) {
      return { error: new Error('Not authenticated') };
    }

    // Update last_read_at timestamp for the user in this conversation
    const { error } = await this.supabase
      .from('conversation_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id);

    return { error };
  }

  async addReaction(messageId: string, emoji: string): Promise<{ error: Error | null }> {
    const { data: { user } } = await this.supabase.auth.getUser();
    
    if (user === null) {
      return { error: new Error('Not authenticated') };
    }

    const { error } = await this.supabase
      .from('message_reactions')
      .insert({
        message_id: messageId,
        user_id: user.id,
        emoji
      });

    return { error };
  }

  async removeReaction(messageId: string, emoji: string): Promise<{ error: Error | null }> {
    const { data: { user } } = await this.supabase.auth.getUser();
    
    if (user === null) {
      return { error: new Error('Not authenticated') };
    }

    const { error } = await this.supabase
      .from('message_reactions')
      .delete()
      .eq('message_id', messageId)
      .eq('user_id', user.id)
      .eq('emoji', emoji);

    return { error };
  }

  async searchMessages(query: string, conversationId?: string): ServiceResponse<MessageWithSender[]> {
    let searchQuery = this.supabase
      .from('messages')
      .select(`
        *,
        sender:users(
          id,
          username,
          full_name,
          avatar_url
        )
      `)
      .textSearch('content', query)
      .order('created_at', { ascending: false })
      .limit(DEFAULT_PAGE_SIZE);

    if (conversationId !== null && conversationId !== undefined && conversationId.trim() !== '') {
      searchQuery = searchQuery.eq('conversation_id', conversationId);
    }

    const { data, error } = await searchQuery;

    return { data: data as MessageWithSender[] | null, error };
  }
}

export const chatService = new ChatService(createSupabaseBrowserClient()); 