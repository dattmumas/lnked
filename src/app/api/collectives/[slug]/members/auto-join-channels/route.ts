import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createRequestScopedSupabaseClient } from '@/lib/supabase/request-scoped';
import { createMetricsTimer, recordAPIMetrics } from '@/lib/utils/metrics';
import { createAPILogger } from '@/lib/utils/structured-logger';

// HTTP status codes
const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const;

// Request validation schema
const BodySchema = z.object({
  userId: z.string().uuid(),
});

// Type definitions
interface CollectiveMemberRow {
  role: string;
  member_id: string;
}

interface ChannelRow {
  id: string;
}

interface ParticipantInsert {
  conversation_id: string;
  user_id: string;
  role: string;
  joined_at: string;
}

// Enhanced authorization check supporting admin roles
async function validateCollectiveAdminAccess(
  supabase: ReturnType<typeof createRequestScopedSupabaseClient>,
  collectiveId: string,
  userId: string,
): Promise<{ hasAccess: boolean; userRole?: string }> {
  const { data: requesterMember, error: requesterErr } = await supabase
    .from('collective_members')
    .select('role')
    .eq('collective_id', collectiveId)
    .eq('member_id', userId)
    .maybeSingle();

  if (requesterErr !== null || requesterMember === null) {
    return { hasAccess: false };
  }

  const userRole = requesterMember.role;
  if (userRole === null || userRole === undefined) {
    return { hasAccess: false };
  }

  const hasAdminAccess = ['owner', 'admin'].includes(userRole);
  return {
    hasAccess: hasAdminAccess,
    userRole,
  };
}

// Validate target user membership
async function validateTargetMembership(
  supabase: ReturnType<typeof createRequestScopedSupabaseClient>,
  collectiveId: string,
  targetUserId: string,
): Promise<{ isMember: boolean; memberData?: CollectiveMemberRow }> {
  const { data: targetMember, error: targetErr } = await supabase
    .from('collective_members')
    .select('role, member_id')
    .eq('collective_id', collectiveId)
    .eq('member_id', targetUserId)
    .maybeSingle();

  if (targetErr !== null || targetMember === null) {
    return { isMember: false };
  }

  return {
    isMember: true,
    memberData: targetMember as CollectiveMemberRow,
  };
}

// Get public channels for collective
async function getPublicChannels(
  supabase: ReturnType<typeof createRequestScopedSupabaseClient>,
  collectiveId: string,
): Promise<{ channels: ChannelRow[]; error?: string }> {
  const { data: channels, error: channelsErr } = await supabase
    .from('conversations')
    .select('id')
    .eq('collective_id', collectiveId)
    .eq('type', 'channel')
    .eq('is_private', false);

  if (channelsErr !== null) {
    return { channels: [], error: channelsErr.message };
  }

  return { channels: channels ?? [] };
}

// Get existing user participations
async function getExistingParticipations(
  supabase: ReturnType<typeof createRequestScopedSupabaseClient>,
  userId: string,
  channelIds: string[],
): Promise<{ participations: string[]; error?: string }> {
  if (channelIds.length === 0) {
    return { participations: [] };
  }

  const { data: existingParticipations, error: participationErr } =
    await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userId)
      .in('conversation_id', channelIds);

  if (participationErr !== null) {
    return { participations: [], error: participationErr.message };
  }

  return {
    participations:
      existingParticipations
        ?.map((p) => p.conversation_id)
        .filter((id): id is string => id !== null) ?? [],
  };
}

