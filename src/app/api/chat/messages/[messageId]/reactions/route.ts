import { NextResponse } from 'next/server';

import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(
  request: Request,
  context: { params: Promise<{ messageId: string }> }
): Promise<Response> {
  try {
    const { messageId } = await context.params;
    const supabase = createServerSupabaseClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { emoji } = body as { emoji: string };

    if (!emoji || typeof emoji !== 'string' || emoji.length === 0) {
      return NextResponse.json({ error: 'Invalid emoji' }, { status: 400 });
    }

    // Verify message exists and user has access
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .select(`
        id,
        conversation_id,
        conversation_participants!inner(user_id)
      `)
      .eq('id', messageId)
      .eq('conversation_participants.user_id', user.id)
      .single();

    if (messageError || !message) {
      return NextResponse.json({ error: 'Message not found or access denied' }, { status: 404 });
    }

    // Check if reaction already exists
    const { data: existingReaction } = await supabase
      .from('message_reactions')
      .select('id')
      .eq('message_id', messageId)
      .eq('user_id', user.id)
      .eq('emoji', emoji)
      .single();

    if (existingReaction) {
      return NextResponse.json({ 
        message: 'Reaction already exists',
        reaction_id: existingReaction.id 
      });
    }

    // Add reaction
    const { data: newReaction, error: insertError } = await supabase
      .from('message_reactions')
      .insert({
        message_id: messageId,
        user_id: user.id,
        emoji,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error adding reaction:', insertError);
      return NextResponse.json({ error: 'Failed to add reaction' }, { status: 500 });
    }

    // Get updated reaction counts
    const { data: reactionCounts } = await supabase
      .from('message_reactions')
      .select('emoji')
      .eq('message_id', messageId);

    const counts = (reactionCounts || []).reduce((acc, r) => {
      acc[r.emoji] = (acc[r.emoji] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({ 
      reaction: newReaction,
      counts
    });

  } catch (error) {
    console.error('Unexpected error in POST /api/chat/messages/[messageId]/reactions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ messageId: string }> }
): Promise<Response> {
  try {
    const { messageId } = await context.params;
    const supabase = createServerSupabaseClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { emoji } = body as { emoji: string };

    if (!emoji || typeof emoji !== 'string' || emoji.length === 0) {
      return NextResponse.json({ error: 'Invalid emoji' }, { status: 400 });
    }

    // Verify message exists and user has access
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .select(`
        id,
        conversation_id,
        conversation_participants!inner(user_id)
      `)
      .eq('id', messageId)
      .eq('conversation_participants.user_id', user.id)
      .single();

    if (messageError || !message) {
      return NextResponse.json({ error: 'Message not found or access denied' }, { status: 404 });
    }

    // Remove reaction
    const { error: deleteError } = await supabase
      .from('message_reactions')
      .delete()
      .eq('message_id', messageId)
      .eq('user_id', user.id)
      .eq('emoji', emoji);

    if (deleteError) {
      console.error('Error removing reaction:', deleteError);
      return NextResponse.json({ error: 'Failed to remove reaction' }, { status: 500 });
    }

    // Get updated reaction counts
    const { data: reactionCounts } = await supabase
      .from('message_reactions')
      .select('emoji')
      .eq('message_id', messageId);

    const counts = (reactionCounts || []).reduce((acc, r) => {
      acc[r.emoji] = (acc[r.emoji] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({ 
      success: true,
      counts
    });

  } catch (error) {
    console.error('Unexpected error in DELETE /api/chat/messages/[messageId]/reactions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 