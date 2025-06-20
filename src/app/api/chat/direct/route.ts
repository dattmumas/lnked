/* eslint-disable no-magic-numbers */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createRequestScopedSupabaseClient } from '@/lib/supabase/request-scoped';
import { applyEnhancedRateLimit } from '@/lib/utils/enhanced-rate-limiting';
import { recordAPIMetrics, createMetricsTimer } from '@/lib/utils/metrics';
import { safeParseJson } from '@/lib/utils/request-validation';
import { createAPILogger } from '@/lib/utils/structured-logger';

// Environment-driven constants with safe production defaults
const CONVERSATION_CONFIG = {
  DEFAULT_LIMIT: parseInt(process.env.DM_LIMIT_DEFAULT ?? '50', 10),
  MAX_LIMIT: parseInt(process.env.DM_LIMIT_MAX ?? '100', 10),
  MIN_LIMIT: parseInt(process.env.DM_LIMIT_MIN ?? '1', 10),
} as const;

const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
} as const;

// Error mapping to prevent verbose leakage
const ERROR_MESSAGES = {
  AUTH_REQUIRED: 'Authentication required',
  RATE_LIMIT_EXCEEDED: 'Too many requests',
  VALIDATION_FAILED: 'Invalid request data',
  SELF_CONVERSATION: 'Cannot create conversation with yourself',
  INVALID_RECIPIENT: 'Invalid recipient specified',
  CONVERSATION_CREATION_FAILED: 'Failed to create conversation',
  CONVERSATION_FETCH_FAILED: 'Failed to fetch conversations',
  INTERNAL_ERROR: 'Service temporarily unavailable',
} as const;

// Comprehensive validation schemas with NaN-safe parsing
const CreateDirectConversationSchema = z.object({
  recipientId: z.string().uuid('Invalid recipient ID format'),
});

const GetDirectConversationsQuerySchema = z.object({
  limit: z.coerce
    .number({
      invalid_type_error: 'Limit must be a number',
      required_error: 'Limit is required',
    })
    .int('Limit must be an integer')
    .min(CONVERSATION_CONFIG.MIN_LIMIT, `Limit must be at least ${CONVERSATION_CONFIG.MIN_LIMIT}`)
    .max(CONVERSATION_CONFIG.MAX_LIMIT, `Limit cannot exceed ${CONVERSATION_CONFIG.MAX_LIMIT}`)
    .default(CONVERSATION_CONFIG.DEFAULT_LIMIT),
});

// Type-safe RPC response interfaces
interface CreateDirectConversationResult {
  conversation_id: string;
  is_existing: boolean;
}

interface DirectConversationWithParticipant {
  conversation_id: string;
  last_message_at: string | null;
  created_at: string;
  other_user_id: string;
  other_user_username: string | null;
  other_user_full_name: string | null;
  other_user_avatar_url: string | null;
}

// Standardized error response
function createErrorResponse(
  message: string,
  code: keyof typeof ERROR_MESSAGES,
  status: number,
  details?: unknown
): NextResponse {
  const response: Record<string, unknown> = {
    error: ERROR_MESSAGES[code],
    code,
  };

  if (details !== undefined && process.env.NODE_ENV === 'development') {
    response.details = details;
  }

  return NextResponse.json(response, { status });
}

// Enhanced logging with error sanitization
function logError(logger: ReturnType<typeof createAPILogger>, message: string, error: unknown): void {
  // Sanitize error for logging (prevent sensitive data leakage)
  const sanitizedError = error instanceof Error 
    ? { name: error.name, message: error.message.substring(0, 200) } // Truncate long messages
    : String(error).substring(0, 200);
  
  logger.error(message, { error: sanitizedError });
}

// Type-safe RPC function wrapper
interface RPCFunctionSignature {
  create_direct_conversation_atomic: {
    params: { sender_id: string; recipient_id: string };
    returns: CreateDirectConversationResult[];
  };
  get_direct_conversations_with_participants: {
    params: { p_user_id: string; limit_count: number };
    returns: DirectConversationWithParticipant[];
  };
}

