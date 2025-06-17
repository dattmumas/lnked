/* eslint-disable no-magic-numbers */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createServerSupabaseClient } from '@/lib/supabase/server';

const enum HttpStatus {
  OK = 200,
  CREATED = 201,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  INTERNAL_SERVER_ERROR = 500,
}

const BodySchema = z.object({
  content: z.string().trim().min(1, 'Message content is required').max(10000),
  metadata: z.record(z.any()).optional(),
});

type MessageRow = {
  id: string;
  content: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  sender: {
    id: string;
    username: string | null;
    avatar_url: string | null;
  };
};

export async function POST(
  request: NextRequest,
  { params }: { params: { conversationId: string } },
) {
  const { conversationId } = params;

  // 1. Auth
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: HttpStatus.UNAUTHORIZED });
  }

  // 2. Validate body
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

  const { content, metadata } = parsed.data;

  // 3. Verify participant
  const { data: participant, error: partErr } = await supabase
    .from('conversation_participants')
    .select('id')
    .eq('conversation_id', conversationId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (partErr) {
    return NextResponse.json(
      { error: partErr.message },
      { status: HttpStatus.INTERNAL_SERVER_ERROR },
    );
  }

  if (!participant) {
    return NextResponse.json({ error: 'Forbidden' }, { status: HttpStatus.FORBIDDEN });
  }

  // 4. Insert message
  const { data: msg, error: msgErr } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      content,
      metadata: metadata ?? null,
      sender_id: user.id,
    })
    .select('id, content, metadata, created_at, sender: users(id, username, avatar_url)')
    .single<MessageRow>();

  if (msgErr || !msg) {
    return NextResponse.json(
      { error: msgErr?.message ?? 'Failed to send message' },
      { status: HttpStatus.INTERNAL_SERVER_ERROR },
    );
  }

  return NextResponse.json(msg, { status: HttpStatus.CREATED });
}

export const runtime = 'nodejs'; 