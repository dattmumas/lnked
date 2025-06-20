/* eslint-disable no-magic-numbers */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createRequestScopedSupabaseClient } from '@/lib/supabase/request-scoped';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createMetricsTimer, recordAPIMetrics } from '@/lib/utils/metrics';
import { applyRateLimit } from '@/lib/utils/rate-limiting';
import { createAPILogger } from '@/lib/utils/structured-logger';

// API endpoint constant to prevent drift between logs/metrics
const ENDPOINT = '/api/chat/messages/[messageId]/reactions' as const;

// Environment-driven configuration constants
const REACTION_CONFIG = {
  MAX_EMOJI_LENGTH: Number(process.env.REACTION_MAX_EMOJI_LENGTH) || 10,
  RATE_LIMIT_WINDOW: Number(process.env.REACTION_RATE_LIMIT_WINDOW) || 60000, // 1 minute
  RATE_LIMIT_MAX: Number(process.env.REACTION_RATE_LIMIT_MAX) || 50,
  CACHE_MAX_AGE: Number(process.env.REACTION_CACHE_MAX_AGE) || 300, // 5 minutes
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

// Supported emoji reactions (can be expanded)
const SUPPORTED_EMOJIS = [
  '👍', '👎', '❤️', '😂', '😮', '😢', '😡', '🎉', '🔥', '👏',
  '💯', '🚀', '✨', '💪', '🙌', '👌', '✅', '❌', '⭐', '💡'
] as const;

// Request validation schemas
const ReactionBodySchema = z.object({
  emoji: z.string()
    .trim()
    .min(1, 'Emoji is required')
    .max(REACTION_CONFIG.MAX_EMOJI_LENGTH, `Emoji must be at most ${REACTION_CONFIG.MAX_EMOJI_LENGTH} characters`)
    .refine(
      (emoji) => SUPPORTED_EMOJIS.includes(emoji as typeof SUPPORTED_EMOJIS[number]),
      'Unsupported emoji reaction'
    ),
});

// Type definitions
interface MessageRow {
  id: string;
  conversation_id: string | null; // Allow null to match Supabase schema
  conversation_participants?: Array<{ user_id: string }>;
}

interface ReactionRow {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

interface ReactionCountsRow {
  emoji: string;
}

interface ReactionResponse {
  reaction?: ReactionRow;
  counts: Record<string, number>;
  success?: boolean;
  message?: string;
  reaction_id?: string;
}

// Helper to record metrics with full request timing
function recordReactionMetrics(
  timer: () => number,
  method: string,
  statusCode: number,
  result: 'success' | 'error',
  userId?: string,
  error?: string,
  _emoji?: string, // Prefix with underscore to indicate intentionally unused
  _conversationId?: string, // Prefix with underscore to indicate intentionally unused
): void {
  const duration = timer(); // Capture timing just before recording
  
  // Record basic metrics without custom labels (using standard MetricData interface)
  recordAPIMetrics({
    endpoint: ENDPOINT,
    method,
    statusCode,
    duration,
    userId,
    error,
  });
}

// Validate message access with proper error handling
async function validateMessageAccess(
  supabase: ReturnType<typeof createRequestScopedSupabaseClient>,
  messageId: string,
  userId: string,
): Promise<{ hasAccess: boolean; messageData?: MessageRow; error?: string }> {
  try {
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .select(`
        id,
        conversation_id,
        conversation_participants!inner(user_id)
      `)
      .eq('id', messageId)
      .eq('conversation_participants.user_id', userId)
      .maybeSingle();

    if (messageError !== null) {
      return { hasAccess: false, error: messageError.message };
    }

    if (message === null) {
      return { hasAccess: false, error: 'Message not found or access denied' };
    }

    // Safe type casting with proper validation
    const messageData: MessageRow = {
      id: message.id,
      conversation_id: message.conversation_id, // Now properly typed as string | null
      conversation_participants: Array.isArray(message.conversation_participants) 
        ? message.conversation_participants as Array<{ user_id: string }> 
        : undefined,
    };

    return { hasAccess: true, messageData };

  } catch (error: unknown) {
    return {
      hasAccess: false,
      error: error instanceof Error ? error.message : 'Failed to validate message access',
    };
  }
}

// Check for existing reaction
async function checkExistingReaction(
  supabase: ReturnType<typeof createRequestScopedSupabaseClient>,
  messageId: string,
  userId: string,
  emoji: string,
): Promise<{ exists: boolean; reactionData?: ReactionRow; error?: string }> {
  try {
    const { data: existingReaction, error: reactionError } = await supabase
      .from('message_reactions')
      .select('id, message_id, user_id, emoji, created_at')
      .eq('message_id', messageId)
      .eq('user_id', userId)
      .eq('emoji', emoji)
      .maybeSingle();

    if (reactionError !== null) {
      return { exists: false, error: reactionError.message };
    }

    if (existingReaction === null) {
      return { exists: false };
    }

    return { exists: true, reactionData: existingReaction as ReactionRow };

  } catch (error: unknown) {
    return {
      exists: false,
      error: error instanceof Error ? error.message : 'Failed to check existing reaction',
    };
  }
}

// Add reaction with atomic operation
async function addReaction(
  messageId: string,
  userId: string,
  emoji: string,
): Promise<{ success: boolean; reactionData?: ReactionRow; error?: string }> {
  try {
    const { data: newReaction, error: insertError } = await supabaseAdmin
      .from('message_reactions')
      .insert({
        message_id: messageId,
        user_id: userId,
        emoji,
        created_at: new Date().toISOString(),
      })
      .select('id, message_id, user_id, emoji, created_at')
      .single();

    if (insertError !== null) {
      return { success: false, error: insertError.message };
    }

    if (newReaction === null) {
      return { success: false, error: 'Failed to create reaction' };
    }

    return { success: true, reactionData: newReaction as ReactionRow };

  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add reaction',
    };
  }
}

// Remove reaction with atomic operation
async function removeReaction(
  messageId: string,
  userId: string,
  emoji: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error: deleteError } = await supabaseAdmin
      .from('message_reactions')
      .delete()
      .eq('message_id', messageId)
      .eq('user_id', userId)
      .eq('emoji', emoji);

    if (deleteError !== null) {
      return { success: false, error: deleteError.message };
    }

    return { success: true };

  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove reaction',
    };
  }
}

