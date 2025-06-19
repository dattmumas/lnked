/* eslint-disable no-magic-numbers */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createServerSupabaseClient } from '@/lib/supabase/server';

const enum HttpStatus {
  OK = 200,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  INTERNAL_SERVER_ERROR = 500,
}

const BodySchema = z.object({
  userId: z.string().uuid(),
});

type CollectiveMemberRow = {
  role: string;
  member_id: string;
};

export async function POST(
  request: NextRequest, 
  context: { params: Promise<{ collectiveId: string }> }
) {
  const { collectiveId } = await context.params;

  const supabase = createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: HttpStatus.UNAUTHORIZED });
  }

  // Parse request body
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

  const { userId } = parsed.data;

  // Verify the requester is an admin/owner of the collective
  const { data: requesterMember, error: requesterErr } = await supabase
    .from('collective_members')
    .select('role')
    .eq('collective_id', collectiveId)
    .eq('member_id', user.id)
    .maybeSingle<CollectiveMemberRow>();

  if (requesterErr) {
    return NextResponse.json(
      { error: requesterErr.message },
      { status: HttpStatus.INTERNAL_SERVER_ERROR },
    );
  }

  if (!requesterMember || !['owner', 'admin'].includes(requesterMember.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: HttpStatus.FORBIDDEN });
  }

  // Verify the target user is a member of the collective
  const { data: targetMember, error: targetErr } = await supabase
    .from('collective_members')
    .select('role, member_id')
    .eq('collective_id', collectiveId)
    .eq('member_id', userId)
    .maybeSingle<CollectiveMemberRow>();

  if (targetErr) {
    return NextResponse.json(
      { error: targetErr.message },
      { status: HttpStatus.INTERNAL_SERVER_ERROR },
    );
  }

  if (!targetMember) {
    return NextResponse.json({ error: 'User is not a member of this collective' }, { status: HttpStatus.NOT_FOUND });
  }

  // Get all public channels in this collective
  const { data: channels, error: channelsErr } = await supabase
    .from('conversations')
    .select('id')
    .eq('collective_id', collectiveId)
    .eq('type', 'channel')
    .eq('is_private', false);

  if (channelsErr) {
    return NextResponse.json(
      { error: channelsErr.message },
      { status: HttpStatus.INTERNAL_SERVER_ERROR },
    );
  }

  if (!channels || channels.length === 0) {
    return NextResponse.json({ message: 'No public channels to join', channelsJoined: 0 }, { status: HttpStatus.OK });
  }

  // Get channels the user is already a participant of
  const channelIds = channels.map(c => c.id);
  const { data: existingParticipations, error: participationErr } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', userId)
    .in('conversation_id', channelIds);

  if (participationErr) {
    return NextResponse.json(
      { error: participationErr.message },
      { status: HttpStatus.INTERNAL_SERVER_ERROR },
    );
  }

  // Filter out channels the user is already in
  const existingChannelIds = existingParticipations?.map(p => p.conversation_id) || [];
  const channelsToJoin = channels.filter(c => !existingChannelIds.includes(c.id));

  if (channelsToJoin.length === 0) {
    return NextResponse.json({ message: 'User is already in all public channels', channelsJoined: 0 }, { status: HttpStatus.OK });
  }

  // Add user to all public channels they're not already in
  const participantRole = ['owner', 'admin'].includes(targetMember.role) ? 'admin' : 'member';
  
  const participants = channelsToJoin.map(channel => ({
    conversation_id: channel.id,
    user_id: userId,
    role: participantRole,
    joined_at: new Date().toISOString(),
  }));

  const { error: joinErr } = await supabase
    .from('conversation_participants')
    .insert(participants);

  if (joinErr) {
    return NextResponse.json(
      { error: joinErr.message },
      { status: HttpStatus.INTERNAL_SERVER_ERROR },
    );
  }

  return NextResponse.json({ 
    success: true, 
    channelsJoined: participants.length,
    message: `User added to ${participants.length} public channels`
  }, { status: HttpStatus.OK });
}

export const runtime = 'nodejs'; 