/* eslint-disable no-magic-numbers */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createRequestScopedSupabaseClient } from '@/lib/supabase/request-scoped';
import { createMetricsTimer, recordAPIMetrics } from '@/lib/utils/metrics';
import { applyRateLimit } from '@/lib/utils/rate-limiting';
import { createAPILogger } from '@/lib/utils/structured-logger';

// Environment-driven configuration constants
const SEARCH_CONFIG = {
  MAX_LIMIT: Number(process.env.SEARCH_MAX_LIMIT) || 100,
  DEFAULT_LIMIT: Number(process.env.SEARCH_DEFAULT_LIMIT) || 50,
  MIN_QUERY_LENGTH: Number(process.env.SEARCH_MIN_QUERY_LENGTH) || 2,
  MAX_QUERY_LENGTH: Number(process.env.SEARCH_MAX_QUERY_LENGTH) || 1000,
  MAX_OFFSET: Number(process.env.SEARCH_MAX_OFFSET) || 10000,
  RATE_LIMIT_WINDOW: Number(process.env.SEARCH_RATE_LIMIT_WINDOW) || 60000, // 1 minute
  RATE_LIMIT_MAX: Number(process.env.SEARCH_RATE_LIMIT_MAX) || 100,
  CACHE_MAX_AGE: Number(process.env.SEARCH_CACHE_MAX_AGE) || 60,
} as const;

// HTTP status codes
const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
} as const;

// Search parameter validation schema
const SearchParamsSchema = z.object({
  q: z.string()
    .min(SEARCH_CONFIG.MIN_QUERY_LENGTH, `Query must be at least ${SEARCH_CONFIG.MIN_QUERY_LENGTH} characters`)
    .max(SEARCH_CONFIG.MAX_QUERY_LENGTH, `Query must be at most ${SEARCH_CONFIG.MAX_QUERY_LENGTH} characters`)
    .trim(),
  conversationId: z.string().uuid().optional(),
  limit: z.coerce.number()
    .int()
    .min(1)
    .max(SEARCH_CONFIG.MAX_LIMIT)
    .default(SEARCH_CONFIG.DEFAULT_LIMIT),
  offset: z.coerce.number()
    .int()
    .min(0)
    .max(SEARCH_CONFIG.MAX_OFFSET)
    .default(0),
});

// Type definitions
interface SearchResult {
  id: string;
  content: string;
  created_at: string;
  conversation_id: string;
  conversation_title: string | null;
  sender: {
    id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
  reply_to?: {
    id: string;
    content: string;
    sender: {
      id: string;
      username: string | null;
      full_name: string | null;
    };
  } | null;
  highlighted_content?: string;
}

interface SearchResponse {
  results: SearchResult[];
  total: number;
  query: string;
  limit: number;
  offset: number;
  has_more: boolean;
}

// Input validation helpers
function parseSearchParams(searchParams: URLSearchParams): {
  success: boolean;
  data?: z.infer<typeof SearchParamsSchema>;
  error?: string;
} {
  try {
    const rawParams = {
      q: searchParams.get('q'),
      conversationId: searchParams.get('conversationId'),
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
    };

    // Handle null values explicitly for strict-boolean-expressions compliance
    if (rawParams.q === null || rawParams.q.length === 0) {
      return {
        success: false,
        error: `Query parameter 'q' is required and must be at least ${SEARCH_CONFIG.MIN_QUERY_LENGTH} characters`,
      };
    }

    const parseResult = SearchParamsSchema.safeParse(rawParams);
    
    if (!parseResult.success) {
      return {
        success: false,
        error: parseResult.error.errors.map(e => e.message).join(', '),
      };
    }

    return {
      success: true,
      data: parseResult.data,
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Invalid search parameters',
    };
  }
}

// Get user's accessible conversation IDs
async function getUserConversationIds(
  supabase: ReturnType<typeof createRequestScopedSupabaseClient>,
  userId: string,
): Promise<{ success: boolean; conversationIds?: string[]; error?: string }> {
  try {
    const { data: userConversations, error: conversationsErr } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userId);

    if (conversationsErr !== null) {
      return { success: false, error: conversationsErr.message };
    }

    if (userConversations === null || userConversations.length === 0) {
      return { success: true, conversationIds: [] };
    }

    const conversationIds = userConversations
      .map(c => c.conversation_id)
      .filter((id): id is string => id !== null && id.length > 0);

    return { success: true, conversationIds };

  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get user conversations',
    };
  }
}

