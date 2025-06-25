import { NextResponse } from 'next/server';

import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function PATCH(
  _request: Request,
  context: { params: Promise<{ conversationId: string }> }
): Promise<NextResponse> {
  try {
    const { conversationId } = await context.params;
    const supabase = await createServerSupabaseClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError !== null || user === null) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is a participant
    const { data: participant, error: participantError } = await supabase
      .from('conversation_participants')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .single();

    if (participantError !== null || participant === null) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update last_read_at timestamp
    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('conversation_participants')
      .update({ last_read_at: now })
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id);

    if (updateError !== null) {
      console.error('Error updating read status:', updateError);
      return NextResponse.json({ error: 'Failed to update read status' }, { status: 500 });
    }

    // Calculate new unread count
    const { count: unreadCount } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversationId)
      .gt('created_at', now)
      .neq('sender_id', user.id)
      .is('deleted_at', null);

    return NextResponse.json({ 
      success: true,
      last_read_at: now,
      unread_count: unreadCount !== null && unreadCount !== undefined ? unreadCount : 0
    });

  } catch (error) {
    console.error('Unexpected error in PATCH /api/chat/[conversationId]/read:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 