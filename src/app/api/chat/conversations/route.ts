import { NextResponse } from 'next/server';

import { createServerSupabaseClient } from '@/lib/supabase/server';

import type { Database } from '@/lib/database.types';

/**
 * @deprecated This route is deprecated. Use /api/tenants/[tenantId]/conversations instead.
 * This legacy route is maintained for backward compatibility but should not be used for new development.
 */

type ConversationWithDetails = Database['public']['Tables']['conversations']['Row'] & {
  unread_count: number;
  last_message: {
    id: string;
    content: string;
    created_at: string;
    sender: {
      id: string;
      username: string | null;
      full_name: string | null;
      avatar_url: string | null;
    };
  } | null;
  participants: Array<{
    user_id: string;
    role: string;
    user: {
      id: string;
      username: string | null;
      full_name: string | null;
      avatar_url: string | null;
    } | null;
  }>;
};

export async function GET(): Promise<NextResponse> {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError !== null || user === null) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Add deprecation warning
    console.warn('DEPRECATED: /api/chat/conversations route is deprecated. Use tenant-scoped routes instead.');

    // Get user's personal tenant for backward compatibility
    const { data: personalTenant, error: tenantError } = await supabase.rpc('get_user_personal_tenant');
    
    if (tenantError !== null || !personalTenant) {
      console.error('Failed to get personal tenant for user:', user.id, tenantError);
      // Fall back to legacy behavior for now
      return await getLegacyConversations(supabase, user.id);
    }

    // Use tenant-scoped function for personal tenant conversations  
    const { data: conversations, error: convError } = await supabase.rpc('get_tenant_conversations', {
      target_tenant_id: personalTenant,
    });

    if (convError !== null) {
      console.error('Error fetching tenant conversations:', convError);
      // Fall back to legacy behavior
      return await getLegacyConversations(supabase, user.id);
    }

    // Get conversation IDs for fetching participants and last messages
    const conversationIds = (conversations as unknown[])?.map((conv: unknown) => {
      const typedConv = conv as { id: string };
      return typedConv.id;
    }) || [];

    // Fetch participants for all conversations
    const { data: allParticipants } = await supabase
      .from('conversation_participants')
      .select(`
        conversation_id,
        user_id,
        role,
        user:users!conversation_participants_user_id_fkey(
          id,
          username,
          full_name,
          avatar_url
        )
      `)
      .in('conversation_id', conversationIds)
      .is('deleted_at', null);

    // Fetch last messages for all conversations
    const { data: lastMessages } = await supabase
      .from('messages')
      .select(`
        id,
        conversation_id,
        content,
        created_at,
        sender:users!messages_sender_id_fkey(
          id,
          username,
          full_name,
          avatar_url
        )
      `)
      .in('conversation_id', conversationIds)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    // Group participants by conversation
    const participantsMap = new Map<string, Array<NonNullable<typeof allParticipants>[0]>>();
    allParticipants?.forEach((p: any) => {
      if (p.conversation_id !== null && p.conversation_id !== undefined) {
        const existing = participantsMap.get(p.conversation_id) || [];
        participantsMap.set(p.conversation_id, [...existing, p]);
      }
    });

    // Group last messages by conversation
    type LastMessage = NonNullable<typeof lastMessages>[0];
    const lastMessageMap = new Map<string, LastMessage>();
    lastMessages?.forEach((msg: any) => {
      if (msg.conversation_id !== null && msg.conversation_id !== undefined && !lastMessageMap.has(msg.conversation_id)) {
        lastMessageMap.set(msg.conversation_id, msg);
      }
    });

    // Transform to match legacy format
    const legacyFormattedConversations: ConversationWithDetails[] = (conversations as unknown[])?.map((conv: unknown) => {
      const typedConv = conv as {
        id: string;
        title: string | null;
        type: string;
        description: string | null;
        is_private: boolean;
        created_at: string | null;
        unread_count?: number;
      };
      
      const participants = participantsMap.get(typedConv.id) ?? [];
      const lastMessage = lastMessageMap.get(typedConv.id);
      
      return {
        // Database fields
        id: typedConv.id,
        title: typedConv.title,
        type: typedConv.type,
        description: typedConv.description ?? null,
        is_private: typedConv.is_private,
        created_at: typedConv.created_at ?? null,
        created_by: null, // Not available in tenant-scoped function
        last_message_at: null, // Not available in tenant-scoped function
        // Add missing fields for backward compatibility
        archived: null,
        collective_id: null,
        tenant_id: null,
        unique_group_hash: null,
        updated_at: null,
        // Keep existing fields
        unread_count: typedConv.unread_count || 0,
        last_message: lastMessage !== undefined && 
                     lastMessage !== null && 
                     lastMessage.created_at !== null && 
                     lastMessage.created_at !== undefined &&
                     lastMessage.sender !== null ? {
          id: lastMessage.id,
          content: lastMessage.content,
          created_at: lastMessage.created_at,
          sender: lastMessage.sender
        } : null,
        participants: participants
          .filter(p => p.user_id !== null && 
                      p.user_id !== undefined && 
                      p.role !== null && 
                      p.role !== undefined)
          .map(p => ({
            user_id: p.user_id as string,
            role: p.role as string,
            user: p.user
          }))
      };
    }) || [];

    return NextResponse.json({ 
      conversations: legacyFormattedConversations,
      _deprecation_warning: 'This endpoint is deprecated. Please use /api/tenants/[tenantId]/conversations'
    });

  } catch (error) {
    console.error('Unexpected error in GET /api/chat/conversations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Legacy conversation fetching for fallback compatibility
 */
async function getLegacyConversations(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>, userId: string): Promise<NextResponse> {
    // Fetch conversations user participates in directly via join to avoid recursion error
    const { data: conversationsWithRead, error: convErr } = await supabase
      .from('conversations')
      .select(`
        id,
        title,
        type,
        description,
        is_private,
        last_message_at,
        created_at,
        created_by,
        conversation_participants:conversation_participants!inner(user_id,last_read_at)
      `)
    .eq('conversation_participants.user_id', userId)
      .is('conversation_participants.deleted_at', null)
      .order('last_message_at', { ascending: false });

    if (convErr !== null) {
      console.error('Error fetching conversations:', convErr);
      return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
    }

    if (!conversationsWithRead || conversationsWithRead.length === 0) {
      return NextResponse.json({ conversations: [] });
    }

    // conversationIds and participantData derive from fetched data
  const validParticipantData = conversationsWithRead.flatMap((conv: any) =>
    (conv.conversation_participants as Array<{ user_id: string; last_read_at: string | null }>).map((p: any) => ({
        conversation_id: conv.id,
        last_read_at: p.last_read_at,
      })),
    );

  const conversationIds = conversationsWithRead.map((c: any) => c.id);

    const conversationsMeta = conversationsWithRead;

    // Fetch last messages for all conversations
    const { data: lastMessages } = await supabase
      .from('messages')
      .select(`
        id,
        conversation_id,
        content,
        created_at,
        sender:users!messages_sender_id_fkey(
          id,
          username,
          full_name,
          avatar_url
        )
      `)
      .in('conversation_id', conversationIds)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    // Group last messages by conversation
    type LastMessage = NonNullable<typeof lastMessages>[0];
    const lastMessageMap = new Map<string, LastMessage>();
  lastMessages?.forEach((msg: any) => {
      if (msg.conversation_id !== null && msg.conversation_id !== undefined && !lastMessageMap.has(msg.conversation_id)) {
        lastMessageMap.set(msg.conversation_id, msg);
      }
    });

    // Fetch unread counts for each conversation
  const unreadCountPromises = validParticipantData.map(async (participant: any) => {
      const conversationId = participant.conversation_id;
      const lastReadAt = participant.last_read_at !== null && participant.last_read_at !== undefined 
        ? participant.last_read_at 
        : '1970-01-01T00:00:00Z';
      
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', conversationId)
        .gt('created_at', lastReadAt)
      .neq('sender_id', userId)
        .is('deleted_at', null);

      return {
        conversation_id: conversationId,
        unread_count: count !== null && count !== undefined ? count : 0
      };
    });

    const unreadCounts = await Promise.all(unreadCountPromises);
    const unreadCountMap = new Map(unreadCounts.map(uc => [uc.conversation_id, uc.unread_count]));

    // Fetch all participants for conversations
    const { data: allParticipants } = await supabase
      .from('conversation_participants')
      .select(`
        conversation_id,
        user_id,
        role,
        user:users!conversation_participants_user_id_fkey(
          id,
          username,
          full_name,
          avatar_url
        )
      `)
      .in('conversation_id', conversationIds);

    // Group participants by conversation
    const participantsMap = new Map<string, Array<NonNullable<typeof allParticipants>[0]>>();
  allParticipants?.forEach((p: any) => {
      if (p.conversation_id !== null && p.conversation_id !== undefined) {
        const existing = participantsMap.get(p.conversation_id) || [];
        participantsMap.set(p.conversation_id, [...existing, p]);
      }
    });

    // Transform data to include all details
    const conversationsMetaMap = new Map<string, NonNullable<typeof conversationsMeta>[0]>();
  conversationsMeta?.forEach((c: any) => conversationsMetaMap.set(c.id, c));

  const conversations: ConversationWithDetails[] = validParticipantData.map((p: any) => {
      const conversationId = p.conversation_id;
    const conv = conversationsMetaMap.get(conversationId);
      const lastMessage = lastMessageMap.get(conversationId);
      const participants = participantsMap.get(conversationId) ?? [];
      
      return {
        // Explicitly map database fields to avoid type conflicts
        id: conv?.id ?? '',
        title: conv?.title ?? null,
        type: conv?.type ?? 'direct',
        description: conv?.description ?? null,
        is_private: conv?.is_private ?? false,
        last_message_at: conv?.last_message_at ?? null,
        created_at: conv?.created_at ?? null,
        created_by: conv?.created_by ?? null,
        // Add missing required fields with default values
        archived: null,
        collective_id: null,
        tenant_id: null,
        unique_group_hash: null,
        updated_at: null,
        unread_count: unreadCountMap.get(conversationId) ?? 0,
        last_message: lastMessage !== undefined && 
                     lastMessage !== null && 
                     lastMessage.created_at !== null && 
                     lastMessage.created_at !== undefined &&
                     lastMessage.sender !== null ? {
          id: lastMessage.id,
          content: lastMessage.content,
          created_at: lastMessage.created_at,
          sender: lastMessage.sender
        } : null,
        participants: participants
          .filter(p => p.user_id !== null && 
                      p.user_id !== undefined && 
                      p.role !== null && 
                      p.role !== undefined && 
                      p.user !== null && 
                      p.user !== undefined)
          .map(p => ({
            user_id: p.user_id as string,
            role: p.role as string,
          user: p.user
          }))
      };
    });

  return NextResponse.json({ 
    conversations,
    _deprecation_warning: 'This endpoint is deprecated. Please use /api/tenants/[tenantId]/conversations'
  });
}

/**
 * @deprecated This route is deprecated. Use /api/tenants/[tenantId]/conversations instead.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError !== null || user === null) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Add deprecation warning
    console.warn('DEPRECATED: POST /api/chat/conversations route is deprecated. Use tenant-scoped routes instead.');

    // Parse request body
    const body: unknown = await request.json();
    const {
      title,
      type,
      description,
      is_private = false,
      participant_ids = []
    } = body as {
      title?: string;
      type: 'direct' | 'group' | 'channel';
      description?: string;
      is_private?: boolean;
      participant_ids: string[];
    };

    // Validate type
    if (!['direct', 'group', 'channel'].includes(type)) {
      return NextResponse.json({ error: 'Invalid conversation type' }, { status: 400 });
    }

    // Validate participants
    if (type === 'direct' && participant_ids.length !== 1) {
      return NextResponse.json({ error: 'Direct conversations must have exactly one other participant' }, { status: 400 });
    }

    if (type === 'group' && participant_ids.length < 1) {
      return NextResponse.json({ error: 'Group conversations must have at least one other participant' }, { status: 400 });
    }

    // Get user's personal tenant for new conversations
    const { data: personalTenant, error: tenantError } = await supabase.rpc('get_user_personal_tenant');
    
    if (tenantError !== null || !personalTenant) {
      console.error('Failed to get personal tenant for user:', user.id, tenantError);
      return NextResponse.json({ error: 'Failed to get user tenant context' }, { status: 500 });
    }

    // Use tenant-scoped function to create conversation
    const { data: newConversation, error: createError } = await supabase.rpc('create_tenant_conversation', {
      target_tenant_id: personalTenant,
      conversation_title: title || undefined,
      conversation_type: type,
      conversation_description: description || undefined,
      is_private_conversation: is_private,
      participant_user_ids: participant_ids,
    });

    if (createError !== null) {
      console.error('Error creating tenant conversation:', createError);
      return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
    }

    if (!newConversation || newConversation.length === 0) {
      return NextResponse.json({ error: 'No conversation returned from creation' }, { status: 500 });
    }

    const conversation = newConversation[0];

    return NextResponse.json({ 
      conversation,
      existing: false,
      _deprecation_warning: 'This endpoint is deprecated. Please use /api/tenants/[tenantId]/conversations'
    });

  } catch (error) {
    console.error('Unexpected error in POST /api/chat/conversations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 