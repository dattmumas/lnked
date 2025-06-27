/* eslint-disable no-magic-numbers */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createRequestScopedSupabaseClient } from '@/lib/supabase/request-scoped';
import { applyEnhancedRateLimit } from '@/lib/utils/enhanced-rate-limiting';
import { getValidatedEnvironmentConfig } from '@/lib/utils/environment-validation';
import { createMetricsTimer, recordAPIMetrics } from '@/lib/utils/metrics';
import { createAPILogger } from '@/lib/utils/structured-logger';

// API endpoint constant to prevent drift between logs/metrics
const ENDPOINT = '/api/chat/group' as const;

// Load validated environment configuration
const ENV_CONFIG = getValidatedEnvironmentConfig();

// HTTP status codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
} as const;

// Request validation schema with environment-driven limits
const GroupCreationSchema = z.object({
  participantIds: z.array(z.string().uuid())
    .min(ENV_CONFIG.GROUP_MIN_PARTICIPANTS, `At least ${ENV_CONFIG.GROUP_MIN_PARTICIPANTS} participant is required`)
    .max(ENV_CONFIG.GROUP_MAX_PARTICIPANTS, `Cannot exceed ${ENV_CONFIG.GROUP_MAX_PARTICIPANTS} participants`),
  title: z.string()
    .trim()
    .max(ENV_CONFIG.GROUP_MAX_TITLE_LENGTH, `Title must be at most ${ENV_CONFIG.GROUP_MAX_TITLE_LENGTH} characters`)
    .optional(),
  // Allow empty groups for "create then invite" UX (Issue 6)
  allowEmptyGroup: z.boolean().default(false),
});

// RPC response types
interface AtomicGroupCreationResult {
  success: boolean;
  conversation_id?: string;
  participant_count?: number;
  title?: string | null;
  is_duplicate?: boolean;
  group_hash?: string;
  error?: string;
  error_code?: string;
  sqlstate?: string;
}

interface GroupCreationResponse {
  conversationId: string;
  participantCount: number;
  title?: string;
  isDuplicate?: boolean;
  groupHash?: string;
}

// RPC function interface for type safety
interface SupabaseRpcClient {
  rpc: (functionName: string, params: Record<string, unknown>) => Promise<{
    data: unknown;
    error: { message: string } | null;
  }>;
}

// Enhanced metrics tracking with rollback monitoring (Issue 8)
function recordGroupMetrics(
  timer: () => number,
  method: string,
  statusCode: number,
  result: 'success' | 'error',
  userId?: string,
  error?: string,
  participantCount?: number,
  isDuplicate?: boolean,
  rollbackFailed?: boolean,
): void {
  const duration = timer();
  
  recordAPIMetrics({
    endpoint: ENDPOINT,
    method,
    statusCode,
    duration,
    ...(userId ? { userId } : {}),
    ...(error ? { error } : {}),
  });
  
  // Track specific group creation metrics
  if (participantCount !== undefined) {
    recordAPIMetrics({
      endpoint: `${ENDPOINT}/participants`,
      method,
      statusCode,
      duration,
      ...(userId ? { userId } : {}),
    });
  }
  
  // Alert on rollback failures (Issue 8)
  if (rollbackFailed === true) {
    console.error(`[CRITICAL] Group creation rollback failed for user ${userId ?? 'unknown'}`, {
      endpoint: ENDPOINT,
      userId,
      error: 'Rollback operation failed',
      timestamp: new Date().toISOString(),
    });
  }
}

// Validate participant existence in batches (Issue 7)
async function validateParticipantsBatch(
  supabase: ReturnType<typeof createRequestScopedSupabaseClient>,
  participantIds: string[],
): Promise<{ isValid: boolean; error?: string; validIds?: string[] }> {
  if (participantIds.length === 0) {
    return { isValid: true, validIds: [] };
  }

  try {
    // Process in batches to handle large participant lists (Issue 4)
    const batchSize = ENV_CONFIG.PARTICIPANT_BATCH_SIZE;
    const allValidIds: string[] = [];
    
    for (let i = 0; i < participantIds.length; i += batchSize) {
      const batch = participantIds.slice(i, i + batchSize);
      
      const { data: existingUsers, error: userCheckError } = await supabase
        .from('users')
        .select('id')
        .in('id', batch);

      if (userCheckError) {
        throw userCheckError;
      }

      if (existingUsers.length !== batch.length) {
        const foundIds = new Set(existingUsers.map(u => u.id));
        const missingIds = batch.filter(id => !foundIds.has(id));
        
        return {
          isValid: false,
          error: `Participants not found: ${missingIds.slice(0, 5).join(', ')}${missingIds.length > 5 ? '...' : ''}`,
        };
      }
      
      allValidIds.push(...existingUsers.map(u => u.id));
    }

    return { isValid: true, validIds: allValidIds };

  } catch (error: unknown) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Failed to validate participants',
    };
  }
}

