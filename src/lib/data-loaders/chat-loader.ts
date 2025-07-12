import { createServerSupabaseClient } from '@/lib/supabase/server';

import type { Database } from '@/lib/database.types';
import type { ChatConversation as ConversationWithParticipants } from '@/types/chat-v2';

type ConversationRow = Database['public']['Tables']['conversations']['Row'];
type UserRow = Database['public']['Tables']['users']['Row'];
type MessageRow = Database['public']['Tables']['messages']['Row'];

export interface ChatConversation extends ConversationRow {
  unread_count?: number;
  last_message?: {
    id: string;
    content: string | null;
    created_at: string;
    sender?: {
      id: string;
      username: string | null;
      full_name: string | null;
    } | null;
  } | null;
  participants?: Array<{
    user_id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  }>;
}

/**
 * Convert ChatConversation to ConversationWithParticipants
 * This bridges the type mismatch between server-side and client-side types
 */
export function chatConversationToConversationWithParticipants(
  chatConv: ChatConversation,
): ConversationWithParticipants {
  // Transform participants to match the expected structure
  const participants = (chatConv.participants || []).map((p, index) => ({
    // Add required ConversationParticipant fields
    id: `${chatConv.id}-${p.user_id}`, // Generate a unique ID
    conversation_id: chatConv.id,
    user_id: p.user_id,
    role: 'member' as string | null,
    last_read_at: null,
    is_muted: false as boolean | null,
    is_pinned: false as boolean | null,
    joined_at: chatConv.created_at,
    deleted_at: null,
    // Add the nested user object
    user: {
      id: p.user_id,
      full_name: p.full_name,
      username: p.username,
      avatar_url: p.avatar_url,
    },
  }));

  // Transform last_message to ChatMessage format
  const last_message: ChatMessage | null = chatConv.last_message
    ? {
        id: chatConv.last_message.id,
        conversation_id: chatConv.id,
        sender_id: chatConv.last_message.sender?.id || null,
        content: chatConv.last_message.content ?? '',
        message_type: 'text' as string | null,
        created_at: chatConv.last_message.created_at,
        updated_at: chatConv.last_message.created_at,
        edited_at: null,
        deleted_at: null,
        reply_to_id: null,
        metadata: {},
        tenant_id: null,
        sender: chatConv.last_message.sender
          ? {
              id: chatConv.last_message.sender.id,
              full_name: chatConv.last_message.sender.full_name,
              username: chatConv.last_message.sender.username,
              avatar_url: null,
            }
          : null,
      }
    : null;

  return {
    ...chatConv,
    participants,
    ...(last_message !== null ? { last_message } : {}),
    ...(chatConv.unread_count !== undefined
      ? { unread_count: chatConv.unread_count }
      : {}),
    created_by_user: null,
  } as ConversationWithParticipants;
}

