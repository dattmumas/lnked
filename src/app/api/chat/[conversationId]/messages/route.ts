/* eslint-disable no-magic-numbers */

import { NextRequest, NextResponse } from 'next/server';

import { createServerSupabaseClient } from '@/lib/supabase/server';

const enum HttpStatus {
  OK = 200,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  INTERNAL_SERVER_ERROR = 500,
}

export async function GET(request: NextRequest, context: { params: Promise<{ conversationId: string }> }): Promise<NextResponse> {
  const { conversationId } = await context.params;
  const { searchParams } = new URL(request.url);
  const beforeIso = searchParams.get('before');
  const limitParam = searchParams.get('limit');
  const limit = Math.min(Math.max(parseInt(limitParam ?? '50', 10) || 50, 1), 100);

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

  if (partErr !== null) {
    return NextResponse.json({ error: partErr.message }, { status: HttpStatus.INTERNAL_SERVER_ERROR });
  }
  if (participant === null) {
    return NextResponse.json({ error: 'Forbidden' }, { status: HttpStatus.FORBIDDEN });
  }

  // Build query
  let msgQuery = supabase
    .from('messages')
    .select(
      `*, 
      sender:users(id, full_name, username, avatar_url), 
      reply_to:messages(*, sender:users(id, full_name, username, avatar_url)),
      message_reactions(emoji, user_id)`,
    )
    .eq('conversation_id', conversationId)
    .is('deleted_at', null);

  // For pagination, get messages older than the cursor
  if (beforeIso !== null && beforeIso !== undefined) {
    msgQuery = msgQuery.lt('created_at', beforeIso);
  }

  // First get messages newest-first to get the most recent ones
  const { data: messagesDesc, error: msgErr } = await msgQuery
    .order('created_at', { ascending: false })
    .limit(limit);

  if (msgErr !== null) {
    return NextResponse.json({ error: msgErr.message }, { status: HttpStatus.INTERNAL_SERVER_ERROR });
  }

  // No longer reversing here. The client will handle display order.
  const messages = messagesDesc ?? [];

  return NextResponse.json(messages, { status: HttpStatus.OK });
}

export const runtime = 'nodejs'; 