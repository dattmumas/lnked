import { useInfiniteQuery } from '@tanstack/react-query';

import { Database } from '@/lib/database.types';
import supabase from '@/lib/supabase/browser';
import { ChatMessage, MessagesResponse } from '@/types/chat-v2';

interface UseConversationMessagesOptions {
  enabled?: boolean;
  pageSize?: number;
}

// Type for raw message data from Supabase
type RawMessageData = Database['public']['Tables']['messages']['Row'] & {
  sender?: {
    id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  reply_to?: {
    id: string;
    content: string;
    message_type: string | null;
    created_at: string | null;
    sender?: {
      id: string;
      username: string | null;
      full_name: string | null;
      avatar_url: string | null;
    } | null;
  } | null;
};

export function useConversationMessages(
  conversationId: string | null,
  options: UseConversationMessagesOptions = {},
) {
  const { pageSize = 50 } = options;

  return useInfiniteQuery({
    queryKey: ['conversations', conversationId, 'messages'],
    queryFn: async ({ pageParam }): Promise<MessagesResponse> => {
      if (!conversationId) {
        throw new Error('Conversation ID is required');
      }

      let query = supabase
        .from('messages')
        .select(
          `
          *,
          sender:users(
            id,
            username,
            full_name,
            avatar_url
          ),
          reply_to:messages(
            id,
            content,
            message_type,
            created_at,
            sender:users(
              id,
              username,
              full_name,
              avatar_url
            )
          )
        `,
        )
        .eq('conversation_id', conversationId)
        .is('deleted_at', null)
        .not('sender_id', 'is', null) // Only get messages with valid sender_id
        .order('created_at', { ascending: false })
        .limit(pageSize);

      // Add cursor-based pagination if pageParam is provided
      if (pageParam) {
        query = query.lt('created_at', pageParam);
      }

      const { data: messages, error } = await query;

      if (error) {
        console.error('❌ [useConversationMessages] Query error:', error);
        throw new Error(`Failed to fetch messages: ${error.message}`);
      }

      // Transform the data to match our ChatMessage interface
      const transformedMessages: ChatMessage[] = (
        messages as unknown as RawMessageData[]
      ).map((msg: RawMessageData) => {
        return {
          ...msg,
          sender: msg.sender || {
            id: msg.sender_id || '',
            username: 'Unknown',
            full_name: 'Unknown User',
            avatar_url: null,
          },
          reply_to: msg.reply_to || null,
        } as ChatMessage;
      });

      // Reverse to show oldest first (since we query newest first for pagination)
      const orderedMessages = transformedMessages.reverse();

      const hasMore = messages.length === pageSize;
      const nextCursor =
        hasMore && messages.length > 0
          ? (messages[messages.length - 1]?.created_at ?? undefined)
          : undefined;

      return {
        messages: orderedMessages,
        has_more: hasMore,
        next_cursor: nextCursor,
      };
    },
    enabled: Boolean(conversationId) && options.enabled !== false,
    getNextPageParam: (lastPage) => lastPage.next_cursor,
    initialPageParam: undefined as string | undefined,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    // Reverse the pages so newest messages appear at the bottom
    select: (data) => ({
      ...data,
      pages: data.pages.slice().reverse(),
    }),
  });
}
