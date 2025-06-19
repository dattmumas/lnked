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
  title: z.string().trim().min(1).max(128),
});

type CollectiveMemberRow = {
  role: string;
  member_id: string;
};

type ConversationRow = {
  id: string;
  title: string | null;
  type: string;
  created_at: string;
};

export async function GET(request: NextRequest, context: { params: Promise<{ collectiveId: string }> }) {
  const { searchParams } = new URL(request.url);
  const beforeIso = searchParams.get('before');
  const limitParam = searchParams.get('limit');
  const limit = Math.min(Math.max(parseInt(limitParam ?? '50', 10) || 50, 1), 100);
  const { collectiveId } = await context.params;

  const supabase = createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: HttpStatus.UNAUTHORIZED });
  }

  // Verify membership
  const { data: member, error: memberErr } = await supabase
    .from('collective_members')
    .select('role')
    .eq('collective_id', collectiveId)
    .eq('member_id', user.id)
    .maybeSingle<CollectiveMemberRow>();

  if (memberErr) {
    return NextResponse.json(
      { error: memberErr.message },
      { status: HttpStatus.INTERNAL_SERVER_ERROR },
    );
  }

  if (!member) {
    return NextResponse.json({ error: 'Forbidden' }, { status: HttpStatus.FORBIDDEN });
  }

  // Build query with keyset pagination
  let chanQuery = supabase
    .from('conversations')
    .select('id, title, type, created_at')
    .eq('collective_id', collectiveId)
    .eq('type', 'channel');

  if (beforeIso) {
    chanQuery = chanQuery.lt('created_at', beforeIso);
  }

  chanQuery = chanQuery.order('created_at', { ascending: false }).limit(limit);

  const { data: channels, error: chanErr } = await chanQuery;

  if (chanErr) {
    return NextResponse.json(
      { error: chanErr.message },
      { status: HttpStatus.INTERNAL_SERVER_ERROR },
    );
  }

  return NextResponse.json(channels as ConversationRow[], { status: HttpStatus.OK });
}

export async function POST(request: NextRequest, context: { params: Promise<{ collectiveId: string }> }) {
  const { collectiveId } = await context.params;

  const supabase = createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: HttpStatus.UNAUTHORIZED });
  }

  // Verify admin/owner role
  const { data: member, error: memberErr } = await supabase
    .from('collective_members')
    .select('role')
    .eq('collective_id', collectiveId)
    .eq('member_id', user.id)
    .maybeSingle<CollectiveMemberRow>();

  if (memberErr) {
    return NextResponse.json(
      { error: memberErr.message },
      { status: HttpStatus.INTERNAL_SERVER_ERROR },
    );
  }

  if (!member || !['owner', 'admin'].includes(member.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: HttpStatus.FORBIDDEN });
  }

  // Parse body
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

  // Insert channel conversation (is_private = false so all collective members can see it)
  const { data: conversation, error: convErr } = await supabase
    .from('conversations')
    .insert({
      type: 'channel',
      collective_id: collectiveId,
      title: parsed.data.title,
      created_by: user.id,
      is_private: false,
    })
    .select('id')
    .single();

  if (convErr || !conversation) {
    return NextResponse.json(
      { error: convErr?.message ?? 'Failed to create channel' },
      { status: HttpStatus.INTERNAL_SERVER_ERROR },
    );
  }

  // Get all collective members to add as participants
  const { data: allMembers, error: membersErr } = await supabase
    .from('collective_members')
    .select('member_id, role')
    .eq('collective_id', collectiveId);

  if (membersErr) {
    // Rollback to avoid orphaned channel
    await supabase.from('conversations').delete().eq('id', conversation.id);
    return NextResponse.json(
      { error: membersErr.message },
      { status: HttpStatus.INTERNAL_SERVER_ERROR },
    );
  }

  if (!allMembers || allMembers.length === 0) {
    // Rollback if no members found
    await supabase.from('conversations').delete().eq('id', conversation.id);
    return NextResponse.json(
      { error: 'No collective members found' },
      { status: HttpStatus.INTERNAL_SERVER_ERROR },
    );
  }

  // Add all collective members as channel participants
  // Map collective roles to conversation participant roles
  const participants = allMembers.map((collectiveMember) => ({
    conversation_id: conversation.id,
    user_id: collectiveMember.member_id,
    role: ['owner', 'admin'].includes(collectiveMember.role) ? 'admin' : 'member',
    joined_at: new Date().toISOString(),
  }));

  const { error: partErr } = await supabase
    .from('conversation_participants')
    .insert(participants);

  if (partErr) {
    // Rollback to avoid orphaned channel without participants
    await supabase.from('conversations').delete().eq('id', conversation.id);
    return NextResponse.json(
      { error: partErr.message },
      { status: HttpStatus.INTERNAL_SERVER_ERROR },
    );
  }

  return NextResponse.json({ 
    conversationId: conversation.id,
    participantsAdded: participants.length 
  }, { status: HttpStatus.CREATED });
}

export const runtime = 'nodejs';