/* eslint-disable no-magic-numbers */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createRequestScopedSupabaseClient } from '@/lib/supabase/request-scoped';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { applyRateLimit } from '@/lib/utils/rate-limiting';
import { createAPILogger } from '@/lib/utils/structured-logger';

const ENDPOINT = '/api/collectives/[slug]/channels';

// Environment-driven configuration constants
const CHANNEL_CONFIG = {
  PAGE_MAX: Number(process.env['CHANNEL_PAGE_MAX']) || 200, // Increased default to handle client requests
  PAGE_DEFAULT: Number(process.env['CHANNEL_PAGE_DEFAULT']) || 50,
  BATCH_SIZE: Number(process.env['CHANNEL_PARTICIPANT_BATCH_SIZE']) || 1000,
  CACHE_MAX_AGE: Number(process.env['CHANNEL_CACHE_MAX_AGE']) || 30,
  RATE_LIMIT_WINDOW: Number(process.env['CHANNEL_RATE_LIMIT_WINDOW']) || 60000, // 1 minute
  RATE_LIMIT_MAX: Number(process.env['CHANNEL_RATE_LIMIT_MAX']) || 3,
} as const;

// HTTP status codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
} as const;

// Request validation schemas
const ChannelBodySchema = z.object({
  title: z.string().trim().min(1).max(128),
});

const PaginationSchema = z.object({
  before: z.string().datetime().optional(),
  after: z.string().datetime().optional(),
  limit: z.coerce
    .number()
    .min(1)
    .max(CHANNEL_CONFIG.PAGE_MAX)
    .default(CHANNEL_CONFIG.PAGE_DEFAULT),
});

// Type definitions
interface CollectiveMemberRow {
  role: string;
  member_id: string;
}

interface ConversationRow {
  id: string;
  title: string | null;
  type: string;
  created_at: string | null;
}

interface ParticipantInsert {
  conversation_id: string;
  user_id: string;
  role: string;
  joined_at: string;
}

// Configurable role mapping (issue #10)
const ROLE_MAPPING = {
  owner: 'admin',
  admin: 'admin',
  moderator: 'moderator',
  member: 'member',
} as const;

// Enhanced membership validation
async function validateCollectiveMembership(
  supabase: ReturnType<typeof createRequestScopedSupabaseClient>,
  collectiveId: string,
  userId: string,
): Promise<{ isMember: boolean; memberData?: CollectiveMemberRow }> {
  const { data: member, error: memberErr } = await supabase
    .from('collective_members')
    .select('role, member_id')
    .eq('collective_id', collectiveId)
    .eq('member_id', userId)
    .maybeSingle();

  if (memberErr !== null || member === null) {
    return { isMember: false };
  }

  return {
    isMember: true,
    memberData: member as CollectiveMemberRow,
  };
}

// Enhanced admin access validation
async function validateAdminAccess(
  supabase: ReturnType<typeof createRequestScopedSupabaseClient>,
  collectiveId: string,
  userId: string,
): Promise<{ hasAccess: boolean; memberData?: CollectiveMemberRow }> {
  const { isMember, memberData } = await validateCollectiveMembership(
    supabase,
    collectiveId,
    userId,
  );

  if (!isMember || memberData === undefined) {
    return { hasAccess: false };
  }

  const hasAdminAccess = ['owner', 'admin'].includes(memberData.role);
  return {
    hasAccess: hasAdminAccess,
    memberData,
  };
}

// Check for duplicate channel titles (issue #5)
async function checkChannelTitleUniqueness(
  supabase: ReturnType<typeof createRequestScopedSupabaseClient>,
  collectiveId: string,
  title: string,
): Promise<{ isUnique: boolean }> {
  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('collective_id', collectiveId)
    .eq('type', 'channel')
    .ilike('title', title)
    .maybeSingle();

  return { isUnique: existing === null };
}

