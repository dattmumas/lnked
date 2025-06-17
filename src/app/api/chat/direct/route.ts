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
        existingConvId = directConv.id;
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

  const convId = newConv.id;

  // Insert creator as admin (per RLS they can add themselves)
  const { error: creatorInsertErr } = await supabase
    .from('conversation_participants')
    .insert({ conversation_id: convId, user_id: senderId, role: 'admin' });

  if (creatorInsertErr) {
    await supabase.from('conversations').delete().eq('id', convId);
    return NextResponse.json(
      { error: creatorInsertErr.message },
      { status: HttpStatus.INTERNAL_SERVER_ERROR },
    );
  }

  // With admin privilege established by previous insert, RLS policy should allow adding other users
  const { error: recipientErr } = await supabase
    .from('conversation_participants')
    .insert({ conversation_id: convId, user_id: recipientId, role: 'member' });

  if (recipientErr) {
    // Rollback entire conv (best-effort)
    await supabase.from('conversation_participants')
      .delete()
      .eq('conversation_id', convId);
    await supabase.from('conversations').delete().eq('id', convId);
    return NextResponse.json(
      { error: recipientErr.message },
      { status: HttpStatus.INTERNAL_SERVER_ERROR },
    );
  }

  return NextResponse.json({ conversationId: convId }, { status: HttpStatus.CREATED });
}

export async function GET(request: Request) {
  const supabase = createServerSupabaseClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: HttpStatus.UNAUTHORIZED });
  }

  // Parse optional query params (?limit= number)
  const { searchParams } = new URL(request.url);
  const limitParam = parseInt(searchParams.get('limit') ?? '50', 10);
  const limit = Math.min(Math.max(limitParam || 50, 1), 100);

  // 1. Get conversation IDs for direct convos where current user is a participant
  const { data: myConvRows, error: myConvErr } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', user.id);

  if (myConvErr) {
    return NextResponse.json(
      { error: myConvErr.message },
      { status: HttpStatus.INTERNAL_SERVER_ERROR },
    );
  }

  const convIds = (myConvRows as ConversationParticipantRow[]).map((r) => r.conversation_id);
  if (!convIds.length) {
    return NextResponse.json([], { status: HttpStatus.OK });
  }

  // 2. Get direct conversations ordered by last_message_at desc (fallback created_at)
  const { data: directConvs, error: convErr } = await supabase
    .from('conversations')
    .select('id, last_message_at, created_at')
    .in('id', convIds)
    .eq('type', 'direct')
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (convErr) {
    return NextResponse.json(
      { error: convErr.message },
      { status: HttpStatus.INTERNAL_SERVER_ERROR },
    );
  }

  const result: any[] = [];

  // 3. For each conversation, get the other participant's public profile data
  for (const conv of directConvs) {
    const { data: otherPartRow, error: otherErr } = await supabase
      .from('conversation_participants')
      .select(
        'user_id, users(full_name, username, avatar_url)',
      )
      .eq('conversation_id', conv.id)
      .neq('user_id', user.id)
      .maybeSingle();

    if (otherErr) {
      return NextResponse.json(
        { error: otherErr.message },
        { status: HttpStatus.INTERNAL_SERVER_ERROR },
      );
    }

    result.push({
      id: conv.id,
      last_message_at: conv.last_message_at ?? conv.created_at,
      user: {
        id: otherPartRow?.user_id ?? null,
        full_name: (otherPartRow as any)?.users?.full_name ?? null,
        username: (otherPartRow as any)?.users?.username ?? null,
        avatar_url: (otherPartRow as any)?.users?.avatar_url ?? null,
      },
    });
  }

  return NextResponse.json(result, { status: HttpStatus.OK });
}

export const runtime = 'nodejs';