// Validate conversation access
function validateConversationAccess(
  conversationId: string | undefined,
  userConversationIds: string[],
): { hasAccess: boolean; error?: string } {
  if (conversationId === undefined) {
    return { hasAccess: true }; // No specific conversation filter
  }

  if (!userConversationIds.includes(conversationId)) {
    return { hasAccess: false, error: 'Access denied to specified conversation' };
  }

  return { hasAccess: true };
}

// Perform search with proper error handling
async function performSearch(
  supabase: ReturnType<typeof createRequestScopedSupabaseClient>,
  query: string,
  conversationIds: string[],
  conversationId: string | undefined,
  limit: number,
  offset: number,
): Promise<{ success: boolean; results?: SearchResult[]; total?: number; error?: string }> {
  try {
    if (conversationIds.length === 0) {
      return { success: true, results: [], total: 0 };
    }

    // Build search query with proper type safety
    let searchQuery = supabase
      .from('messages')
      .select(`
        id,
        content,
        created_at,
        conversation_id,
        conversations!inner(id, title),
        sender:users!messages_sender_id_fkey(
          id,
          username,
          full_name,
          avatar_url
        ),
        reply_to:messages!reply_to_id(
          id,
          content,
          sender:users!messages_sender_id_fkey(
            id,
            username,
            full_name
          )
        )
      `, { count: 'exact' })
      .textSearch('content', query)
      .in('conversation_id', conversationIds)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply conversation filter if specified
    if (conversationId !== undefined) {
      searchQuery = searchQuery.eq('conversation_id', conversationId);
    }

    const { data: messages, error: searchError, count } = await searchQuery;

    if (searchError !== null) {
      return { success: false, error: searchError.message };
    }

    // Transform results with proper null handling
    const results: SearchResult[] = (messages ?? []).map(msg => ({
      id: msg.id,
      content: msg.content,
      created_at: msg.created_at ?? new Date().toISOString(),
      conversation_id: msg.conversation_id ?? '',
      conversation_title: msg.conversations?.title ?? null,
      sender: msg.sender as SearchResult['sender'],
      reply_to: msg.reply_to !== null ? {
        id: msg.reply_to.id,
        content: msg.reply_to.content,
        sender: msg.reply_to.sender as NonNullable<SearchResult['reply_to']>['sender']
      } : null
    }));

    return { success: true, results, total: count ?? 0 };

  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Search operation failed',
    };
  }
}

// Highlight search terms with proper validation
function highlightSearchTerms(text: string, query: string): string {
  if (text.length === 0 || query.length < SEARCH_CONFIG.MIN_QUERY_LENGTH) {
    return text;
  }

  const terms = query.split(/\s+/).filter(term => term.length >= SEARCH_CONFIG.MIN_QUERY_LENGTH);
  let highlighted = text;
  
  terms.forEach(term => {
    const regex = new RegExp(`(${escapeRegex(term)})`, 'gi');
    highlighted = highlighted.replace(regex, '<mark>$1</mark>');
  });
  
  return highlighted;
}