// Helper to get collective ID from slug
async function getCollectiveIdFromSlug(
  supabase: ReturnType<typeof createRequestScopedSupabaseClient>,
  slug: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('collectives')
    .select('id')
    .eq('slug', slug)
    .single();

  if (error) return null;
  return data.id;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const logger = createAPILogger(
    request,
    '/api/collectives/[slug]/members/auto-join-channels',
  );
  const timer = createMetricsTimer();
  let userId: string | undefined;

  try {
    const { slug } = await context.params;
    const supabase = createRequestScopedSupabaseClient(request);

    const collectiveId = await getCollectiveIdFromSlug(supabase, slug);
    if (!collectiveId) {
      return NextResponse.json(
        { error: 'Collective not found' },
        { status: 404 },
      );
    }

    if (
      collectiveId === null ||
      collectiveId === undefined ||
      collectiveId === ''
    ) {
      const duration = timer();
      recordAPIMetrics({
        endpoint: '/api/collectives/[collectiveId]/members/auto-join-channels',
        method: 'POST',
        statusCode: HTTP_STATUS.BAD_REQUEST,
        duration,
        error: 'Missing collectiveId',
      });

      return NextResponse.json(
        { error: 'Missing collectiveId' },
        { status: HTTP_STATUS.BAD_REQUEST },
      );
    }

    // Session-aware Supabase client with proper context
    // const supabase = createRequestScopedSupabaseClient(request); // This line is now redundant

    // Authentication check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError !== null || user === null) {
      const duration = timer();
      recordAPIMetrics({
        endpoint: '/api/collectives/[collectiveId]/members/auto-join-channels',
        method: 'POST',
        statusCode: HTTP_STATUS.UNAUTHORIZED,
        duration,
        error: 'Authentication failed',
      });

      logger.warn('Unauthorized auto-join channels attempt', {
        statusCode: HTTP_STATUS.UNAUTHORIZED,
        ...(authError?.message ? { error: authError.message } : {}),
        metadata: {
          collectiveId,
        },
      });

      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: HTTP_STATUS.UNAUTHORIZED },
      );
    }

    userId = user.id;

    // Parse and validate request body
    let body: unknown;
    try {
      body = (await request.json()) as unknown;
    } catch {
      const duration = timer();
      recordAPIMetrics({
        endpoint: '/api/collectives/[collectiveId]/members/auto-join-channels',
        method: 'POST',
        statusCode: HTTP_STATUS.BAD_REQUEST,
        duration,
        userId,
        error: 'Invalid JSON',
      });

      return NextResponse.json(
        { error: 'Invalid JSON' },
        { status: HTTP_STATUS.BAD_REQUEST },
      );
    }

    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      const duration = timer();
      recordAPIMetrics({
        endpoint: '/api/collectives/[collectiveId]/members/auto-join-channels',
        method: 'POST',
        statusCode: HTTP_STATUS.BAD_REQUEST,
        duration,
        userId,
        error: 'Invalid request body',
      });

      return NextResponse.json(
        { error: 'Invalid body', details: parsed.error.flatten() },
        { status: HTTP_STATUS.BAD_REQUEST },
      );
    }

    const { userId: targetUserId } = parsed.data;

    // Verify the requester is an admin/owner of the collective
    const { hasAccess, userRole } = await validateCollectiveAdminAccess(
      supabase,
      collectiveId,
      userId,
    );

    if (!hasAccess) {
      const duration = timer();
      recordAPIMetrics({
        endpoint: '/api/collectives/[collectiveId]/members/auto-join-channels',
        method: 'POST',
        statusCode: HTTP_STATUS.FORBIDDEN,
        duration,
        userId,
        error: 'Insufficient permissions',
      });

      logger.warn(
        'Unauthorized auto-join channels attempt - insufficient permissions',
        {
          userId,
          statusCode: HTTP_STATUS.FORBIDDEN,
          metadata: {
            collectiveId,
            userRole,
          },
        },
      );

      return NextResponse.json(
        { error: 'Forbidden' },
        { status: HTTP_STATUS.FORBIDDEN },
      );
    }

    // Verify the target user is a member of the collective
    const { isMember, memberData } = await validateTargetMembership(
      supabase,
      collectiveId,
      targetUserId,
    );

    if (!isMember || memberData === undefined) {
      const duration = timer();
      recordAPIMetrics({
        endpoint: '/api/collectives/[collectiveId]/members/auto-join-channels',
        method: 'POST',
        statusCode: HTTP_STATUS.NOT_FOUND,
        duration,
        userId,
        error: 'Target user not a member',
      });

      return NextResponse.json(
        { error: 'User is not a member of this collective' },
        { status: HTTP_STATUS.NOT_FOUND },
      );
    }

    // Get all public channels in this collective
    const { channels, error: channelsError } = await getPublicChannels(
      supabase,
      collectiveId,
    );

    if (channelsError !== undefined) {
      const duration = timer();
      recordAPIMetrics({
        endpoint: '/api/collectives/[collectiveId]/members/auto-join-channels',
        method: 'POST',
        statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        duration,
        userId,
        error: 'Failed to fetch channels',
      });

      logger.error('Failed to fetch public channels', {
        userId,
        statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        error: channelsError,
        metadata: {
          collectiveId,
          targetUserId,
        },
      });

      return NextResponse.json(
        { error: channelsError },
        { status: HTTP_STATUS.INTERNAL_SERVER_ERROR },
      );
    }

    if (channels.length === 0) {
      const duration = timer();
      recordAPIMetrics({
        endpoint: '/api/collectives/[collectiveId]/members/auto-join-channels',
        method: 'POST',
        statusCode: HTTP_STATUS.OK,
        duration,
        userId,
      });

      return NextResponse.json(
        { message: 'No public channels to join', channelsJoined: 0 },
        { status: HTTP_STATUS.OK },
      );
    }

    // Get channels the user is already a participant of
    const channelIds = channels.map((c) => c.id);
    const { participations: existingChannelIds, error: participationError } =
      await getExistingParticipations(supabase, targetUserId, channelIds);

    if (participationError !== undefined) {
      const duration = timer();
      recordAPIMetrics({
        endpoint: '/api/collectives/[collectiveId]/members/auto-join-channels',
        method: 'POST',
        statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        duration,
        userId,
        error: 'Failed to fetch existing participations',
      });

      logger.error('Failed to fetch existing participations', {
        userId,
        statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        error: participationError,
        metadata: {
          collectiveId,
          targetUserId,
        },
      });

      return NextResponse.json(
        { error: participationError },
        { status: HTTP_STATUS.INTERNAL_SERVER_ERROR },
      );
    }

    // Filter out channels the user is already in
    const channelsToJoin = channels.filter(
      (c) => !existingChannelIds.includes(c.id),
    );

    if (channelsToJoin.length === 0) {
      const duration = timer();
      recordAPIMetrics({
        endpoint: '/api/collectives/[collectiveId]/members/auto-join-channels',
        method: 'POST',
        statusCode: HTTP_STATUS.OK,
        duration,
        userId,
      });

      return NextResponse.json(
        {
          message: 'User is already in all public channels',
          channelsJoined: 0,
        },
        { status: HTTP_STATUS.OK },
      );
    }

    // Add user to all public channels they're not already in
    const participantRole = ['owner', 'admin'].includes(memberData.role)
      ? 'admin'
      : 'member';

    const participants: ParticipantInsert[] = channelsToJoin.map((channel) => ({
      conversation_id: channel.id,
      user_id: targetUserId,
      role: participantRole,
      joined_at: new Date().toISOString(),
    }));

    const { error: joinErr } = await supabase
      .from('conversation_participants')
      .insert(participants);

    if (joinErr !== null) {
      const duration = timer();
      recordAPIMetrics({
        endpoint: '/api/collectives/[collectiveId]/members/auto-join-channels',
        method: 'POST',
        statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        duration,
        userId,
        error: 'Failed to join channels',
      });

      logger.error('Failed to add user to channels', {
        userId,
        statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        error: joinErr,
        metadata: {
          collectiveId,
          targetUserId,
          channelsToJoin: channelsToJoin.length,
        },
      });

      return NextResponse.json(
        { error: joinErr.message },
        { status: HTTP_STATUS.INTERNAL_SERVER_ERROR },
      );
    }

    const duration = timer();
    recordAPIMetrics({
      endpoint: '/api/collectives/[collectiveId]/members/auto-join-channels',
      method: 'POST',
      statusCode: HTTP_STATUS.OK,
      duration,
      userId,
    });

    logger.info('Successfully auto-joined user to channels', {
      userId,
      statusCode: HTTP_STATUS.OK,
      duration,
      metadata: {
        collectiveId,
        targetUserId,
        channelsJoined: participants.length,
        participantRole,
      },
    });

    return NextResponse.json(
      {
        success: true,
        channelsJoined: participants.length,
        message: `User added to ${participants.length} public channels`,
      },
      { status: HTTP_STATUS.OK },
    );
  } catch (error: unknown) {
    const duration = timer();
    recordAPIMetrics({
      endpoint: '/api/collectives/[collectiveId]/members/auto-join-channels',
      method: 'POST',
      statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      duration,
      ...(userId ? { userId } : {}),
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    logger.error('Auto-join channels operation failed', {
      ...(userId ? { userId } : {}),
      statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      duration,
      error: error instanceof Error ? error : new Error(String(error)),
    });

    return NextResponse.json(
      { error: 'Failed to auto-join channels' },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR },
    );
  }
}

export const runtime = 'nodejs';
