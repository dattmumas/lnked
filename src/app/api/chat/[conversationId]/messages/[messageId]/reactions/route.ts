/* eslint-disable no-magic-numbers */

import { NextResponse } from 'next/server';
import { z } from 'zod';

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

const EMOJI_MIN_LENGTH = 1;
const EMOJI_MAX_LENGTH = 10;

const ReactionSchema = z.object({
  emoji: z.string().min(EMOJI_MIN_LENGTH).max(EMOJI_MAX_LENGTH),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ conversationId: string; messageId: string }> }
): Promise<NextResponse> {
  const { conversationId, messageId } = await context.params;
  
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError !== null || user === null) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: HttpStatus.UNAUTHORIZED });
  }

  // Validate body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: HttpStatus.BAD_REQUEST });
  }

  const parsed = ReactionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid body', details: parsed.error.flatten() },
      { status: HttpStatus.BAD_REQUEST },
    );
  }

  const { emoji } = parsed.data;

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

  // Verify message exists
  const { data: message, error: msgErr } = await supabase
    .from('messages')
    .select('id')
    .eq('id', messageId)
    .eq('conversation_id', conversationId)
    .maybeSingle();

  if (msgErr !== null || message === null) {
    return NextResponse.json({ error: 'Message not found' }, { status: HttpStatus.NOT_FOUND });
  }

  // First, check if user already has a reaction on this message
  const { data: existingReaction } = await supabase
    .from('message_reactions')
    .select('emoji')
    .eq('message_id', messageId)
    .eq('user_id', user.id)
    .maybeSingle();

  // If user already reacted with the same emoji, just return success
  if (existingReaction?.emoji === emoji) {
    return NextResponse.json({ success: true }, { status: HttpStatus.OK });
  }

  // Delete any existing reaction from this user on this message
  if (existingReaction !== null && existingReaction !== undefined) {
    const { error: deleteErr } = await supabase
      .from('message_reactions')
      .delete()
      .eq('message_id', messageId)
      .eq('user_id', user.id);

    if (deleteErr !== null) {
      console.error('Failed to delete existing reaction:', deleteErr);
      return NextResponse.json(
        { error: 'Failed to update reaction' },
        { status: HttpStatus.INTERNAL_SERVER_ERROR },
      );
    }
  }

  // Add the new reaction
  const { error: reactionErr } = await supabase
    .from('message_reactions')
    .insert({
      message_id: messageId,
      user_id: user.id,
      emoji,
    })
    .select();

  if (reactionErr !== null) {
    console.error('Failed to insert reaction:', reactionErr);
    return NextResponse.json(
      { error: reactionErr.message },
      { status: HttpStatus.INTERNAL_SERVER_ERROR },
    );
  }

  return NextResponse.json({ success: true }, { status: HttpStatus.CREATED });
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
  
  const supabase = createServerSupabaseClient();
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