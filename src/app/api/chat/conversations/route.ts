import { NextResponse } from 'next/server';

import { createServerSupabaseClient } from '@/lib/supabase/server';

import type { Database } from '@/lib/database.types';

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
    };
  }>;
};

export async function GET(): Promise<NextResponse> {
  try {
    const supabase = createServerSupabaseClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError !== null || user === null) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch conversations with participants
    const { data: participantData, error: participantError } = await supabase
      .from('conversation_participants')
      .select(`
        conversation_id,
        last_read_at,
        conversations!inner(
          id,
          title,
          type,
          description,
          is_private,
          last_message_at,
          created_at,
          created_by
        )
      `)
      .eq('user_id', user.id)
      .order('conversations(last_message_at)', { ascending: false });

    if (participantError !== null) {
      console.error('Error fetching conversations:', participantError);
      return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
    }

    if (participantData === null || participantData.length === 0) {
      return NextResponse.json({ conversations: [] });
    }

    // Filter out null conversation IDs and get valid IDs
    const validParticipantData = participantData.filter(p => p.conversation_id !== null);
    const conversationIds = validParticipantData.map(p => p.conversation_id as string);

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
      .order('created_at', { ascending: false });

    // Group last messages by conversation
    type LastMessage = NonNullable<typeof lastMessages>[0];
    const lastMessageMap = new Map<string, LastMessage>();
    lastMessages?.forEach(msg => {
      if (msg.conversation_id !== null && msg.conversation_id !== undefined && !lastMessageMap.has(msg.conversation_id)) {
        lastMessageMap.set(msg.conversation_id, msg);
      }
    });

    // Fetch unread counts for each conversation
    const unreadCountPromises = validParticipantData.map(async (participant) => {
      const conversationId = participant.conversation_id as string;
      const lastReadAt = participant.last_read_at !== null && participant.last_read_at !== undefined 
        ? participant.last_read_at 
        : '1970-01-01T00:00:00Z';
      
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', conversationId)
        .gt('created_at', lastReadAt)
        .neq('sender_id', user.id);

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
    allParticipants?.forEach(p => {
      if (p.conversation_id !== null && p.conversation_id !== undefined) {
        const existing = participantsMap.get(p.conversation_id) || [];
        participantsMap.set(p.conversation_id, [...existing, p]);
      }
    });

    // Transform data to include all details
    const conversations: ConversationWithDetails[] = validParticipantData.map(p => {
      const conv = p.conversations as Database['public']['Tables']['conversations']['Row'];
      const conversationId = p.conversation_id as string;
      const lastMessage = lastMessageMap.get(conversationId);
      const participants = participantsMap.get(conversationId) ?? [];
      
      return {
        ...conv,
        unread_count: unreadCountMap.get(conversationId) ?? 0,
        last_message: lastMessage !== undefined && 
                     lastMessage !== null && 
                     lastMessage.created_at !== null && 
                     lastMessage.created_at !== undefined ? {
          id: lastMessage.id,
          content: lastMessage.content,
          created_at: lastMessage.created_at,
          sender: lastMessage.sender as NonNullable<typeof lastMessage.sender>
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
            user: p.user as NonNullable<typeof p.user>
          }))
      };
    });

    return NextResponse.json({ conversations });

  } catch (error) {
    console.error('Unexpected error in GET /api/chat/conversations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const supabase = createServerSupabaseClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError !== null || user === null) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    // Check for existing direct conversation if type is direct
    if (type === 'direct') {
      const otherUserId = participant_ids[0];
      
      // Find conversations where both users are participants
      const { data: existingConversations } = await supabase
        .from('conversations')
        .select(`
          id,
          type,
          conversation_participants!inner(user_id)
        `)
        .eq('type', 'direct')
        .in('conversation_participants.user_id', [user.id, otherUserId]);

      // Check if any conversation has both users
      const existingDirectConv = existingConversations?.find(conv => {
        const participantIds = conv.conversation_participants.map(p => p.user_id);
        return participantIds.includes(user.id) && participantIds.includes(otherUserId);
      });

      if (existingDirectConv !== undefined) {
        return NextResponse.json({ 
          conversation: existingDirectConv,
          existing: true 
        });
      }
    }

    // Create the conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .insert({
        title: title !== undefined && title !== null ? title : null,
        type,
        description: description !== undefined && description !== null ? description : null,
        is_private,
        created_by: user.id,
        last_message_at: new Date().toISOString()
      })
      .select()
      .single();

    if (convError !== null || conversation === null) {
      console.error('Error creating conversation:', convError);
      return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
    }

    // Add participants (including the creator)
    const allParticipantIds = [user.id, ...participant_ids];
    const uniqueParticipantIds = [...new Set(allParticipantIds)];

    const participants = uniqueParticipantIds.map(userId => ({
      conversation_id: conversation.id,
      user_id: userId,
      role: userId === user.id ? 'admin' : 'member',
      joined_at: new Date().toISOString()
    }));

    const { error: participantError } = await supabase
      .from('conversation_participants')
      .insert(participants);

    if (participantError !== null) {
      // Rollback conversation creation
      await supabase.from('conversations').delete().eq('id', conversation.id);
      console.error('Error adding participants:', participantError);
      return NextResponse.json({ error: 'Failed to add participants' }, { status: 500 });
    }

    // For direct conversations, set a default title based on the other user's name
    if (type === 'direct' && (title === undefined || title === null)) {
      const { data: otherUser } = await supabase
        .from('users')
        .select('username, full_name')
        .eq('id', participant_ids[0])
        .single();

      if (otherUser !== null && otherUser !== undefined) {
        const displayName = (otherUser.full_name !== null && otherUser.full_name !== undefined) 
          ? otherUser.full_name 
          : (otherUser.username !== null && otherUser.username !== undefined) 
            ? otherUser.username 
            : 'Unknown User';
        await supabase
          .from('conversations')
          .update({ title: displayName })
          .eq('id', conversation.id);
      }
    }

    return NextResponse.json({ 
      conversation,
      existing: false
    });

  } catch (error) {
    console.error('Unexpected error in POST /api/chat/conversations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 