export interface ChatMessage extends MessageRow {
  sender?: {
    id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  reply_to?: {
    id: string;
    content: string | null;
    sender?: {
      id: string;
      username: string | null;
    } | null;
  } | null;
}

export interface ChatPageData {
  conversations: ChatConversation[];
  conversationsWithParticipants?: ConversationWithParticipants[];
  userProfile: {
    id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
    bio: string | null;
  } | null;
  tenants: Array<{
    tenant_id: string;
    tenant_type: 'personal' | 'collective';
    tenant_name: string;
    tenant_slug: string;
    is_personal: boolean;
  }>;
}

/**
 * Load initial chat data for the chat page
 * Fetches conversations, user profile, and tenant memberships
 */
export async function loadChatData(userId: string): Promise<ChatPageData> {
  const supabase = await createServerSupabaseClient();

  // Execute all queries in parallel for better performance
  const [conversationsResult, profileResult, tenantsResult] = await Promise.all(
    [
      // Get conversations with last message and unread count
      supabase
        .from('conversations')
        .select(
          `
        *,
        conversation_participants!inner(
          user_id,
          last_read_at
        ),
        messages(
          id,
          content,
          created_at,
          sender_id,
          sender:users!sender_id(
            id,
            username,
            full_name
          )
        )
      `,
        )
        .eq('conversation_participants.user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(50),

      // Get user profile
      supabase
        .from('users')
        .select('id, username, full_name, avatar_url, bio')
        .eq('id', userId)
        .single(),

      // Get user's tenant memberships
      supabase
        .from('tenant_members')
        .select(
          `
        tenant_id,
        tenant:tenants!inner(
          id,
          name,
          slug,
          type
        )
      `,
        )
        .eq('user_id', userId),
    ],
  );

  // Process conversations to include last message and unread count
  const conversations: ChatConversation[] = (
    conversationsResult.data || []
  ).map((conv) => {
    type RawParticipant = { user_id: string; last_read_at: string | null };
    type RawMessage = {
      id: string;
      content: string | null;
      created_at: string;
      sender_id: string;
      sender?: {
        id: string;
        username: string | null;
        full_name: string | null;
      } | null;
    };

    // Get the participant info for this user
    const participantArray =
      (conv as unknown as { conversation_participants?: RawParticipant[] })
        .conversation_participants ?? null;
    const participant = Array.isArray(participantArray)
      ? participantArray.find((p) => p.user_id === userId)
      : null;

    // Get last message
    const rawMessages =
      (conv as unknown as { messages?: RawMessage[] }).messages ?? null;
    const messages = Array.isArray(rawMessages) ? rawMessages : [];
    const lastMessage =
      messages.length > 0
        ? [...messages].sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime(),
          )[0]
        : null;

    // Calculate unread count (simplified - would need proper query in production)
    const lastReadAt = participant?.last_read_at
      ? new Date(participant.last_read_at).getTime()
      : 0;

    const unreadCount = messages.filter(
      (msg) =>
        new Date(msg.created_at).getTime() > lastReadAt &&
        msg.sender_id !== userId,
    ).length;

    const {
      conversation_participants: _cp,
      messages: _m,
      ...rest
    } = conv as Omit<
      ChatConversation & {
        conversation_participants?: unknown;
        messages?: unknown;
      },
      'conversation_participants' | 'messages'
    > &
      Record<string, unknown>;

    return {
      ...rest,
      unread_count: unreadCount,
      last_message: lastMessage
        ? {
            id: lastMessage.id,
            content: lastMessage.content,
            created_at: lastMessage.created_at,
            sender: lastMessage.sender ?? null,
          }
        : null,
    } as ChatConversation;
  });

  // Transform tenants data
  const tenants = (tenantsResult.data || []).map((tm) => {
    const tenant = tm.tenant as {
      id: string;
      name: string;
      slug: string;
      type: string; // Supabase enum: personal | collective
    };
    return {
      tenant_id: tenant.id,
      tenant_type: tenant.type as 'personal' | 'collective',
      tenant_name: tenant.name,
      tenant_slug: tenant.slug,
      is_personal: tenant.type === 'personal',
    };
  });

  // Convert conversations to ConversationWithParticipants format
  const conversationsWithParticipants = conversations.map(
    chatConversationToConversationWithParticipants,
  );

  return {
    conversations,
    conversationsWithParticipants,
    userProfile: profileResult.data,
    tenants,
  };
}

/**
 * Load messages for a specific conversation
 * Supports pagination for infinite scroll
 */
export async function loadConversationMessages(
  conversationId: string,
  userId: string,
  options: {
    limit?: number;
    before?: string; // Message ID to load messages before
  } = {},
): Promise<{
  messages: ChatMessage[];
  hasMore: boolean;
}> {
  const { limit = 50, before } = options;
  const supabase = await createServerSupabaseClient();

  // Verify user has access to this conversation
  const { data: participant } = await supabase
    .from('conversation_participants')
    .select('user_id')
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .single();

  if (!participant) {
    return { messages: [], hasMore: false };
  }

  // Build messages query
  let query = supabase
    .from('messages')
    .select(
      `
      *,
      sender:users!sender_id(
        id,
        username,
        full_name,
        avatar_url
      ),
      reply_to:messages!reply_to_id(
        id,
        content,
        sender:users!sender_id(
          id,
          username
        )
      )
    `,
    )
    .eq('conversation_id', conversationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(limit + 1); // Get one extra to check if there are more

  // Add pagination if before is provided
  if (before) {
    const { data: beforeMessage } = await supabase
      .from('messages')
      .select('created_at')
      .eq('id', before)
      .single();

    if (beforeMessage) {
      query = query.lt('created_at', beforeMessage.created_at);
    }
  }

  const { data: messages, error } = await query;

  if (error) {
    console.error('Error loading messages:', error);
    return { messages: [], hasMore: false };
  }

  // Check if there are more messages
  const hasMore = messages && messages.length > limit;
  const finalMessages = hasMore ? messages.slice(0, -1) : messages || [];

  // Transform messages
  const transformedMessages: ChatMessage[] = finalMessages.map((msg) => ({
    ...msg,
    sender: msg.sender || null,
    reply_to: msg.reply_to || null,
  }));

  // Return in chronological order for display
  return {
    messages: transformedMessages.reverse(),
    hasMore,
  };
}

/**
 * Get conversation participants
 */
export async function loadConversationParticipants(
  conversationId: string,
): Promise<
  Array<{
    user_id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
    role: string;
    joined_at: string;
  }>
> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('conversation_participants')
    .select(
      `
      user_id,
      role,
      joined_at,
      user:users!user_id(
        id,
        username,
        full_name,
        avatar_url
      )
    `,
    )
    .eq('conversation_id', conversationId);

  if (error || !data) {
    console.error('Error loading participants:', error);
    return [];
  }

  return data
    .filter((p) => p.user_id && p.role && p.joined_at)
    .map((p) => ({
      user_id: p.user_id!,
      username: p.user?.username || null,
      full_name: p.user?.full_name || null,
      avatar_url: p.user?.avatar_url || null,
      role: p.role!,
      joined_at: p.joined_at!,
    }));
}
