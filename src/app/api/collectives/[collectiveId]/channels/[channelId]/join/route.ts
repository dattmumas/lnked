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
  CONFLICT = 409,
  INTERNAL_SERVER_ERROR = 500,
}

type CollectiveMemberRow = {
  role: string;
};

export async function POST(
  request: NextRequest, 
  context: { params: Promise<{ collectiveId: string; channelId: string }> }
) {
  const { collectiveId, channelId } = await context.params;

  const supabase = createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: HttpStatus.UNAUTHORIZED });
  }

  // Verify user is a member of the collective
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
    return NextResponse.json({ error: 'Must be a collective member to join channels' }, { status: HttpStatus.FORBIDDEN });
  }

  // Verify the channel exists and belongs to this collective
  const { data: channel, error: channelErr } = await supabase
    .from('conversations')
    .select('id, collective_id, type')
    .eq('id', channelId)
    .eq('collective_id', collectiveId)
    .eq('type', 'channel')
    .maybeSingle();

  if (channelErr) {
    return NextResponse.json(
      { error: channelErr.message },
      { status: HttpStatus.INTERNAL_SERVER_ERROR },
    );
  }

  if (!channel) {
    return NextResponse.json({ error: 'Channel not found in this collective' }, { status: HttpStatus.NOT_FOUND });
  }

  // Check if user is already a participant
  const { data: existingParticipant, error: participantErr } = await supabase
    .from('conversation_participants')
    .select('id')
    .eq('conversation_id', channelId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (participantErr) {
    return NextResponse.json(
      { error: participantErr.message },
      { status: HttpStatus.INTERNAL_SERVER_ERROR },
    );
  }

  if (existingParticipant) {
    return NextResponse.json({ error: 'Already a member of this channel' }, { status: HttpStatus.CONFLICT });
  }

  // Add user as a participant
  const participantRole = ['owner', 'admin'].includes(member.role) ? 'admin' : 'member';
  
  const { error: joinErr } = await supabase
    .from('conversation_participants')
    .insert({
      conversation_id: channelId,
      user_id: user.id,
      role: participantRole,
      joined_at: new Date().toISOString(),
    });

  if (joinErr) {
    return NextResponse.json(
      { error: joinErr.message },
      { status: HttpStatus.INTERNAL_SERVER_ERROR },
    );
  }

  return NextResponse.json({ success: true }, { status: HttpStatus.CREATED });
}

export async function DELETE(
  request: NextRequest, 
  context: { params: Promise<{ collectiveId: string; channelId: string }> }
) {
  const { collectiveId, channelId } = await context.params;

  const supabase = createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: HttpStatus.UNAUTHORIZED });
  }

  // Verify the channel exists and belongs to this collective
  const { data: channel, error: channelErr } = await supabase
    .from('conversations')
    .select('id, collective_id, type')
    .eq('id', channelId)
    .eq('collective_id', collectiveId)
    .eq('type', 'channel')
    .maybeSingle();

  if (channelErr) {
    return NextResponse.json(
      { error: channelErr.message },
      { status: HttpStatus.INTERNAL_SERVER_ERROR },
    );
  }

  if (!channel) {
    return NextResponse.json({ error: 'Channel not found in this collective' }, { status: HttpStatus.NOT_FOUND });
  }

  // Remove user from channel participants
  const { error: leaveErr } = await supabase
    .from('conversation_participants')
    .delete()
    .eq('conversation_id', channelId)
    .eq('user_id', user.id);

  if (leaveErr) {
    return NextResponse.json(
      { error: leaveErr.message },
      { status: HttpStatus.INTERNAL_SERVER_ERROR },
    );
  }

  return NextResponse.json({ success: true }, { status: HttpStatus.OK });
}

export const runtime = 'nodejs'; 