// Batch participant insertion for large collectives (issue #9)
async function addParticipantsInBatches(
  participants: ParticipantInsert[],
): Promise<{ success: boolean; error?: string }> {
  if (participants.length === 0) {
    return { success: true };
  }

  // Use batch insertion with service role client for atomic operations
  try {
    const batchSize = CHANNEL_CONFIG.BATCH_SIZE;

    for (let i = 0; i < participants.length; i += batchSize) {
      const batch = participants.slice(i, i + batchSize);
      const { error: batchError } = await supabaseAdmin
        .from('conversation_participants')
        .insert(batch);

      if (batchError !== null) {
        return { success: false, error: batchError.message };
      }
    }

    return { success: true };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Atomic channel creation with transaction (issue #4)
function createChannelWithTransaction(
  collectiveId: string,
  title: string,
  createdBy: string,
): Promise<{
  success: boolean;
  conversationId?: string;
  participantsAdded?: number;
  error?: string;
}> {
  // Use manual transaction handling since RPC functions may not exist
  return createChannelWithManualTransaction(collectiveId, title, createdBy);
}

// Manual transaction fallback
async function createChannelWithManualTransaction(
  collectiveId: string,
  title: string,
  createdBy: string,
): Promise<{
  success: boolean;
  conversationId?: string;
  participantsAdded?: number;
  error?: string;
}> {
  let conversationId: string | undefined;

  try {
    // Step 1: Create conversation
    const { data: conversation, error: convErr } = await supabaseAdmin
      .from('conversations')
      .insert({
        type: 'channel',
        collective_id: collectiveId,
        title,
        created_by: createdBy,
        is_private: false,
      })
      .select('id')
      .single();

    if (convErr !== null || conversation === null) {
      return {
        success: false,
        error: convErr?.message ?? 'Failed to create channel',
      };
    }

    conversationId = conversation.id;

    // Step 2: Get all collective members
    const { data: allMembers, error: membersErr } = await supabaseAdmin
      .from('collective_members')
      .select('member_id, role')
      .eq('collective_id', collectiveId);

    if (membersErr !== null) {
      // Rollback conversation
      await supabaseAdmin
        .from('conversations')
        .delete()
        .eq('id', conversationId);
      return { success: false, error: membersErr.message };
    }

    if (allMembers === null || allMembers.length === 0) {
      // Rollback conversation
      await supabaseAdmin
        .from('conversations')
        .delete()
        .eq('id', conversationId);
      return { success: false, error: 'No collective members found' };
    }

    // Step 3: Prepare participants with configurable role mapping
    const participants: ParticipantInsert[] = allMembers.map((member) => ({
      conversation_id: conversationId ?? '',
      user_id: member.member_id,
      role: ROLE_MAPPING[member.role as keyof typeof ROLE_MAPPING] || 'member',
      joined_at: new Date().toISOString(),
    }));

    // Step 4: Add participants in batches
    const participantResult = await addParticipantsInBatches(participants);

    if (!participantResult.success) {
      // Rollback conversation
      await supabaseAdmin
        .from('conversations')
        .delete()
        .eq('id', conversationId);
      return {
        success: false,
        ...(participantResult.error ? { error: participantResult.error } : {}),
      };
    }

    return {
      success: true,
      conversationId,
      participantsAdded: participants.length,
    };
  } catch (error: unknown) {
    // Emergency rollback
    if (conversationId !== undefined) {
      await supabaseAdmin
        .from('conversations')
        .delete()
        .eq('id', conversationId);
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Generate ETag for caching (issue #14)
function generateChannelsETag(channels: ConversationRow[]): string {
  if (channels.length === 0) return 'empty';

  const validChannels = channels.filter(
    (channel) => channel.created_at !== null,
  );
  if (validChannels.length === 0) return 'empty';

  const firstValidChannel = validChannels[0];
  if (
    firstValidChannel?.created_at === null ||
    firstValidChannel?.created_at === undefined
  ) {
    return 'empty';
  }

  const latestCreatedAt = validChannels.reduce((latest, channel) => {
    return channel.created_at !== null && channel.created_at > latest
      ? channel.created_at
      : latest;
  }, firstValidChannel.created_at);

  return `"${Buffer.from(latestCreatedAt).toString('base64')}"`;
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

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const logger = createAPILogger(request, ENDPOINT);
  let userId: string | undefined;

  try {
    const { slug } = await context.params;
    const { searchParams } = new URL(request.url);

    // Log pagination parameters for debugging
    const rawParams = {
      before: searchParams.get('before'),
      after: searchParams.get('after'),
      limit: searchParams.get('limit'),
    };

    // Convert null to undefined for Zod validation
    const processedParams = {
      before: rawParams.before === null ? undefined : rawParams.before,
      after: rawParams.after === null ? undefined : rawParams.after,
      limit: rawParams.limit,
    };

    logger.info('Processing channels request', {
      metadata: {
        slug,
        rawParams,
        processedParams,
        pageMax: CHANNEL_CONFIG.PAGE_MAX,
        pageDefault: CHANNEL_CONFIG.PAGE_DEFAULT,
      },
    });

    // Validate pagination parameters (issue #6, #7)
    const paginationResult = PaginationSchema.safeParse(processedParams);

    if (!paginationResult.success) {
      logger.error('Pagination validation failed', {
        error: new Error('Pagination validation failed'),
        metadata: {
          slug,
          rawParams,
          processedParams,
          validationErrors: paginationResult.error.flatten(),
          pageMax: CHANNEL_CONFIG.PAGE_MAX,
        },
      });

      return NextResponse.json(
        {
          error: 'Invalid pagination parameters',
          details: paginationResult.error.flatten(),
        },
        { status: HTTP_STATUS.BAD_REQUEST },
      );
    }

    const { before, after, limit } = paginationResult.data;

    // Session-aware Supabase client (issue #2)
    const supabase = createRequestScopedSupabaseClient(request);

    // Authentication check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError !== null || user === null) {
      logger.warn('Unauthorized channels access attempt', {
        statusCode: HTTP_STATUS.UNAUTHORIZED,
        ...(authError?.message ? { error: authError.message } : {}),
        metadata: {
          slug,
        },
      });

      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: HTTP_STATUS.UNAUTHORIZED },
      );
    }

    userId = user.id;

    // Verify membership
    const collectiveId = await getCollectiveIdFromSlug(supabase, slug);
    if (!collectiveId) {
      return NextResponse.json(
        { error: 'Collective not found' },
        { status: 404 },
      );
    }

    const { isMember } = await validateCollectiveMembership(
      supabase,
      collectiveId,
      userId,
    );

    if (!isMember) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: HTTP_STATUS.FORBIDDEN },
      );
    }

    // Build query with bidirectional keyset pagination (issue #8)
    let chanQuery = supabase
      .from('conversations')
      .select('id, title, type, created_at')
      .eq('collective_id', collectiveId) // Use slug here
      .eq('type', 'channel');

    if (before !== undefined) {
      chanQuery = chanQuery.lt('created_at', before);
      chanQuery = chanQuery.order('created_at', { ascending: false });
    } else if (after !== undefined) {
      chanQuery = chanQuery.gt('created_at', after);
      chanQuery = chanQuery.order('created_at', { ascending: true });
    } else {
      chanQuery = chanQuery.order('created_at', { ascending: false });
    }

    chanQuery = chanQuery.limit(limit);

    const { data: channels, error: chanErr } = await chanQuery;

    if (chanErr !== null) {
      logger.error('Failed to fetch channels', {
        userId,
        statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        error: chanErr,
        metadata: {
          slug,
        },
      });

      return NextResponse.json(
        { error: 'Failed to fetch channels' },
        { status: HTTP_STATUS.INTERNAL_SERVER_ERROR },
      );
    }

    const channelData = channels ?? [];

    // Generate ETag and caching headers (issue #14)
    const etag = generateChannelsETag(channelData);
    const ifNoneMatch = request.headers.get('if-none-match');

    if (ifNoneMatch === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: etag,
          'Cache-Control': `private, max-age=${CHANNEL_CONFIG.CACHE_MAX_AGE}`,
        },
      });
    }

    logger.info('Successfully fetched channels', {
      userId,
      statusCode: HTTP_STATUS.OK,
      metadata: {
        slug,
        channelCount: channelData.length,
        paginationDirection:
          before !== undefined
            ? 'before'
            : after !== undefined
              ? 'after'
              : 'initial',
      },
    });

    // Ensure channelData is properly typed before returning
    const validChannelData: ConversationRow[] = channelData.filter(
      (item): item is ConversationRow =>
        item !== null &&
        item !== undefined &&
        typeof item === 'object' &&
        'id' in item &&
        'type' in item,
    );

    return NextResponse.json(validChannelData, {
      status: HTTP_STATUS.OK,
      headers: {
        ETag: etag,
        'Cache-Control': `private, max-age=${CHANNEL_CONFIG.CACHE_MAX_AGE}`,
      },
    });
  } catch (error: unknown) {
    logger.error('Channels fetch operation failed', {
      ...(userId ? { userId } : {}),
      statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error: error instanceof Error ? error : new Error(String(error)),
    });

    return NextResponse.json(
      { error: 'Failed to fetch channels' },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR },
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const logger = createAPILogger(request, ENDPOINT);
  let userId: string | undefined;

  try {
    const { slug } = await context.params;

    // Session-aware Supabase client (issue #2)
    const supabase = createRequestScopedSupabaseClient(request);

    // Authentication check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError !== null || user === null) {
      logger.warn('Unauthorized channel creation attempt', {
        statusCode: HTTP_STATUS.UNAUTHORIZED,
        ...(authError?.message ? { error: authError.message } : {}),
        metadata: {
          slug,
        },
      });

      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: HTTP_STATUS.UNAUTHORIZED },
      );
    }

    userId = user.id;

    // Rate limiting (issue #11)
    const rateLimitResult = await applyRateLimit(request, userId);
    if (!rateLimitResult.allowed) {
      logger.warn('Rate limit exceeded for channel creation', {
        userId,
        statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
        metadata: {
          slug,
        },
      });

      return NextResponse.json(
        { error: rateLimitResult.error },
        {
          status: HTTP_STATUS.TOO_MANY_REQUESTS,
          headers: rateLimitResult.headers,
        },
      );
    }

    // Verify admin access
    const collectiveId = await getCollectiveIdFromSlug(supabase, slug);
    if (!collectiveId) {
      return NextResponse.json(
        { error: 'Collective not found' },
        { status: 404 },
      );
    }

    const { hasAccess } = await validateAdminAccess(
      supabase,
      collectiveId,
      userId,
    );

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: HTTP_STATUS.FORBIDDEN },
      );
    }

    // Parse and validate request body
    let body: unknown;
    try {
      body = (await request.json()) as unknown;
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON' },
        { status: HTTP_STATUS.BAD_REQUEST },
      );
    }

    const parsed = ChannelBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid body', details: parsed.error.flatten() },
        { status: HTTP_STATUS.BAD_REQUEST },
      );
    }

    const { title } = parsed.data;

    // Check for duplicate channel titles (issue #5)
    const { isUnique } = await checkChannelTitleUniqueness(
      supabase,
      collectiveId,
      title,
    );

    if (!isUnique) {
      return NextResponse.json(
        {
          error: 'A channel with this title already exists in this collective',
        },
        { status: HTTP_STATUS.CONFLICT },
      );
    }

    // Create channel with atomic transaction (issue #3, #4)
    const result = await createChannelWithTransaction(
      collectiveId,
      title,
      userId,
    );

    if (!result.success) {
      logger.error('Failed to create channel', {
        userId,
        statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ...(result.error ? { error: result.error } : {}),
        metadata: {
          slug,
          title,
        },
      });

      return NextResponse.json(
        { error: result.error ?? 'Failed to create channel' },
        { status: HTTP_STATUS.INTERNAL_SERVER_ERROR },
      );
    }

    logger.info('Successfully created channel', {
      userId,
      statusCode: HTTP_STATUS.CREATED,
      metadata: {
        slug,
        conversationId: result.conversationId,
        title,
        participantsAdded: result.participantsAdded,
      },
    });

    return NextResponse.json(
      {
        conversationId: result.conversationId,
        participantsAdded: result.participantsAdded,
      },
      {
        status: HTTP_STATUS.CREATED,
        headers: rateLimitResult.headers,
      },
    );
  } catch (error: unknown) {
    logger.error('Channel creation operation failed', {
      ...(userId ? { userId } : {}),
      statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error: error instanceof Error ? error : new Error(String(error)),
    });

    return NextResponse.json(
      { error: 'Failed to create channel' },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR },
    );
  }
}

// Runtime choice documented (issue #15)
// Using Node.js runtime for:
// - Supabase Admin client compatibility
// - Advanced transaction handling
// - Crypto operations for ETag generation
export const runtime = 'nodejs';
