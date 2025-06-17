

/* eslint-disable no-magic-numbers */

import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createServerSupabaseClient } from '@/lib/supabase/server';

const enum HttpStatus {
  OK = 200,
  CREATED = 201,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  INTERNAL_SERVER_ERROR = 500,
}

const BodySchema = z.object({
  recipientId: z.string().uuid(),
});

type ConversationParticipantRow = {
  conversation_id: string;
};

export async function POST(request: Request) {
  // 1. Initialise Supabase SSR client and authenticate caller
  const supabase = createServerSupabaseClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: HttpStatus.UNAUTHORIZED });
  }

  // 2. Parse & validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: HttpStatus.BAD_REQUEST },
    );
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid body', details: parsed.error.flatten() },
      { status: HttpStatus.BAD_REQUEST },
    );
  }

  const { recipientId } = parsed.data;
  const senderId = user.id;

  if (recipientId === senderId) {
    return NextResponse.json(
      { error: 'Cannot create a DM with yourself.' },
      { status: HttpStatus.BAD_REQUEST },
    );
  }

  // 3. Idempotent lookup – is there already a direct conversation?
  const { data: senderRows, error: senderRowsErr } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', senderId);

  if (senderRowsErr) {
    return NextResponse.json(
      { error: senderRowsErr.message },
      { status: HttpStatus.INTERNAL_SERVER_ERROR },
    );
  }

  const senderConvIds = (senderRows as ConversationParticipantRow[]).map(
    (row) => row.conversation_id,
  );

  let existingConvId: string | undefined;

  if (senderConvIds.length) {
    const { data: sharedRows, error: sharedRowsErr } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', recipientId)
      .in('conversation_id', senderConvIds);

    if (sharedRowsErr) {
      return NextResponse.json(
        { error: sharedRowsErr.message },
        { status: HttpStatus.INTERNAL_SERVER_ERROR },
      );
    }

    const sharedConvIds = (sharedRows as ConversationParticipantRow[]).map(
      (row) => row.conversation_id,
    );

    if (sharedConvIds.length) {
      const { data: directConv } = await supabase
        .from('conversations')
        .select('id')
        .eq('type', 'direct')
        .in('id', sharedConvIds)
        .maybeSingle();

      if (directConv) {
        existingConvId = directConv.id as string;
      }
    }
  }

  if (existingConvId) {
    return NextResponse.json({ conversationId: existingConvId }, { status: HttpStatus.OK });
  }

  // 4. Create the new direct conversation (and its two participants) inside a transaction‑like flow
  const { data: newConv, error: convInsertErr } = await supabase
    .from('conversations')
    .insert({ type: 'direct', created_by: senderId })
    .select('id')
    .single();

  if (convInsertErr) {
    return NextResponse.json(
      { error: convInsertErr.message },
      { status: HttpStatus.INTERNAL_SERVER_ERROR },
    );
  }

  const convId = newConv.id as string;

  const { error: participantsErr } = await supabase.from('conversation_participants').insert([
    { conversation_id: convId, user_id: senderId, role: 'member' },
    { conversation_id: convId, user_id: recipientId, role: 'member' },
  ]);

  if (participantsErr) {
    // Best‑effort rollback to avoid dangling rows
    await supabase.from('conversations').delete().eq('id', convId);
    return NextResponse.json(
      { error: participantsErr.message },
      { status: HttpStatus.INTERNAL_SERVER_ERROR },
    );
  }

  return NextResponse.json({ conversationId: convId }, { status: HttpStatus.CREATED });
}

export const runtime = 'nodejs';