// Get reaction counts for a message
async function getReactionCounts(
  supabase: ReturnType<typeof createRequestScopedSupabaseClient>,
  messageId: string,
): Promise<{ success: boolean; counts?: Record<string, number>; error?: string }> {
  try {
    const { data: reactionCounts, error: countsError } = await supabase
      .from('message_reactions')
      .select('emoji')
      .eq('message_id', messageId);

    if (countsError !== null) {
      return { success: false, error: countsError.message };
    }

    const counts = (reactionCounts ?? []).reduce((acc: Record<string, number>, r: ReactionCountsRow) => {
      const currentCount = acc[r.emoji] ?? 0;
      acc[r.emoji] = currentCount + 1;
      return acc;
    }, {});

    return { success: true, counts };

  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get reaction counts',
    };
  }
}

// Generate cache headers for reactions
function generateReactionCacheHeaders(messageId: string): Record<string, string> {
  const etag = `"reaction-${messageId}-${Date.now()}"`;
  
  return {
    ETag: etag,
    'Cache-Control': `private, max-age=${REACTION_CONFIG.CACHE_MAX_AGE}`,
  };
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ messageId: string }> } // Fixed: params IS a Promise in Next.js 15
): Promise<NextResponse> {
  const logger = createAPILogger(request, ENDPOINT);
  const timer = createMetricsTimer();
  let userId: string | undefined;
  let conversationId: string | undefined;
  let emoji: string | undefined;

  try {
    const { messageId } = await context.params; // Await params in Next.js 15

    // Session-aware Supabase client
    const supabase = createRequestScopedSupabaseClient(request);
    
    // Authentication check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError !== null || user === null) {
      recordReactionMetrics(
        timer,
        'POST',
        HTTP_STATUS.UNAUTHORIZED,
        'error',
        undefined,
        'Authentication failed',
      );

      logger.warn('Unauthorized reaction attempt', {
        statusCode: HTTP_STATUS.UNAUTHORIZED,
        error: authError?.message,
        metadata: { messageId },
      });

      return NextResponse.json({ error: 'Unauthorized' }, { status: HTTP_STATUS.UNAUTHORIZED });
    }

    userId = user.id;

    // Rate limiting
    const rateLimitResult = await applyRateLimit(request, userId);
    if (!rateLimitResult.allowed) {
      recordReactionMetrics(
        timer,
        'POST',
        HTTP_STATUS.TOO_MANY_REQUESTS,
        'error',
        userId,
        'Rate limit exceeded',
      );

      logger.warn('Rate limit exceeded for reaction', {
        userId,
        statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
        metadata: { messageId },
      });

      return NextResponse.json(
        { error: rateLimitResult.error },
        { 
          status: HTTP_STATUS.TOO_MANY_REQUESTS,
          headers: rateLimitResult.headers,
        }
      );
    }

    // Parse and validate request body (fixing unsafe assignment)
    let body: unknown;
    try {
      body = await request.json() as unknown;
    } catch {
      recordReactionMetrics(
        timer,
        'POST',
        HTTP_STATUS.BAD_REQUEST,
        'error',
        userId,
        'Invalid JSON',
      );

      return NextResponse.json({ error: 'Invalid JSON' }, { status: HTTP_STATUS.BAD_REQUEST });
    }

    const parsed = ReactionBodySchema.safeParse(body);
    if (!parsed.success) {
      recordReactionMetrics(
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

    const { emoji } = parsed.data; // Use object destructuring

    // Validate message access (fixing object conditional)
    const accessResult = await validateMessageAccess(supabase, messageId, userId);
    
    if (!accessResult.hasAccess) {
      recordReactionMetrics(
        timer,
        'POST',
        HTTP_STATUS.NOT_FOUND,
        'error',
        userId,
        'Message access denied',
        emoji,
      );

      return NextResponse.json(
        { error: accessResult.error ?? 'Message not found or access denied' },
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    // Extract conversation ID for metrics
    conversationId = accessResult.messageData?.conversation_id ?? undefined;

    // Check for existing reaction
    const existingResult = await checkExistingReaction(supabase, messageId, userId, emoji);
    
    if (existingResult.error !== undefined) {
      recordReactionMetrics(
        timer,
        'POST',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'error',
        userId,
        'Failed to check existing reaction',
        emoji,
        conversationId,
      );

      logger.error('Failed to check existing reaction', {
        userId,
        statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        error: existingResult.error,
        metadata: { messageId, emoji },
      });

      return NextResponse.json(
        { error: 'Failed to check existing reaction' },
        { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
      );
    }

    if (existingResult.exists && existingResult.reactionData !== undefined) {
      // Get current counts for response
      const countsResult = await getReactionCounts(supabase, messageId);
      const counts = countsResult.success ? countsResult.counts ?? {} : {};

      const response = NextResponse.json(
        { 
          message: 'Reaction already exists',
          reaction_id: existingResult.reactionData.id,
          counts,
        },
        { 
          status: HTTP_STATUS.CONFLICT,
          headers: generateReactionCacheHeaders(messageId),
        }
      );

      recordReactionMetrics(
        timer,
        'POST',
        HTTP_STATUS.CONFLICT,
        'error',
        userId,
        'Reaction already exists',
        emoji,
        conversationId,
      );

      return response;
    }

    // Add reaction
    const addResult = await addReaction(messageId, userId, emoji);
    
    if (!addResult.success) {
      recordReactionMetrics(
        timer,
        'POST',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'error',
        userId,
        'Failed to add reaction',
        emoji,
        conversationId,
      );

      logger.error('Failed to add reaction', {
        userId,
        statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        error: addResult.error,
        metadata: { messageId, emoji },
      });

      return NextResponse.json(
        { error: addResult.error ?? 'Failed to add reaction' },
        { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
      );
    }

    // Get updated reaction counts
    const countsResult = await getReactionCounts(supabase, messageId);
    
    if (!countsResult.success) {
      recordReactionMetrics(
        timer,
        'POST',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'error',
        userId,
        'Failed to get reaction counts',
        emoji,
        conversationId,
      );

      logger.error('Failed to get reaction counts', {
        userId,
        statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        error: countsResult.error,
        metadata: { messageId, emoji },
      });

      return NextResponse.json(
        { error: countsResult.error ?? 'Failed to get reaction counts' },
        { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
      );
    }

    const responseData: ReactionResponse = {
      reaction: addResult.reactionData,
      counts: countsResult.counts ?? {},
    };

    const response = NextResponse.json(responseData, {
      status: HTTP_STATUS.CREATED,
      headers: {
        ...rateLimitResult.headers,
        ...generateReactionCacheHeaders(messageId),
      },
    });

    // Record metrics with full timing (including serialization)
    recordReactionMetrics(
      timer,
      'POST',
      HTTP_STATUS.CREATED,
      'success',
      userId,
      undefined,
      emoji,
      conversationId,
    );

    logger.info('Successfully added reaction', {
      userId,
      statusCode: HTTP_STATUS.CREATED,
      metadata: {
        messageId,
        emoji,
        reactionId: addResult.reactionData?.id,
      },
    });

    return response;

  } catch (error: unknown) {
    recordReactionMetrics(
      timer,
      'POST',
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      'error',
      userId,
      error instanceof Error ? error.message : 'Unknown error',
      emoji,
      conversationId,
    );

    logger.error('Reaction creation failed unexpectedly', {
      userId,
      statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error: error instanceof Error ? error : new Error(String(error)),
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ messageId: string }> } // Fixed: params IS a Promise in Next.js 15
): Promise<NextResponse> {
  const logger = createAPILogger(request, ENDPOINT);
  const timer = createMetricsTimer();
  let userId: string | undefined;
  let conversationId: string | undefined;
  let emoji: string | undefined;

  try {
    const { messageId } = await context.params; // Await params in Next.js 15

    // Session-aware Supabase client
    const supabase = createRequestScopedSupabaseClient(request);
    
    // Authentication check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError !== null || user === null) {
      recordReactionMetrics(
        timer,
        'DELETE',
        HTTP_STATUS.UNAUTHORIZED,
        'error',
        undefined,
        'Authentication failed',
      );

      logger.warn('Unauthorized reaction removal attempt', {
        statusCode: HTTP_STATUS.UNAUTHORIZED,
        error: authError?.message,
        metadata: { messageId },
      });

      return NextResponse.json({ error: 'Unauthorized' }, { status: HTTP_STATUS.UNAUTHORIZED });
    }

    userId = user.id;

    // Rate limiting
    const rateLimitResult = await applyRateLimit(request, userId);
    if (!rateLimitResult.allowed) {
      recordReactionMetrics(
        timer,
        'DELETE',
        HTTP_STATUS.TOO_MANY_REQUESTS,
        'error',
        userId,
        'Rate limit exceeded',
      );

      return NextResponse.json(
        { error: rateLimitResult.error },
        { 
          status: HTTP_STATUS.TOO_MANY_REQUESTS,
          headers: rateLimitResult.headers,
        }
      );
    }

    // Parse and validate request body (fixing unsafe assignment)
    let body: unknown;
    try {
      body = await request.json() as unknown;
    } catch {
      recordReactionMetrics(
        timer,
        'DELETE',
        HTTP_STATUS.BAD_REQUEST,
        'error',
        userId,
        'Invalid JSON',
      );

      return NextResponse.json({ error: 'Invalid JSON' }, { status: HTTP_STATUS.BAD_REQUEST });
    }

    const parsed = ReactionBodySchema.safeParse(body);
    if (!parsed.success) {
      recordReactionMetrics(
        timer,
        'DELETE',
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

    const { emoji } = parsed.data; // Use object destructuring

    // Validate message access (fixing object conditional)
    const accessResult = await validateMessageAccess(supabase, messageId, userId);
    
    if (!accessResult.hasAccess) {
      recordReactionMetrics(
        timer,
        'DELETE',
        HTTP_STATUS.NOT_FOUND,
        'error',
        userId,
        'Message access denied',
        emoji,
      );

      return NextResponse.json(
        { error: accessResult.error ?? 'Message not found or access denied' },
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    // Extract conversation ID for metrics
    conversationId = accessResult.messageData?.conversation_id ?? undefined;

    // Remove reaction
    const removeResult = await removeReaction(messageId, userId, emoji);
    
    if (!removeResult.success) {
      recordReactionMetrics(
        timer,
        'DELETE',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'error',
        userId,
        'Failed to remove reaction',
        emoji,
        conversationId,
      );

      logger.error('Failed to remove reaction', {
        userId,
        statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        error: removeResult.error,
        metadata: { messageId, emoji },
      });

      return NextResponse.json(
        { error: removeResult.error ?? 'Failed to remove reaction' },
        { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
      );
    }

    // Get updated reaction counts
    const countsResult = await getReactionCounts(supabase, messageId);
    
    if (!countsResult.success) {
      recordReactionMetrics(
        timer,
        'DELETE',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        'error',
        userId,
        'Failed to get reaction counts',
        emoji,
        conversationId,
      );

      logger.error('Failed to get reaction counts', {
        userId,
        statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        error: countsResult.error,
        metadata: { messageId, emoji },
      });

      return NextResponse.json(
        { error: countsResult.error ?? 'Failed to get reaction counts' },
        { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
      );
    }

    const responseData: ReactionResponse = {
      success: true,
      counts: countsResult.counts ?? {},
    };

    // Using 200 OK with body (semantically correct for returning reaction counts)
    const response = NextResponse.json(responseData, {
      status: HTTP_STATUS.OK,
      headers: {
        ...rateLimitResult.headers,
        ...generateReactionCacheHeaders(messageId),
      },
    });

    // Record metrics with full timing (including serialization) - moved to just before return
    recordReactionMetrics(
      timer,
      'DELETE',
      HTTP_STATUS.OK,
      'success',
      userId,
      undefined,
      emoji,
      conversationId,
    );

    logger.info('Successfully removed reaction', {
      userId,
      statusCode: HTTP_STATUS.OK,
      metadata: { messageId, emoji },
    });

    return response;

  } catch (error: unknown) {
    recordReactionMetrics(
      timer,
      'DELETE',
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      'error',
      userId,
      error instanceof Error ? error.message : 'Unknown error',
      emoji,
      conversationId,
    );

    logger.error('Reaction removal failed unexpectedly', {
      userId,
      statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error: error instanceof Error ? error : new Error(String(error)),
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

// Runtime choice documented
// Using Node.js runtime for:
// - Supabase Admin client compatibility
// - Advanced transaction handling
// - Crypto operations for ETag generation
export const runtime = 'nodejs'; 