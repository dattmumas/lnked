import { useEffect, useState } from 'react';

import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

import type { RealtimeChannel } from '@supabase/supabase-js';

export function useUnreadMessages(userId: string | undefined) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    const supabase = createSupabaseBrowserClient();
    let channel: RealtimeChannel | null = null;

    // Fetch initial unread count
    const fetchUnreadCount = async () => {
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
        for (const conv of conversations) {
          const lastReadAt = conv.last_read_at;
          const lastMessageAt = conv.conversations?.last_message_at;
          
          if (!lastReadAt || !lastMessageAt || !conv.conversation_id) continue;
          
          const lastRead = new Date(lastReadAt);
          const lastMessage = new Date(lastMessageAt);
          
          if (lastMessage > lastRead) {
            // Count messages after last_read_at
            const { count } = await supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .eq('conversation_id', conv.conversation_id)
              .gt('created_at', lastReadAt)
              .neq('sender_id', userId);
            
            if (count) totalUnread += count;
          }
        }

        setUnreadCount(totalUnread);
      } catch (error) {
        console.error('Error fetching unread count:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUnreadCount();

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
        async (payload) => {
          // Check if this message is in a direct conversation
          const { data: conversation } = await supabase
            .from('conversations')
            .select('type')
            .eq('id', (payload.new as any).conversation_id)
            .single();
          
          if (conversation?.type === 'direct') {
            // Check if user has read this conversation
            const { data: participant } = await supabase
              .from('conversation_participants')
              .select('last_read_at')
              .eq('conversation_id', (payload.new as any).conversation_id)
              .eq('user_id', userId)
              .single();
            
            if (participant) {
              const messageTime = new Date((payload.new as any).created_at);
              const lastReadTime = participant.last_read_at ? new Date(participant.last_read_at) : new Date(0);
              
              if (messageTime > lastReadTime) {
                setUnreadCount(prev => prev + 1);
              }
            }
          }
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
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [userId]);

  return { unreadCount, loading };
} 