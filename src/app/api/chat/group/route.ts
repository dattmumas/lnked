

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
  participantIds: z.array(z.string().uuid()).min(1, 'At least one participant is required'),
  title: z.string().trim().max(128).optional(),
});

type NewConversationRow = {
  id: string;
};

export async function POST(request: Request) {
  // 1. Auth
  const supabase = createServerSupabaseClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: HttpStatus.UNAUTHORIZED });
  }

  // 2. Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: HttpStatus.BAD_REQUEST });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid body', details: parsed.error.flatten() },
      { status: HttpStatus.BAD_REQUEST },
    );
  }

  const { participantIds: rawIds, title } = parsed.data;
  const creatorId = user.id;

  // 3. Sanitize participant list
  const uniqueIds = Array.from(new Set(rawIds.filter((id) => id !== creatorId)));

  if (!uniqueIds.length) {
    return NextResponse.json(
      { error: 'Cannot create a group without other participants.' },
      { status: HttpStatus.BAD_REQUEST },
    );
  }

  // 4. Create conversation
  const { data: convRow, error: convErr } = await supabase
    .from('conversations')
    .insert({ type: 'group', title: title ?? null, created_by: creatorId })
    .select('id')
    .single();

  if (convErr || !convRow) {
    return NextResponse.json(
      { error: convErr?.message ?? 'Failed to create conversation' },
      { status: HttpStatus.INTERNAL_SERVER_ERROR },
    );
  }

  const convId = (convRow as NewConversationRow).id;

  // 5. Insert participants (creator = admin)
  const participantRows = [
    { conversation_id: convId, user_id: creatorId, role: 'admin' },
    ...uniqueIds.map((uid) => ({
      conversation_id: convId,
      user_id: uid,
      role: 'member',
    })),
  ];

  const { error: partErr } = await supabase.from('conversation_participants').insert(participantRows);

  if (partErr) {
    // Rollback to avoid orphaned conversation
    await supabase.from('conversations').delete().eq('id', convId);
    return NextResponse.json(
      { error: partErr.message },
      { status: HttpStatus.INTERNAL_SERVER_ERROR },
    );
  }

  return NextResponse.json({ conversationId: convId }, { status: HttpStatus.CREATED });
}

export const runtime = 'nodejs';