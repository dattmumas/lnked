/**
 * Chat security middleware for API routes
 */

import { NextRequest, NextResponse } from 'next/server';

import { createServerSupabaseClient } from '@/lib/supabase/server';

import { createServerChatSecurity } from './security';

import type { Database } from '@/lib/database.types';
import type { User, SupabaseClient } from '@supabase/supabase-js';


// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// eslint-disable-next-line no-magic-numbers
export const DEFAULT_RATE_LIMIT = 60 as const;
// eslint-disable-next-line no-magic-numbers
export const DEFAULT_RATE_WINDOW_MS = 60_000 as const;

type AuthResult = {
  user: User;
  supabase: SupabaseClient<Database>;
};

type ConversationAccessResult = AuthResult & {
  security: ReturnType<typeof createServerChatSecurity>;
};

type HandlerContext = ConversationAccessResult & {
  params: Record<string, string>;
};

type AuthHandlerContext = AuthResult & {
  params: Record<string, string>;
};

/**
 * Middleware to check if user is authenticated
 */
export async function requireAuth(_request: NextRequest): Promise<NextResponse | AuthResult> {
  const supabase = createServerSupabaseClient();
  
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  return { user, supabase };
}

/**
 * Middleware to check if user can access a conversation
 */
export async function requireConversationAccess(
  request: NextRequest,
  conversationId: string
): Promise<NextResponse | ConversationAccessResult> {
  const authResult = await requireAuth(request);
  
  if (authResult instanceof NextResponse) {
    return authResult; // Return error response
  }

  const { user, supabase } = authResult;
  const security = createServerChatSecurity(supabase);

  const hasAccess = await security.isParticipant(conversationId, user.id);
  
  if (!hasAccess) {
    // Log security event
    console.warn('Chat Security Event:', {
      action: 'api_access_denied',
      userId: user.id,
      conversationId,
      timestamp: new Date().toISOString(),
      success: false,
      details: { reason: 'User not participant in conversation' },
    });

    return NextResponse.json(
      { error: 'Access denied to this conversation' },
      { status: 403 }
    );
  }

  return { user, supabase, security };
}

/**
 * Higher-order function to wrap API handlers with conversation access check
 */
export function withConversationAccess(
  handler: (
    request: NextRequest,
    context: HandlerContext
  ) => Promise<NextResponse>
) {
  return async (request: NextRequest, { params }: { params: Record<string, string> }) => {
    const conversationId = params.conversationId || params.id;
    
    if (!conversationId) {
      return NextResponse.json(
        { error: 'Conversation ID required' },
        { status: 400 }
      );
    }

    const accessResult = await requireConversationAccess(request, conversationId);
    
    if (accessResult instanceof NextResponse) {
      return accessResult; // Return error response
    }

    return handler(request, { ...accessResult, params });
  };
}

/**
 * Higher-order function to wrap API handlers with basic auth check
 */
export function withAuth(
  handler: (
    request: NextRequest,
    context: AuthHandlerContext
  ) => Promise<NextResponse>
) {
  return async (request: NextRequest, { params }: { params: Record<string, string> }) => {
    const authResult = await requireAuth(request);
    
    if (authResult instanceof NextResponse) {
      return authResult; // Return error response
    }

    return handler(request, { ...authResult, params });
  };
}

/**
 * Rate limiting for chat operations (basic implementation)
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  userId: string,
  action: string,
  limit: number = DEFAULT_RATE_LIMIT,
  windowMs: number = DEFAULT_RATE_WINDOW_MS
): boolean {
  const key = `${userId}:${action}`;
  const now = Date.now();
  const windowStart = now - windowMs;

  const record = rateLimitMap.get(key);
  
  if (!record || record.resetTime < windowStart) {
    rateLimitMap.set(key, { count: 1, resetTime: now });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count++;
  return true;
}