async function callRPCFunction<T extends keyof RPCFunctionSignature>(
  supabase: ReturnType<typeof createRequestScopedSupabaseClient>,
  functionName: T,
  params: RPCFunctionSignature[T]['params']
): Promise<{ data: RPCFunctionSignature[T]['returns'] | null; error: Error | null }> {
  try {
    // Use targeted type assertion for RPC calls to new functions not in generated types
    const result = await (supabase as unknown as {
      rpc: (name: string, params: unknown) => Promise<{ data: unknown; error: unknown }>
    }).rpc(functionName, params);
    
    return {
      data: result.data as RPCFunctionSignature[T]['returns'] | null,
      error: result.error as Error | null,
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown RPC error'),
    };
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const timer = createMetricsTimer();
  const logger = createAPILogger(request, '/api/chat/direct');

  try {
    // Get session-aware Supabase client
    const supabase = createRequestScopedSupabaseClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError !== null || user === null) {
      logger.warn('Authentication failed');
      recordAPIMetrics({
        endpoint: '/api/chat/direct',
        method: 'POST',
        statusCode: HTTP_STATUS.UNAUTHORIZED,
        duration: timer(),
        error: 'auth_failed',
      });
      return createErrorResponse(
        'Authentication required',
        'AUTH_REQUIRED',
        HTTP_STATUS.UNAUTHORIZED
      );
    }

    // User is guaranteed to be non-null after the check above
    const authenticatedUser = user;

    // Rate limiting
    const rateLimitResult = await applyEnhancedRateLimit(request, authenticatedUser.id);
    if (!rateLimitResult.allowed) {
      logger.warn('Rate limit exceeded', { userId: authenticatedUser.id });
      recordAPIMetrics({
        endpoint: '/api/chat/direct',
        method: 'POST',
        statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
        duration: timer(),
        userId: authenticatedUser.id,
        error: 'rate_limit_exceeded',
      });
      return NextResponse.json(
        { 
          error: ERROR_MESSAGES.RATE_LIMIT_EXCEEDED,
          code: 'RATE_LIMIT_EXCEEDED',
        },
        { 
          status: HTTP_STATUS.TOO_MANY_REQUESTS,
          headers: rateLimitResult.headers,
        }
      );
    }

    // Request body validation
    const bodyValidation = await safeParseJson(request, CreateDirectConversationSchema);
    if (!bodyValidation.success) {
      logger.warn('Request validation failed');
      recordAPIMetrics({
        endpoint: '/api/chat/direct',
        method: 'POST',
        statusCode: HTTP_STATUS.BAD_REQUEST,
        duration: timer(),
        userId: authenticatedUser.id,
        error: 'validation_failed',
      });
      return createErrorResponse(
        'Invalid request data',
        'VALIDATION_FAILED',
        HTTP_STATUS.BAD_REQUEST,
        process.env.NODE_ENV === 'development' ? bodyValidation.error : undefined
      );
    }

    const { recipientId } = bodyValidation.data;

    // Self-conversation check (redundant with RPC, but provides better error message)
    if (recipientId === authenticatedUser.id) {
      logger.warn('Self-conversation attempt', { userId: authenticatedUser.id });
      recordAPIMetrics({
        endpoint: '/api/chat/direct',
        method: 'POST',
        statusCode: HTTP_STATUS.BAD_REQUEST,
        duration: timer(),
        userId: authenticatedUser.id,
        error: 'self_conversation',
      });
      return createErrorResponse(
        'Cannot create conversation with yourself',
        'SELF_CONVERSATION',
        HTTP_STATUS.BAD_REQUEST
      );
    }

    // Use atomic RPC function to create or find direct conversation
    const { data: rpcResult, error: rpcError } = await callRPCFunction(
      supabase,
      'create_direct_conversation_atomic',
      {
        sender_id: authenticatedUser.id,
        recipient_id: recipientId,
      }
    );

    if (rpcError !== null) {
      logError(logger, 'RPC function failed', rpcError);
      recordAPIMetrics({
        endpoint: '/api/chat/direct',
        method: 'POST',
        statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        duration: timer(),
        userId: authenticatedUser.id,
        error: 'rpc_failed',
      });
      
      // Map specific errors to user-friendly messages
      if (rpcError.message.includes('Cannot create conversation with yourself')) {
        return createErrorResponse(
          'Cannot create conversation with yourself',
          'SELF_CONVERSATION',
          HTTP_STATUS.BAD_REQUEST
        );
      }
      
      return createErrorResponse(
        'Failed to create conversation',
        'CONVERSATION_CREATION_FAILED',
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }

    if (rpcResult === null || !Array.isArray(rpcResult) || rpcResult.length === 0) {
      logError(logger, 'RPC returned no results', null);
      recordAPIMetrics({
        endpoint: '/api/chat/direct',
        method: 'POST',
        statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        duration: timer(),
        userId: authenticatedUser.id,
        error: 'no_results',
      });
      return createErrorResponse(
        'Failed to create conversation',
        'CONVERSATION_CREATION_FAILED',
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }

    const result = rpcResult[0];
    const isExisting = result.is_existing;

    logger.info(`Direct conversation ${isExisting ? 'found' : 'created'}`, {
      userId: authenticatedUser.id,
    });

    recordAPIMetrics({
      endpoint: '/api/chat/direct',
      method: 'POST',
      statusCode: isExisting ? HTTP_STATUS.OK : HTTP_STATUS.CREATED,
      duration: timer(),
      userId: authenticatedUser.id,
    });

    return NextResponse.json(
      { conversationId: result.conversation_id },
      { status: isExisting ? HTTP_STATUS.OK : HTTP_STATUS.CREATED }
    );

  } catch (error) {
    logError(logger, 'Unexpected error in POST', error);
    
    recordAPIMetrics({
      endpoint: '/api/chat/direct',
      method: 'POST',
      statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      duration: timer(),
      error: 'unexpected_error',
    });

    return createErrorResponse(
      'Service temporarily unavailable',
      'INTERNAL_ERROR',
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const timer = createMetricsTimer();
  const logger = createAPILogger(request, '/api/chat/direct');

  try {
    // Get session-aware Supabase client
    const supabase = createRequestScopedSupabaseClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError !== null || user === null) {
      logger.warn('Authentication failed');
      recordAPIMetrics({
        endpoint: '/api/chat/direct',
        method: 'GET',
        statusCode: HTTP_STATUS.UNAUTHORIZED,
        duration: timer(),
        error: 'auth_failed',
      });
      return createErrorResponse(
        'Authentication required',
        'AUTH_REQUIRED',
        HTTP_STATUS.UNAUTHORIZED
      );
    }

    // User is guaranteed to be non-null after the check above
    const authenticatedUser = user;

    // Rate limiting
    const rateLimitResult = await applyEnhancedRateLimit(request, authenticatedUser.id);
    if (!rateLimitResult.allowed) {
      logger.warn('Rate limit exceeded', { userId: authenticatedUser.id });
      recordAPIMetrics({
        endpoint: '/api/chat/direct',
        method: 'GET',
        statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
        duration: timer(),
        userId: authenticatedUser.id,
        error: 'rate_limit_exceeded',
      });
      return NextResponse.json(
        { 
          error: ERROR_MESSAGES.RATE_LIMIT_EXCEEDED,
          code: 'RATE_LIMIT_EXCEEDED',
        },
        { 
          status: HTTP_STATUS.TOO_MANY_REQUESTS,
          headers: rateLimitResult.headers,
        }
      );
    }

    // Parse and validate query parameters with NaN-safe validation
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    
    const queryValidation = GetDirectConversationsQuerySchema.safeParse({
      limit: limitParam
    });
    
    if (!queryValidation.success) {
      logger.warn('Query parameter validation failed');
      recordAPIMetrics({
        endpoint: '/api/chat/direct',
        method: 'GET',
        statusCode: HTTP_STATUS.BAD_REQUEST,
        duration: timer(),
        userId: authenticatedUser.id,
        error: 'validation_failed',
      });
      return createErrorResponse(
        'Invalid query parameters',
        'VALIDATION_FAILED',
        HTTP_STATUS.BAD_REQUEST,
        process.env.NODE_ENV === 'development' ? queryValidation.error.flatten() : undefined
      );
    }

    // Use optimized RPC function to fetch conversations (solves N+1 query issue)
    const { data: conversations, error: conversationsError } = await callRPCFunction(
      supabase,
      'get_direct_conversations_with_participants',
      {
        p_user_id: authenticatedUser.id,
        limit_count: queryValidation.data.limit,
      }
    );

    if (conversationsError !== null) {
      logError(logger, 'Failed to fetch conversations', conversationsError);
      recordAPIMetrics({
        endpoint: '/api/chat/direct',
        method: 'GET',
        statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        duration: timer(),
        userId: authenticatedUser.id,
        error: 'fetch_failed',
      });
      return createErrorResponse(
        'Failed to fetch conversations',
        'CONVERSATION_FETCH_FAILED',
        HTTP_STATUS.INTERNAL_SERVER_ERROR
      );
    }

    // Transform RPC results to match expected API format
    const conversationArray = Array.isArray(conversations) ? conversations : [];
    const formattedConversations = conversationArray.map((conv: DirectConversationWithParticipant) => ({
      id: conv.conversation_id,
      last_message_at: conv.last_message_at ?? conv.created_at,
      user: {
        id: conv.other_user_id,
        full_name: conv.other_user_full_name,
        username: conv.other_user_username,
        avatar_url: conv.other_user_avatar_url,
      },
    }));

    logger.info('Successfully fetched direct conversations', { 
      userId: authenticatedUser.id,
    });
    
    recordAPIMetrics({
      endpoint: '/api/chat/direct',
      method: 'GET',
      statusCode: HTTP_STATUS.OK,
      duration: timer(),
      userId: authenticatedUser.id,
    });

    return NextResponse.json(formattedConversations, { status: HTTP_STATUS.OK });

  } catch (error) {
    logError(logger, 'Unexpected error in GET', error);
    
    recordAPIMetrics({
      endpoint: '/api/chat/direct',
      method: 'GET',
      statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      duration: timer(),
      error: 'unexpected_error',
    });

    return createErrorResponse(
      'Service temporarily unavailable',
      'INTERNAL_ERROR',
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
}

// Edge runtime compatible (addressing audit item #11)
export const runtime = 'edge';