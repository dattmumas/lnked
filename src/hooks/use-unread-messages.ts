import { useEffect, useState } from 'react';

import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

import type { RealtimeChannel } from '@supabase/supabase-js';

interface UnreadMessagesReturn {
  unreadCount: number;
  loading: boolean;
}

interface MessagePayload {
  conversation_id: string;
  created_at: string;
  sender_id: string;
}

interface ConversationWithLastMessage {
  conversation_id: string | null;
  last_read_at: string | null;
  conversations: {
    id: string;
    type: string;
    last_message_at: string | null;
  } | null;
}

export function useUnreadMessages(userId: string | undefined): UnreadMessagesReturn {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect((): (() => void) => {
    const hasUserId = userId !== undefined && userId !== null && userId !== '';
    if (!hasUserId) {
      setUnreadCount(0);
      setLoading(false);
      return () => {
        // Empty cleanup
      };
    }

    const supabase = createSupabaseBrowserClient();
    let channel: RealtimeChannel | null = null;

    // Fetch initial unread count
    const fetchUnreadCount = async (): Promise<void> => {
      try {
        // Get all direct message conversations for the user
        const { data: conversations } = await supabase
          .from('conversation_participants')
          .select(`
            conversation_id,
            last_read_at,
            conversations!inner(
              id,
              type,
              last_message_at
            )
          `)
          .eq('user_id', userId)
          .eq('conversations.type', 'direct');

        if (!conversations) {
          setUnreadCount(0);
          return;
        }

        // Count unread messages for each conversation
        let totalUnread = 0;
        for (const conv of conversations as ConversationWithLastMessage[]) {
          const hasLastReadAt = conv.last_read_at !== null && conv.last_read_at !== undefined && conv.last_read_at !== '';
          const hasLastMessageAt = conv.conversations?.last_message_at !== null && 
                                   conv.conversations?.last_message_at !== undefined && 
                                   conv.conversations?.last_message_at !== '';
          const hasConversationId = conv.conversation_id !== null && 
                                    conv.conversation_id !== undefined && 
                                    conv.conversation_id !== '';
          
          if (!hasLastReadAt || !hasLastMessageAt || !hasConversationId || !conv.conversations) continue;
          
          const lastRead = new Date(conv.last_read_at as string);
          const lastMessage = new Date(conv.conversations.last_message_at as string);
          
          if (lastMessage > lastRead) {
            // Count messages after last_read_at
            const { count } = await supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .eq('conversation_id', conv.conversation_id)
              .gt('created_at', conv.last_read_at as string)
              .neq('sender_id', userId);
            
            const messageCount = count ?? 0;
            if (messageCount > 0) {
              totalUnread += messageCount;
            }
          }
        }

        setUnreadCount(totalUnread);
      } catch (error: unknown) {
        console.error('Error fetching unread count:', error);
      } finally {
        setLoading(false);
      }
    };

    void fetchUnreadCount();

    // Subscribe to real-time updates for new messages
    channel = supabase
      .channel(`unread-messages-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=neq.${userId}`,
        },
        (payload) => {
          void (async () => {
            // Check if this message is in a direct conversation
            const newMessage = payload.new as MessagePayload;
            const { data: conversation } = await supabase
              .from('conversations')
              .select('type')
              .eq('id', newMessage.conversation_id)
              .single();
            
            if (conversation?.type === 'direct') {
              // Check if user has read this conversation
              const { data: participant } = await supabase
                .from('conversation_participants')
                .select('last_read_at')
                .eq('conversation_id', newMessage.conversation_id)
                .eq('user_id', userId)
                .single();
              
              if (participant) {
                const messageTime = new Date(newMessage.created_at);
                const hasLastReadAt = participant.last_read_at !== null && 
                                      participant.last_read_at !== undefined && 
                                      participant.last_read_at !== '';
                const lastReadTime = hasLastReadAt ? new Date(participant.last_read_at as string) : new Date(0);
                
                if (messageTime > lastReadTime) {
                  setUnreadCount(prev => prev + 1);
                }
              }
            }
          })();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversation_participants',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          // When last_read_at is updated, refetch the count
          void fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      if (channel !== null) {
        void supabase.removeChannel(channel);
      }
    };
  }, [userId]);

  return { unreadCount, loading };
} 