import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import type { Database } from '@/lib/database.types';
import type { MessageWithSender } from './types';

type Tables = Database['public']['Tables'];
type ConversationRow = Tables['conversations']['Row'];
type MessageRow = Tables['messages']['Row'];

class ChatService {
  private getSupabase() {
    // Check if we're on the server or client
    if (typeof window === 'undefined') {
      return createServerSupabaseClient();
    }
    return createSupabaseBrowserClient();
  }

  async getConversations() {
    const supabase = this.getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { data: null, error: new Error('Not authenticated') };
    }

    const { data, error } = await supabase
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

    if (error) return { data: null, error };

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
    })) || [];

    return { data: conversations, error: null };
  }

  async getMessages(conversationId: string, limit = 50, offset = 0) {
    const supabase = this.getSupabase();
    
    const { data, error } = await supabase
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

    if (error) return { data: null, error };

    // Reverse to show oldest first
    return { data: (data?.reverse() || []) as MessageWithSender[], error: null };
  }

  async sendMessage(params: {
    conversation_id: string;
    content: string;
    message_type?: 'text' | 'image' | 'file' | 'system';
    reply_to_id?: string;
    metadata?: any;
  }) {
    const supabase = this.getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { data: null, error: new Error('Not authenticated') };
    }

    const { data, error } = await supabase
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
  }) {
    const supabase = this.getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { data: null, error: new Error('Not authenticated') };
    }

    // Create conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .insert({
        title: params.title,
        type: params.type,
        description: params.description,
        is_private: params.is_private || false,
        created_by: user.id
      })
      .select()
      .single();

    if (convError || !conversation) {
      return { data: null, error: convError };
    }

    // Add participants
    const participants = [user.id, ...params.participant_ids].map(userId => ({
      conversation_id: conversation.id,
      user_id: userId,
      role: userId === user.id ? 'admin' : 'member'
    }));

    const { error: participantError } = await supabase
      .from('conversation_participants')
      .insert(participants);

    if (participantError) {
      // Rollback conversation creation
      await supabase.from('conversations').delete().eq('id', conversation.id);
      return { data: null, error: participantError };
    }

    return { data: conversation, error: null };
  }

  async markMessagesAsRead(conversationId: string) {
    const supabase = this.getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { error: new Error('Not authenticated') };
    }

    // Update last_read_at timestamp for the user in this conversation
    const { error } = await supabase
      .from('conversation_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id);

    return { error };
  }

  async addReaction(messageId: string, emoji: string) {
    const supabase = this.getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { error: new Error('Not authenticated') };
    }

    const { error } = await supabase
      .from('message_reactions')
      .insert({
        message_id: messageId,
        user_id: user.id,
        emoji
      });

    return { error };
  }

  async removeReaction(messageId: string, emoji: string) {
    const supabase = this.getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { error: new Error('Not authenticated') };
    }

    const { error } = await supabase
      .from('message_reactions')
      .delete()
      .eq('message_id', messageId)
      .eq('user_id', user.id)
      .eq('emoji', emoji);

    return { error };
  }

  async searchMessages(query: string, conversationId?: string) {
    const supabase = this.getSupabase();
    
    let searchQuery = supabase
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
      .limit(50);

    if (conversationId) {
      searchQuery = searchQuery.eq('conversation_id', conversationId);
    }

    const { data, error } = await searchQuery;

    return { data: data as MessageWithSender[] | null, error };
  }
}

export const chatService = new ChatService(); 