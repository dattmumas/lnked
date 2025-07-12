import { useQuery } from '@tanstack/react-query';

import supabase from '@/lib/supabase/browser';
import { ChatConversation, ConversationsResponse } from '@/types/chat-v2';

interface UseTenantConversationsOptions {
  enabled?: boolean;
}

// Type for RPC conversation response
interface RpcConversationData {
  id: string;
  title: string | null;
  type: string;
  description: string | null;
  is_private: boolean | null;
  participant_count: number;
  created_at: string;
  updated_at: string;
}

// Type for message data from query
interface MessageData {
  id: string;
  conversation_id: string;
  content: string;
  message_type: string | null;
  created_at: string | null;
  sender_id: string | null;
  sender: {
    id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

// Type for participant data
interface ParticipantData {
  conversation_id: string;
  user_id: string;
  user: {
    id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export function useTenantConversations(
  tenantId: string | null,
  options: UseTenantConversationsOptions = {},
) {
  return useQuery({
    queryKey: ['tenants', tenantId, 'conversations'],
    queryFn: async (): Promise<ConversationsResponse> => {
      if (!tenantId) {
        throw new Error('Tenant ID is required');
      }

      // Get current user ID for participant filtering
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('❌ [useTenantConversations] Auth error:', userError);
        throw new Error('Authentication required');
      }
      const currentUserId = user.id;

      // Use the RPC function that properly handles both tenant conversations and cross-tenant direct messages
      const { data: conversations, error } = await supabase.rpc(
        'get_tenant_conversations',
        {
          target_tenant_id: tenantId,
        },
      );

      if (error) {
        console.error('❌ [useTenantConversations] RPC error:', error);
        throw new Error(`Failed to fetch conversations: ${error.message}`);
      }

      if (!conversations) {
        console.log('⚠️ [useTenantConversations] No conversations returned');
        return {
          conversations: [],
          has_more: false,
        };
      }

      // Get conversation IDs for fetching additional data
      const rpcConversations = conversations as RpcConversationData[];
      const conversationIds = rpcConversations.map((c) => c.id);

      // Fetch last messages for all conversations
      let lastMessages: MessageData[] = [];
      if (conversationIds.length > 0) {
        const { data: messagesData, error: messagesError } = await supabase
          .from('messages')
          .select(
            `
            id,
            conversation_id,
            content,
            message_type,
            created_at,
            sender_id,
            sender:users(
              id,
              username,
              full_name,
              avatar_url
            )
          `,
          )
          .in('conversation_id', conversationIds)
          .is('deleted_at', null)
          .not('sender_id', 'is', null) // Only get messages with valid sender_id
          .order('created_at', { ascending: false });

        if (messagesError) {
          console.error(
            '❌ [useTenantConversations] Messages fetch error:',
            messagesError,
          );
        } else {
          // console.log(
          //   '📨 [useTenantConversations] Raw messages data:',
          //   messagesData,
          // );
        }

        lastMessages = (messagesData || []) as MessageData[];
      }

      // Group last messages by conversation
      const lastMessagesMap = new Map<string, MessageData>();
      lastMessages.forEach((msg) => {
        if (!lastMessagesMap.has(msg.conversation_id)) {
          lastMessagesMap.set(msg.conversation_id, msg);
        }
      });

      // For direct messages, fetch participants to generate proper titles
      const directConversations = rpcConversations.filter(
        (c) => c.type === 'direct',
      );
      const participantsMap = new Map<string, ParticipantData[]>();

      if (directConversations.length > 0) {
        const { data: participantsData } = await supabase
          .from('conversation_participants')
          .select(
            `
            conversation_id,
            user_id,
            user:users(
              id,
              username,
              full_name,
              avatar_url
            )
          `,
          )
          .in(
            'conversation_id',
            directConversations.map((c) => c.id),
          )
          .is('deleted_at', null);

        if (participantsData) {
          const typedParticipantsData = participantsData as ParticipantData[];
          typedParticipantsData.forEach((p) => {
            if (!participantsMap.has(p.conversation_id)) {
              participantsMap.set(p.conversation_id, []);
            }
            participantsMap.get(p.conversation_id)?.push(p);
          });
        }
      }

      // Transform the data to match our ChatConversation interface
      const transformedConversations: ChatConversation[] = rpcConversations.map(
        (conv) => {
          let { title } = conv;

          // Generate title for direct messages based on participants
          if (conv.type === 'direct' && !title) {
            const participants = participantsMap.get(conv.id) || [];
            // Filter out current user to show the other participant's name
            const otherParticipants = participants.filter(
              (p) => p.user_id !== currentUserId,
            );
            if (otherParticipants.length > 0) {
              const otherUser = otherParticipants[0]?.user;
              title =
                otherUser?.full_name || otherUser?.username || 'Direct Message';
            } else {
              title = 'Direct Message';
            }
          }

          // Determine avatar URL for sidebar display (direct messages)
          const participants = participantsMap.get(conv.id) || [];
          const otherParticipant = participants.find(
            (p) => p.user_id !== currentUserId,
          );
          const displayAvatarUrl =
            conv.type === 'direct'
              ? (otherParticipant?.user.avatar_url ?? null)
              : null;

          return {
            id: conv.id,
            title,
            type: conv.type,
            description: conv.description,
            is_private: conv.is_private,
            created_at: conv.created_at,
            updated_at: conv.updated_at,
            archived: null,
            collective_id: null,
            created_by: null,
            direct_conversation_hash: null,
            last_message_at: null,
            tenant_id: null,
            unique_group_hash: null,
            participant_count: conv.participant_count,
            last_message: lastMessagesMap.get(conv.id) || null,
            unread_count: 0, // TODO: Implement unread count calculation
            participants,
            display_avatar_url: displayAvatarUrl,
          } as ChatConversation;
        },
      );

      return {
        conversations: transformedConversations,
        has_more: false, // TODO: Implement pagination if needed
      };
    },
    enabled: Boolean(tenantId) && options.enabled !== false,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}
