/* eslint-disable no-magic-numbers */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createRequestScopedSupabaseClient } from '@/lib/supabase/request-scoped';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createMetricsTimer, recordAPIMetrics } from '@/lib/utils/metrics';
import { applyRateLimit } from '@/lib/utils/rate-limiting';
import { createAPILogger } from '@/lib/utils/structured-logger';

// Environment-driven configuration constants
const JOIN_CONFIG = {
  RATE_LIMIT_WINDOW: Number(process.env['JOIN_RATE_LIMIT_WINDOW']) || 60000, // 1 minute
  RATE_LIMIT_MAX: Number(process.env['JOIN_RATE_LIMIT_MAX']) || 10,
  CACHE_MAX_AGE: Number(process.env['JOIN_CACHE_MAX_AGE']) || 30,
} as const;

// HTTP status codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
} as const;

// Request validation schemas
const JoinChannelBodySchema = z
  .object({
    role: z.enum(['member', 'moderator']).optional().default('member'),
  })
  .optional()
  .default({});

// Type definitions
interface CollectiveMemberRow {
  role: string;
  member_id: string;
}

interface ChannelRow {
  id: string;
  collective_id: string;
  type: string;
  title: string | null;
  updated_at: string | null;
}

interface ParticipantRow {
  id: string;
  user_id: string;
  role: string;
  joined_at: string | null;
}

// Shared result types
export type JoinChannelResult = {
  success: boolean;
  participantId?: string;
  error?: string;
};

export type LeaveChannelResult = {
  success: boolean;
  error?: string;
};

// Configurable role mapping
const PARTICIPANT_ROLE_MAPPING = {
  owner: 'admin',
  admin: 'admin',
  moderator: 'moderator',
  member: 'member',
} as const;

// Enhanced membership validation (shared utility)
async function validateCollectiveMembership(
  supabase: ReturnType<typeof createRequestScopedSupabaseClient>,
  collectiveId: string,
  userId: string,
): Promise<{
  isMember: boolean;
  isAdmin: boolean;
  memberData?: CollectiveMemberRow;
}> {
  const { data: member, error: memberErr } = await supabase
    .from('collective_members')
    .select('role, member_id')
    .eq('collective_id', collectiveId)
    .eq('member_id', userId)
    .maybeSingle();

  if (memberErr !== null || member === null) {
    return { isMember: false, isAdmin: false };
  }

  const isAdmin = ['owner', 'admin'].includes(member.role);

  return {
    isMember: true,
    isAdmin,
    memberData: member as CollectiveMemberRow,
  };
}

// Channel validation with caching support
async function validateChannelAccess(
  supabase: ReturnType<typeof createRequestScopedSupabaseClient>,
  collectiveId: string,
  channelId: string,
): Promise<{ isValid: boolean; channelData?: ChannelRow; etag?: string }> {
  const { data: channel, error: channelErr } = await supabase
    .from('conversations')
    .select('id, collective_id, type, title, updated_at')
    .eq('id', channelId)
    .eq('collective_id', collectiveId)
    .eq('type', 'channel')
    .maybeSingle();

  if (channelErr !== null || channel === null) {
    return { isValid: false };
  }

  // Generate ETag for caching
  const etag =
    channel.updated_at !== null
      ? `"${Buffer.from(channel.updated_at).toString('base64')}"`
      : `"${channelId}"`;

  return {
    isValid: true,
    channelData: channel as ChannelRow,
    etag,
  };
}

// Check existing participation with conflict detection
async function checkExistingParticipation(
  supabase: ReturnType<typeof createRequestScopedSupabaseClient>,
  channelId: string,
  userId: string,
): Promise<{ isParticipant: boolean; participantData?: ParticipantRow }> {
  const { data: participant, error: participantErr } = await supabase
    .from('conversation_participants')
    .select('id, user_id, role, joined_at')
    .eq('conversation_id', channelId)
    .eq('user_id', userId)
    .maybeSingle();

  if (participantErr !== null || participant === null) {
    return { isParticipant: false };
  }

  return {
    isParticipant: true,
    participantData: participant as ParticipantRow,
  };
}

