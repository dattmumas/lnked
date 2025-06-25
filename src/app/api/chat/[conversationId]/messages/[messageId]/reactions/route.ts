/* eslint-disable no-magic-numbers */

import { NextRequest, NextResponse } from 'next/server';

import { createServerSupabaseClient } from '@/lib/supabase/server';


const enum HttpStatus {
  OK = 200,
  CREATED = 201,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  INTERNAL_SERVER_ERROR = 500,
}





export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string; messageId: string }> }
): Promise<NextResponse> {
  try {
    const { conversationId, messageId } = await params;
    const supabase = await createServerSupabaseClient();

    // Get the current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError !== null || user === null) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: HttpStatus.UNAUTHORIZED }
      );
    }

    // Parse request body
    const body = await request.json();
    const { emoji } = body;

    if (typeof emoji !== 'string' || emoji.trim() === '') {
      return NextResponse.json(
        { error: 'Valid emoji is required' },
        { status: HttpStatus.BAD_REQUEST }
      );
    }

    // Check if user is a participant in the conversation
    const { data: participantData, error: participantError } = await supabase
      .from('conversation_participants')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .single();

    if (participantError !== null || participantData === null) {
      return NextResponse.json(
        { error: 'You are not a participant in this conversation' },
        { status: HttpStatus.FORBIDDEN }
      );
    }

    // Check if message exists in this conversation
    const { data: messageData, error: messageError } = await supabase
      .from('messages')
      .select('id, conversation_id')
      .eq('id', messageId)
      .eq('conversation_id', conversationId)
      .single();

    if (messageError !== null || messageData === null) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: HttpStatus.NOT_FOUND }
      );
    }

    // Check if user already reacted with this emoji
    const { data: existingReaction } = await supabase
      .from('message_reactions')
      .select('id')
      .eq('message_id', messageId)
      .eq('user_id', user.id)
      .eq('emoji', emoji.trim())
      .single();

    if (existingReaction !== null) {
      // Remove existing reaction (toggle off)
      const { error: deleteError } = await supabase
        .from('message_reactions')
        .delete()
        .eq('id', existingReaction.id);

      if (deleteError !== null) {
        console.error('Error removing reaction:', deleteError);
        return NextResponse.json(
          { error: 'Failed to remove reaction' },
          { status: HttpStatus.INTERNAL_SERVER_ERROR }
        );
      }

      return NextResponse.json(
        { message: 'Reaction removed successfully' },
        { status: HttpStatus.OK }
      );
    } else {
      // Add new reaction
      const { data: newReaction, error: insertError } = await supabase
        .from('message_reactions')
        .insert({
          message_id: messageId,
          user_id: user.id,
          emoji: emoji.trim(),
        })
        .select()
        .single();

      if (insertError !== null) {
        console.error('Error adding reaction:', insertError);
        return NextResponse.json(
          { error: 'Failed to add reaction' },
          { status: HttpStatus.INTERNAL_SERVER_ERROR }
        );
      }

      return NextResponse.json(
        { 
          message: 'Reaction added successfully',
          reaction: newReaction
        },
        { status: HttpStatus.CREATED }
      );
    }
  } catch (error: unknown) {
    console.error('Error in POST /api/chat/[conversationId]/messages/[messageId]/reactions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: HttpStatus.INTERNAL_SERVER_ERROR }
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ conversationId: string; messageId: string }> }
): Promise<NextResponse> {
  const { conversationId, messageId } = await context.params;
  const { searchParams } = new URL(request.url);
  const emoji = searchParams.get('emoji');

  if (emoji === null || emoji === undefined) {
    return NextResponse.json({ error: 'Emoji parameter required' }, { status: HttpStatus.BAD_REQUEST });
  }
  
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError !== null || user === null) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: HttpStatus.UNAUTHORIZED });
  }

  // Verify participant access
  const { data: participant, error: partErr } = await supabase
    .from('conversation_participants')
    .select('id')
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (partErr !== null || participant === null) {
    return NextResponse.json({ error: 'Forbidden' }, { status: HttpStatus.FORBIDDEN });
  }

  // Remove reaction
  const { error: deleteErr } = await supabase
    .from('message_reactions')
    .delete()
    .eq('message_id', messageId)
    .eq('user_id', user.id)
    .eq('emoji', emoji);

  if (deleteErr !== null) {
    return NextResponse.json(
      { error: deleteErr.message },
      { status: HttpStatus.INTERNAL_SERVER_ERROR },
    );
  }

  return NextResponse.json({ success: true }, { status: HttpStatus.OK });
}

export const runtime = 'nodejs'; 