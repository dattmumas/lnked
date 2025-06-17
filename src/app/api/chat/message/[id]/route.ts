/* eslint-disable no-magic-numbers */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

const enum HttpStatus {
  OK = 200,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  INTERNAL_SERVER_ERROR = 500,
}

const PatchBodySchema = z.object({
  content: z.string().trim().min(1).max(10000).optional(),
  metadata: z.record(z.any()).optional(),
});

type MessageRowSimple = {
  id: string;
  content: string | null;
  metadata: Record<string, unknown> | null;
  updated_at: string | null;
};

async function authorizeEditOrDelete(
  supabase: SupabaseClient<Database>,
  messageId: string,
  userId: string
) {
  // Fetch message + sender
  const { data: msg, error: msgErr } = await supabase
    .from('messages')
    .select('id, sender_id, conversation_id')
    .eq('id', messageId)
    .single<{ id: string; sender_id: string | null; conversation_id: string | null }>();

  if (msgErr) {
    return { error: msgErr.message, status: HttpStatus.INTERNAL_SERVER_ERROR } as const;
  }

  if (!msg) {
    return { error: 'Not found', status: HttpStatus.NOT_FOUND } as const;
  }

  if (msg.conversation_id === null) {
    return { error: 'Invalid message', status: HttpStatus.NOT_FOUND } as const;
  }

  // Is sender? If yes, allow.
  if (msg.sender_id === userId) {
    return { conversationId: msg.conversation_id } as const;
  }

  // Else, check admin role in conversation
  const { data: participant, error: partErr } = await supabase
    .from('conversation_participants')
    .select('role')
    .eq('conversation_id', msg.conversation_id)
    .eq('user_id', userId)
    .maybeSingle<{ role: string | null }>();

  if (partErr) {
    return { error: partErr.message, status: HttpStatus.INTERNAL_SERVER_ERROR } as const;
  }

  if (!participant || participant.role !== 'admin') {
    return { error: 'Forbidden', status: HttpStatus.FORBIDDEN } as const;
  }

  return { conversationId: msg.conversation_id } as const;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const messageId = params.id;

  const supabase = createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: HttpStatus.UNAUTHORIZED });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: HttpStatus.BAD_REQUEST });
  }

  const parsed = PatchBodySchema.safeParse(body);
  if (!parsed.success || (!parsed.data.content && !parsed.data.metadata)) {
    return NextResponse.json({ error: 'Invalid body' }, { status: HttpStatus.BAD_REQUEST });
  }

  const authz = await authorizeEditOrDelete(supabase, messageId, user.id);
  if ('error' in authz) {
    return NextResponse.json({ error: authz.error }, { status: authz.status });
  }

  const { content, metadata } = parsed.data;

  const { data: updated, error: updErr } = await supabase
    .from('messages')
    .update({
      ...(content !== undefined ? { content } : {}),
      ...(metadata !== undefined ? { metadata } : {}),
      edited_at: new Date().toISOString(),
    })
    .eq('id', messageId)
    .select('id, content, metadata, updated_at')
    .single<MessageRowSimple>();

  if (updErr || !updated) {
    return NextResponse.json(
      { error: updErr?.message ?? 'Failed to update message' },
      { status: HttpStatus.INTERNAL_SERVER_ERROR },
    );
  }

  return NextResponse.json(updated, { status: HttpStatus.OK });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const messageId = params.id;

  const supabase = createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: HttpStatus.UNAUTHORIZED });
  }

  const authz = await authorizeEditOrDelete(supabase, messageId, user.id);
  if ('error' in authz) {
    return NextResponse.json({ error: authz.error }, { status: authz.status });
  }

  const { error: delErr } = await supabase
    .from('messages')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', messageId);

  if (delErr) {
    return NextResponse.json(
      { error: delErr.message },
      { status: HttpStatus.INTERNAL_SERVER_ERROR },
    );
  }

  return NextResponse.json({ success: true }, { status: HttpStatus.OK });
}

export const runtime = 'nodejs'; 