// Call atomic RPC function (Issues 1, 2, 3)
async function createGroupAtomic(
  supabase: ReturnType<typeof createRequestScopedSupabaseClient>,
  creatorId: string,
  participantIds: string[],
  title?: string,
): Promise<AtomicGroupCreationResult> {
  try {
    // Type-safe RPC call workaround for newly created function
    const rpcClient = supabase as unknown as SupabaseRpcClient;
    const { data, error } = await rpcClient.rpc(
      'create_group_conversation_atomic',
      {
        creator_id: creatorId,
        participant_ids: participantIds,
        group_title: title ?? null,
        check_participants: true, // RPC will validate participants
      }
    );

    if (error !== null) {
      return {
        success: false,
        error: error.message,
        error_code: 'RPC_ERROR',
      };
    }

    return (data as AtomicGroupCreationResult) ?? {
      success: false,
      error: 'No response from RPC function',
      error_code: 'NO_RESPONSE',
    };

  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'RPC function failed',
      error_code: 'RPC_EXCEPTION',
    };
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const logger = createAPILogger(request, ENDPOINT); // Issue 9: structured logging
  const timer = createMetricsTimer();
  let userId: string | undefined;
  const rollbackFailed = false; // Track rollback status

  try {
    // Session-aware Supabase client
    const supabase = createRequestScopedSupabaseClient(request);
    
    // Authentication check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError !== null || user === null) {
      recordGroupMetrics(
        timer,
        'POST',
        HTTP_STATUS.UNAUTHORIZED,
        'error',
        undefined,
        'Authentication failed',
      );

      logger.warn('Unauthorized group creation attempt', {
        statusCode: HTTP_STATUS.UNAUTHORIZED,
        ...(authError?.message ? { error: authError.message } : {}),
      });

      return NextResponse.json({ error: 'Unauthorized' }, { status: HTTP_STATUS.UNAUTHORIZED });
    }

    userId = user.id;

    // Enhanced rate limiting with IP protection (Issue 5)
    const rateLimitResult = await applyEnhancedRateLimit(request, userId);
    if (!rateLimitResult.allowed) {
      recordGroupMetrics(
        timer,
        'POST',
        HTTP_STATUS.TOO_MANY_REQUESTS,
        'error',
        userId,
        `Rate limit exceeded (${rateLimitResult.limitType ?? 'unknown'})`,
      );

      logger.warn('Rate limit exceeded for group creation', {
        userId,
        statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
      });

      return NextResponse.json(
        { error: rateLimitResult.error ?? 'Rate limit exceeded' },
        { 
          status: HTTP_STATUS.TOO_MANY_REQUESTS,
          headers: rateLimitResult.headers,
        }
      );
    }

    // Parse and validate request body
    let body: unknown;
    try {
      body = await request.json() as unknown;
    } catch {
      recordGroupMetrics(
        timer,
        'POST',
        HTTP_STATUS.BAD_REQUEST,
        'error',
        userId,
        'Invalid JSON',
      );

      return NextResponse.json({ error: 'Invalid JSON' }, { status: HTTP_STATUS.BAD_REQUEST });
    }

    const parsed = GroupCreationSchema.safeParse(body);
    if (!parsed.success) {
      recordGroupMetrics(
        timer,
        'POST',
        HTTP_STATUS.BAD_REQUEST,
        'error',
        userId,
        'Invalid request body',
      );

      return NextResponse.json(
        { error: 'Invalid body', details: parsed.error.flatten() },
        { status: HTTP_STATUS.BAD_REQUEST },
      );
    }

    const { participantIds, title, allowEmptyGroup } = parsed.data;

    // Remove creator from participant list and handle empty group case (Issue 6)
    const uniqueIds = Array.from(new Set(participantIds.filter((id) => id !== userId)));

    // Allow empty groups only if explicitly requested and title is provided
    if (uniqueIds.length === 0 && !allowEmptyGroup) {
      recordGroupMetrics(
        timer,
        'POST',
        HTTP_STATUS.BAD_REQUEST,
        'error',
        userId,
        'Empty group not allowed',
        1,
      );

      return NextResponse.json(
        { 
          error: 'Cannot create a group without other participants. Set allowEmptyGroup=true to create an empty group with a title.' 
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    if (uniqueIds.length === 0 && allowEmptyGroup && (title === undefined || title.length === 0)) {
      recordGroupMetrics(
        timer,
        'POST',
        HTTP_STATUS.BAD_REQUEST,
        'error',
        userId,
        'Empty group requires title',
        1,
      );

      return NextResponse.json(
        { error: 'Empty groups must have a title' },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // Validate participants exist (Issue 7) - only if we have participants
    if (uniqueIds.length > 0) {
      const validationResult = await validateParticipantsBatch(supabase, uniqueIds);
      if (!validationResult.isValid) {
        recordGroupMetrics(
          timer,
          'POST',
          HTTP_STATUS.BAD_REQUEST,
          'error',
          userId,
          'Invalid participants',
          uniqueIds.length + 1,
        );

        return NextResponse.json(
          { error: validationResult.error ?? 'Invalid participant list' },
          { status: HTTP_STATUS.BAD_REQUEST }
        );
      }
    }

    // Create group using atomic RPC (Issues 1, 2, 3)
    const creationResult = await createGroupAtomic(supabase, userId, uniqueIds, title);
    
    if (!creationResult.success) {
      const isConflict = creationResult.error_code === 'INVALID_PARTICIPANTS' || 
                        creationResult.error_code === 'INVALID_CREATOR';
      
      const statusCode = isConflict ? HTTP_STATUS.BAD_REQUEST : HTTP_STATUS.INTERNAL_SERVER_ERROR;
      
      recordGroupMetrics(
        timer,
        'POST',
        statusCode,
        'error',
        userId,
        `RPC failed: ${creationResult.error_code ?? 'UNKNOWN'}`,
        uniqueIds.length + 1,
        undefined,
        rollbackFailed,
      );

      logger.error('Atomic group creation failed', {
        userId,
        statusCode,
        ...(creationResult.error ? { error: creationResult.error } : {}),
        metadata: {
          participantCount: uniqueIds.length + 1,
          hasTitle: title !== undefined,
          ...(creationResult.error_code ? { errorCode: creationResult.error_code } : {}),
          ...(creationResult.sqlstate ? { sqlstate: creationResult.sqlstate } : {}),
        },
      });

      return NextResponse.json(
        { 
          error: creationResult.error ?? 'Failed to create group',
          code: creationResult.error_code,
        },
        { status: statusCode }
      );
    }

    // Handle successful creation (including duplicates)
    const isDuplicate = creationResult.is_duplicate ?? false;
    const statusCode = isDuplicate ? HTTP_STATUS.OK : HTTP_STATUS.CREATED;

    const responseData: GroupCreationResponse = {
      conversationId: creationResult.conversation_id ?? '',
      participantCount: creationResult.participant_count ?? 0,
      isDuplicate,
      ...(creationResult.title !== null && creationResult.title !== undefined && creationResult.title.length > 0 && { title: creationResult.title }),
      ...(creationResult.group_hash !== null && creationResult.group_hash !== undefined && creationResult.group_hash.length > 0 && { groupHash: creationResult.group_hash }),
    };

    const response = NextResponse.json(responseData, {
      status: statusCode,
      headers: {
        ...rateLimitResult.headers,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Group-Hash': creationResult.group_hash ?? '',
      },
    });

    recordGroupMetrics(
      timer,
      'POST',
      statusCode,
      'success',
      userId,
      undefined,
      creationResult.participant_count,
      isDuplicate,
    );

    logger.info(isDuplicate ? 'Returned existing group conversation' : 'Successfully created group conversation', {
      userId,
      statusCode,
      metadata: {
        conversationId: creationResult.conversation_id,
        participantCount: creationResult.participant_count,
        hasTitle: creationResult.title !== undefined && creationResult.title !== null,
        title: creationResult.title,
        isDuplicate,
        groupHash: creationResult.group_hash,
      },
    });

    return response;

  } catch (error: unknown) {
    recordGroupMetrics(
      timer,
      'POST',
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      'error',
      userId,
      error instanceof Error ? error.message : 'Unknown error',
      undefined,
      undefined,
      rollbackFailed,
    );

    logger.error('Group creation failed unexpectedly', {
      ...(userId ? { userId } : {}),
      statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error: error instanceof Error ? error : new Error(String(error)),
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

// Runtime documentation (Issue 12)
// Using Node.js runtime for:
// - RPC function calls requiring full PostgreSQL feature set
// - Complex environment validation at startup
// - Enhanced rate limiting with database backend
// - Structured logging with production-grade features
// - Batch participant validation for scalability
export const runtime = 'nodejs';