// Escape special regex characters for security
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Generate cache headers based on search parameters
function generateSearchCacheHeaders(query: string, conversationId?: string): Record<string, string> {
  const cacheKey = `search:${query}:${conversationId ?? 'all'}`;
  const etag = `"${Buffer.from(cacheKey).toString('base64')}"`;
  
  return {
    ETag: etag,
    'Cache-Control': `private, max-age=${SEARCH_CONFIG.CACHE_MAX_AGE}`,
  };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const logger = createAPILogger(request, '/api/chat/search');
  const timer = createMetricsTimer();
  let userId: string | undefined;

  try {
    // Session-aware Supabase client
    const supabase = createRequestScopedSupabaseClient(request);
    
    // Authentication check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError !== null || user === null) {
      const duration = timer();
      recordAPIMetrics({
        endpoint: '/api/chat/search',
        method: 'GET',
        statusCode: HTTP_STATUS.UNAUTHORIZED,
        duration,
        error: 'Authentication failed',
      });

      logger.warn('Unauthorized search attempt', {
        statusCode: HTTP_STATUS.UNAUTHORIZED,
        error: authError?.message,
      });

      return NextResponse.json({ error: 'Unauthorized' }, { status: HTTP_STATUS.UNAUTHORIZED });
    }

    userId = user.id;

    // Rate limiting
    const rateLimitResult = await applyRateLimit(request, userId);
    if (!rateLimitResult.allowed) {
      const duration = timer();
      recordAPIMetrics({
        endpoint: '/api/chat/search',
        method: 'GET',
        statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
        duration,
        userId,
        error: 'Rate limit exceeded',
      });

      logger.warn('Rate limit exceeded for search', {
        userId,
        statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
      });

      return NextResponse.json(
        { error: rateLimitResult.error },
        { 
          status: HTTP_STATUS.TOO_MANY_REQUESTS,
          headers: rateLimitResult.headers,
        }
      );
    }

    // Parse and validate search parameters
    const { searchParams } = new URL(request.url);
    const paramResult = parseSearchParams(searchParams);
    
    if (!paramResult.success || paramResult.data === undefined) {
      const duration = timer();
      recordAPIMetrics({
        endpoint: '/api/chat/search',
        method: 'GET',
        statusCode: HTTP_STATUS.BAD_REQUEST,
        duration,
        userId,
        error: 'Invalid search parameters',
      });

      return NextResponse.json(
        { error: paramResult.error ?? 'Invalid search parameters' },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    const { q: query, conversationId, limit, offset } = paramResult.data;

    // Check for cached response
    const cacheHeaders = generateSearchCacheHeaders(query, conversationId);
    const ifNoneMatch = request.headers.get('if-none-match');
    
    if (ifNoneMatch === cacheHeaders.ETag) {
      const duration = timer();
      recordAPIMetrics({
        endpoint: '/api/chat/search',
        method: 'GET',
        statusCode: 304,
        duration,
        userId,
      });

      return new NextResponse(null, { 
        status: 304,
        headers: cacheHeaders,
      });
    }

    // Get user's accessible conversations
    const conversationsResult = await getUserConversationIds(supabase, userId);
    
    if (!conversationsResult.success || conversationsResult.conversationIds === undefined) {
      const duration = timer();
      recordAPIMetrics({
        endpoint: '/api/chat/search',
        method: 'GET',
        statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        duration,
        userId,
        error: 'Failed to get user conversations',
      });

      logger.error('Failed to get user conversations', {
        userId,
        statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        error: conversationsResult.error,
      });

      return NextResponse.json(
        { error: 'Failed to get user conversations' },
        { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
      );
    }

    // Validate conversation access if specific conversation requested
    const accessResult = validateConversationAccess(conversationId, conversationsResult.conversationIds);
    
    if (!accessResult.hasAccess) {
      const duration = timer();
      recordAPIMetrics({
        endpoint: '/api/chat/search',
        method: 'GET',
        statusCode: HTTP_STATUS.FORBIDDEN,
        duration,
        userId,
        error: 'Conversation access denied',
      });

      return NextResponse.json(
        { error: accessResult.error ?? 'Access denied' },
        { status: HTTP_STATUS.FORBIDDEN }
      );
    }

    // Perform search
    const searchResult = await performSearch(
      supabase,
      query,
      conversationsResult.conversationIds,
      conversationId,
      limit,
      offset,
    );

    if (!searchResult.success || searchResult.results === undefined || searchResult.total === undefined) {
      const duration = timer();
      recordAPIMetrics({
        endpoint: '/api/chat/search',
        method: 'GET',
        statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        duration,
        userId,
        error: 'Search operation failed',
      });

      logger.error('Search operation failed', {
        userId,
        statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        error: searchResult.error,
        metadata: {
          query,
          conversationId,
          limit,
          offset,
        },
      });

      return NextResponse.json(
        { error: searchResult.error ?? 'Search failed' },
        { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
      );
    }

    // Apply highlighting to results
    const highlightedResults = searchResult.results.map(result => ({
      ...result,
      highlighted_content: highlightSearchTerms(result.content, query),
    }));

    const response: SearchResponse = {
      results: highlightedResults,
      total: searchResult.total,
      query,
      limit,
      offset,
      has_more: searchResult.total > offset + limit,
    };

    const duration = timer();
    recordAPIMetrics({
      endpoint: '/api/chat/search',
      method: 'GET',
      statusCode: HTTP_STATUS.OK,
      duration,
      userId,
    });

    logger.info('Search completed successfully', {
      userId,
      statusCode: HTTP_STATUS.OK,
      duration,
      metadata: {
        query,
        conversationId,
        resultsCount: highlightedResults.length,
        total: searchResult.total,
        limit,
        offset,
      },
    });

    return NextResponse.json(response, {
      status: HTTP_STATUS.OK,
      headers: {
        ...rateLimitResult.headers,
        ...cacheHeaders,
      },
    });

  } catch (error: unknown) {
    const duration = timer();
    recordAPIMetrics({
      endpoint: '/api/chat/search',
      method: 'GET',
      statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      duration,
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    logger.error('Search operation failed unexpectedly', {
      userId,
      statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      duration,
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
// - Supabase client compatibility
// - Advanced search operations
// - Crypto operations for ETag generation
export const runtime = 'nodejs'; 