// Atomic channel join with transaction (issue #7)
async function joinChannelWithTransaction(
  channelId: string,
  userId: string,
  participantRole: string,
): Promise<JoinChannelResult> {
  try {
    // Use upsert with conflict resolution (issue #6)
    const { data: participant, error: joinErr } = await supabaseAdmin
      .from('conversation_participants')
      .upsert(
        {
          conversation_id: channelId,
          user_id: userId,
          role: participantRole,
          joined_at: new Date().toISOString(),
        },
        {
          onConflict: 'conversation_id, user_id',
          ignoreDuplicates: false, // Update the role if it changed
        },
      )
      .select('id')
      .single();

    if (joinErr !== null) {
      return { success: false, error: joinErr.message };
    }

    return {
      success: true,
      participantId: participant?.id,
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Atomic channel leave with transaction
async function leaveChannelWithTransaction(
  channelId: string,
  userId: string,
): Promise<LeaveChannelResult> {
  try {
    const { error: leaveErr } = await supabaseAdmin
      .from('conversation_participants')
      .delete()
      .eq('conversation_id', channelId)
      .eq('user_id', userId);

    if (leaveErr !== null) {
      return { success: false, error: leaveErr.message };
    }

    return { success: true };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ collectiveId: string; channelId: string }> }, // Fixed: params IS a Promise in Next.js 15
): Promise<NextResponse> {
  const logger = createAPILogger(
    request,
    '/api/collectives/[collectiveId]/channels/[channelId]/join',
  );
  const timer = createMetricsTimer();
  let userId: string | undefined;

  try {
    const { collectiveId, channelId } = await context.params; // Await params in Next.js 15

    // Session-aware Supabase client (issue #2)
    const supabase = createRequestScopedSupabaseClient(request);

    // Authentication check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError !== null || user === null) {
      const duration = timer();
      recordAPIMetrics({
        endpoint: '/api/collectives/[collectiveId]/channels/[channelId]/join',
        method: 'POST',
        statusCode: HTTP_STATUS.UNAUTHORIZED,
        duration,
        error: 'Authentication failed',
      });

      logger.warn('Unauthorized channel join attempt', {
        statusCode: HTTP_STATUS.UNAUTHORIZED,
        ...(authError?.message ? { error: authError.message } : {}),
        metadata: { collectiveId, channelId },
      });

      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: HTTP_STATUS.UNAUTHORIZED },
      );
    }

    userId = user.id;

    // Rate limiting (issue #5)
    const rateLimitResult = await applyRateLimit(request, userId);
    if (!rateLimitResult.allowed) {
      const duration = timer();
      recordAPIMetrics({
        endpoint: '/api/collectives/[collectiveId]/channels/[channelId]/join',
        method: 'POST',
        statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
        duration,
        userId,
        error: 'Rate limit exceeded',
      });

      logger.warn('Rate limit exceeded for channel join', {
        userId,
        statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
        metadata: { collectiveId, channelId },
      });

      return NextResponse.json(
        { error: rateLimitResult.error },
        {
          status: HTTP_STATUS.TOO_MANY_REQUESTS,
          headers: rateLimitResult.headers,
        },
      );
    }

    // Parse and validate request body (issue #10)
    let body: unknown;
    try {
      body =
        request.headers.get('content-length') !== '0'
          ? ((await request.json()) as unknown)
          : {};
    } catch {
      const duration = timer();
      recordAPIMetrics({
        endpoint: '/api/collectives/[collectiveId]/channels/[channelId]/join',
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

    const parsed = JoinChannelBodySchema.safeParse(body);
    if (!parsed.success) {
      const duration = timer();
      recordAPIMetrics({
        endpoint: '/api/collectives/[collectiveId]/channels/[channelId]/join',
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

    // Verify collective membership (issue #4 - shared utility)
    const { isMember, memberData } = await validateCollectiveMembership(
      supabase,
      collectiveId,
      userId,
    );

    if (!isMember || memberData === undefined) {
      const duration = timer();
      recordAPIMetrics({
        endpoint: '/api/collectives/[collectiveId]/channels/[channelId]/join',
        method: 'POST',
        statusCode: HTTP_STATUS.FORBIDDEN,
        duration,
        userId,
        error: 'Not a collective member',
      });

      return NextResponse.json(
        { error: 'Must be a collective member to join channels' },
        { status: HTTP_STATUS.FORBIDDEN },
      );
    }

    // Verify channel exists and get ETag for caching (issue #8)
    const { isValid, channelData, etag } = await validateChannelAccess(
      supabase,
      collectiveId,
      channelId,
    );

    if (!isValid || channelData === undefined) {
      const duration = timer();
      recordAPIMetrics({
        endpoint: '/api/collectives/[collectiveId]/channels/[channelId]/join',
        method: 'POST',
        statusCode: HTTP_STATUS.NOT_FOUND,
        duration,
        userId,
        error: 'Channel not found',
      });

      return NextResponse.json(
        { error: 'Channel not found in this collective' },
        { status: HTTP_STATUS.NOT_FOUND },
      );
    }

    // Check for existing participation (issue #11 - proper conflict handling)
    const { isParticipant, participantData } = await checkExistingParticipation(
      supabase,
      channelId,
      userId,
    );

    if (isParticipant && participantData !== undefined) {
      const duration = timer();
      recordAPIMetrics({
        endpoint: '/api/collectives/[collectiveId]/channels/[channelId]/join',
        method: 'POST',
        statusCode: HTTP_STATUS.CONFLICT,
        duration,
        userId,
        error: 'Already a channel member',
      });

      logger.info('User already a channel member', {
        userId,
        statusCode: HTTP_STATUS.CONFLICT,
        metadata: {
          collectiveId,
          channelId,
          existingRole: participantData.role,
        },
      });

      return NextResponse.json(
        {
          error: 'Already a member of this channel',
          participantId: participantData.id,
          role: participantData.role,
        },
        {
          status: HTTP_STATUS.CONFLICT,
          headers: {
            ...(etag !== undefined && { ETag: etag }),
            'Cache-Control': `private, max-age=${JOIN_CONFIG.CACHE_MAX_AGE}`,
          },
        },
      );
    }

    // Determine participant role based on collective membership
    const participantRole =
      PARTICIPANT_ROLE_MAPPING[
        memberData.role as keyof typeof PARTICIPANT_ROLE_MAPPING
      ] || 'member';

    // Join channel with atomic transaction (issue #7)
    const result = await joinChannelWithTransaction(
      channelId,
      userId,
      participantRole,
    );

    if (!result.success) {
      const duration = timer();
      recordAPIMetrics({
        endpoint: '/api/collectives/[collectiveId]/channels/[channelId]/join',
        method: 'POST',
        statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        duration,
        userId,
        error: 'Channel join failed',
      });

      logger.error('Failed to join channel', {
        userId,
        statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ...(result.error ? { error: result.error } : {}),
        metadata: {
          collectiveId,
          channelId,
          participantRole,
        },
      });

      return NextResponse.json(
        { error: result.error ?? 'Failed to join channel' },
        { status: HTTP_STATUS.INTERNAL_SERVER_ERROR },
      );
    }

    const duration = timer();
    recordAPIMetrics({
      endpoint: '/api/collectives/[collectiveId]/channels/[channelId]/join',
      method: 'POST',
      statusCode: HTTP_STATUS.CREATED,
      duration,
      userId,
    });

    logger.info('Successfully joined channel', {
      userId,
      statusCode: HTTP_STATUS.CREATED,
      duration,
      metadata: {
        collectiveId,
        channelId,
        participantId: result.participantId,
        participantRole,
      },
    });

    return NextResponse.json(
      {
        success: true,
        participantId: result.participantId,
        role: participantRole,
      },
      {
        status: HTTP_STATUS.CREATED,
        headers: {
          ...rateLimitResult.headers,
          ...(etag !== undefined && { ETag: etag }),
          'Cache-Control': `private, max-age=${JOIN_CONFIG.CACHE_MAX_AGE}`,
        },
      },
    );
  } catch (error: unknown) {
    const duration = timer();
    recordAPIMetrics({
      endpoint: '/api/collectives/[collectiveId]/channels/[channelId]/join',
      method: 'POST',
      statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      duration,
      ...(userId ? { userId } : {}),
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    logger.error('Channel join operation failed', {
      ...(userId ? { userId } : {}),
      statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      duration,
      error: error instanceof Error ? error : new Error(String(error)),
    });

    return NextResponse.json(
      { error: 'Failed to join channel' },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ collectiveId: string; channelId: string }> }, // Fixed: params IS a Promise in Next.js 15
): Promise<NextResponse> {
  const logger = createAPILogger(
    request,
    '/api/collectives/[collectiveId]/channels/[channelId]/join',
  );
  const timer = createMetricsTimer();
  let userId: string | undefined;

  try {
    const { collectiveId, channelId } = await context.params; // Await params in Next.js 15

    // Session-aware Supabase client
    const supabase = createRequestScopedSupabaseClient(request);

    // Authentication check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError !== null || user === null) {
      const duration = timer();
      recordAPIMetrics({
        endpoint: '/api/collectives/[collectiveId]/channels/[channelId]/join',
        method: 'DELETE',
        statusCode: HTTP_STATUS.UNAUTHORIZED,
        duration,
        error: 'Authentication failed',
      });

      logger.warn('Unauthorized channel leave attempt', {
        statusCode: HTTP_STATUS.UNAUTHORIZED,
        ...(authError?.message ? { error: authError.message } : {}),
        metadata: { collectiveId, channelId },
      });

      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: HTTP_STATUS.UNAUTHORIZED },
      );
    }

    userId = user.id;

    // Rate limiting for leave operations
    const rateLimitResult = await applyRateLimit(request, userId);
    if (!rateLimitResult.allowed) {
      const duration = timer();
      recordAPIMetrics({
        endpoint: '/api/collectives/[collectiveId]/channels/[channelId]/join',
        method: 'DELETE',
        statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
        duration,
        userId,
        error: 'Rate limit exceeded',
      });

      return NextResponse.json(
        { error: rateLimitResult.error },
        {
          status: HTTP_STATUS.TOO_MANY_REQUESTS,
          headers: rateLimitResult.headers,
        },
      );
    }

    // Verify channel exists
    const { isValid, etag } = await validateChannelAccess(
      supabase,
      collectiveId,
      channelId,
    );

    if (!isValid) {
      const duration = timer();
      recordAPIMetrics({
        endpoint: '/api/collectives/[collectiveId]/channels/[channelId]/join',
        method: 'DELETE',
        statusCode: HTTP_STATUS.NOT_FOUND,
        duration,
        userId,
        error: 'Channel not found',
      });

      return NextResponse.json(
        { error: 'Channel not found in this collective' },
        { status: HTTP_STATUS.NOT_FOUND },
      );
    }

    // Check if user is already a participant
    const { data: existingParticipant, error: participantError } =
      await supabase
        .from('conversation_participants')
        .select('id')
        .eq('conversation_id', channelId)
        .eq('user_id', user.id)
        .maybeSingle();

    if (participantError !== null) {
      console.error('Error checking existing participant:', participantError);
      return NextResponse.json(
        { error: 'Failed to check participant status' },
        { status: 500 },
      );
    }

    if (existingParticipant !== null) {
      return NextResponse.json(
        { message: 'User is already a participant in this channel' },
        { status: 200 },
      );
    }

    // Add user as participant
    const { error: joinError } = await supabase
      .from('conversation_participants')
      .insert({
        conversation_id: channelId,
        user_id: user.id,
        role: 'member',
        joined_at: new Date().toISOString(),
      });

    if (joinError !== null) {
      console.error('Error joining channel:', joinError);
      return NextResponse.json(
        { error: 'Failed to join channel' },
        { status: 500 },
      );
    }

    // Log the action using the user ID safely
    console.log(
      `User ${user.id} joined channel ${channelId} in collective ${collectiveId}`,
    );

    return NextResponse.json(
      { message: 'Successfully joined channel' },
      { status: 200 },
    );
  } catch (error: unknown) {
    const duration = timer();
    recordAPIMetrics({
      endpoint: '/api/collectives/[collectiveId]/channels/[channelId]/join',
      method: 'DELETE',
      statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      duration,
      ...(userId ? { userId } : {}),
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    logger.error('Channel leave operation failed', {
      ...(userId ? { userId } : {}),
      statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      duration,
      error: error instanceof Error ? error : new Error(String(error)),
    });

    return NextResponse.json(
      { error: 'Failed to leave channel' },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR },
    );
  }
}

// Runtime choice documented
// Using Node.js runtime for:
// - Supabase Admin client compatibility
// - Advanced transaction handling
// - Crypto operations for ETag generation
export const runtime = 'nodejs';
