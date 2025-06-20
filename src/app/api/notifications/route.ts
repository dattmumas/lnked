import { NextRequest, NextResponse } from 'next/server';

import { HttpStatusCode } from '@/lib/constants/errors';
import { notificationService } from '@/lib/notifications/service';
import { createRequestScopedSupabaseClient } from '@/lib/supabase/request-scoped';
import { recordAPIMetrics, createMetricsTimer } from '@/lib/utils/metrics';
import { applyRateLimit } from '@/lib/utils/rate-limiting';
import { 
  notificationQuerySchema, 
  notificationActionSchema, 
  safeParseJson
} from '@/lib/utils/request-validation';
import { createAPILogger } from '@/lib/utils/structured-logger';

import type { NotificationFilters } from '@/types/notifications';

/**
 * Enhanced notifications API with enterprise-grade security and performance
 * Fixes: session context, rate limiting, validation, ownership, logging, metrics
 */

const ENDPOINT_NAME = '/api/notifications';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const logger = createAPILogger(req, ENDPOINT_NAME);
  const timer = createMetricsTimer();
  let userId: string | undefined;

  try {
    // 1. Session-aware Supabase client with proper context
    const supabase = createRequestScopedSupabaseClient(req);
    
    // 2. Authentication check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError !== null || user === null) {
      const duration = timer();
      recordAPIMetrics({
        endpoint: ENDPOINT_NAME,
        method: 'GET',
        statusCode: HttpStatusCode.Unauthorized,
        duration,
        error: 'Authentication failed',
      });
      
      logger.warn('Unauthorized notification access attempt', {
        statusCode: HttpStatusCode.Unauthorized,
        error: authError?.message,
      });
      
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: HttpStatusCode.Unauthorized }
      );
    }

    userId = user.id;

    // 3. Rate limiting (per-user and per-IP)
    const rateLimitResult = await applyRateLimit(req, userId);
    if (!rateLimitResult.allowed) {
      const duration = timer();
      recordAPIMetrics({
        endpoint: ENDPOINT_NAME,
        method: 'GET',
        statusCode: HttpStatusCode.TooManyRequests,
        duration,
        userId,
        error: 'Rate limit exceeded',
      });

      logger.warn('Rate limit exceeded for notifications fetch', {
        userId,
        statusCode: HttpStatusCode.TooManyRequests,
      });

      return NextResponse.json(
        { error: rateLimitResult.error },
        { 
          status: HttpStatusCode.TooManyRequests,
          headers: rateLimitResult.headers,
        }
      );
    }

    // 4. Query parameter validation with Zod (numeric validation, clamping)
    const { searchParams } = new URL(req.url);
    const queryValidation = notificationQuerySchema.safeParse({
      type: searchParams.get('type'),
      read: searchParams.get('read'),
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
    });

    if (!queryValidation.success) {
      const duration = timer();
      recordAPIMetrics({
        endpoint: ENDPOINT_NAME,
        method: 'GET',
        statusCode: HttpStatusCode.BadRequest,
        duration,
        userId,
        error: 'Invalid query parameters',
      });

      logger.warn('Invalid query parameters for notifications', {
        userId,
        statusCode: HttpStatusCode.BadRequest,
        error: 'Query validation failed',
      });

      return NextResponse.json(
        { 
          error: 'Invalid query parameters',
          details: queryValidation.error.errors,
        },
        { status: HttpStatusCode.BadRequest }
      );
    }

    const filters = queryValidation.data;

    // 5. User-scoped service call (ownership implicit via user context)
    const serviceFilters: NotificationFilters = {
      type: filters.type as typeof filters.type,
      read: filters.read,
      limit: filters.limit,
      offset: filters.offset,
    };
    const response = await notificationService.getNotifications(serviceFilters);

    const duration = timer();
    recordAPIMetrics({
      endpoint: ENDPOINT_NAME,
      method: 'GET',
      statusCode: HttpStatusCode.OK,
      duration,
      userId,
    });

    logger.info('Successfully fetched notifications', {
      userId,
      statusCode: HttpStatusCode.OK,
      duration,
      metadata: {
        count: response.notifications?.length ?? 0,
        filters: {
          type: filters.type,
          read: filters.read,
          limit: filters.limit,
          offset: filters.offset,
        },
      },
    });

    return NextResponse.json(response, {
      headers: rateLimitResult.headers,
    });

  } catch (error: unknown) {
    const duration = timer();
    recordAPIMetrics({
      endpoint: ENDPOINT_NAME,
      method: 'GET',
      statusCode: HttpStatusCode.InternalServerError,
      duration,
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    logger.error('Failed to fetch notifications', {
      userId,
      statusCode: HttpStatusCode.InternalServerError,
      duration,
      error: error instanceof Error ? error : new Error(String(error)),
    });

    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: HttpStatusCode.InternalServerError }
    );
  }
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const logger = createAPILogger(req, ENDPOINT_NAME);
  const timer = createMetricsTimer();
  let userId: string | undefined;

  try {
    // 1. Session-aware Supabase client
    const supabase = createRequestScopedSupabaseClient(req);
    
    // 2. Authentication check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError !== null || user === null) {
      const duration = timer();
      recordAPIMetrics({
        endpoint: ENDPOINT_NAME,
        method: 'PATCH',
        statusCode: HttpStatusCode.Unauthorized,
        duration,
        error: 'Authentication failed',
      });

      logger.warn('Unauthorized notification update attempt', {
        statusCode: HttpStatusCode.Unauthorized,
        error: authError?.message,
      });

      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: HttpStatusCode.Unauthorized }
      );
    }

    userId = user.id;

    // 3. Rate limiting
    const rateLimitResult = await applyRateLimit(req, userId);
    if (!rateLimitResult.allowed) {
      const duration = timer();
      recordAPIMetrics({
        endpoint: ENDPOINT_NAME,
        method: 'PATCH',
        statusCode: HttpStatusCode.TooManyRequests,
        duration,
        userId,
        error: 'Rate limit exceeded',
      });

      logger.warn('Rate limit exceeded for notification update', {
        userId,
        statusCode: HttpStatusCode.TooManyRequests,
      });

      return NextResponse.json(
        { error: rateLimitResult.error },
        { 
          status: HttpStatusCode.TooManyRequests,
          headers: rateLimitResult.headers,
        }
      );
    }

    // 4. Body validation with size limits and Zod schema
    const bodyValidation = await safeParseJson(req, notificationActionSchema);
    if (!bodyValidation.success) {
      const duration = timer();
      recordAPIMetrics({
        endpoint: ENDPOINT_NAME,
        method: 'PATCH',
        statusCode: HttpStatusCode.BadRequest,
        duration,
        userId,
        error: 'Invalid request body',
      });

      logger.warn('Invalid request body for notification update', {
        userId,
        statusCode: HttpStatusCode.BadRequest,
        error: bodyValidation.error,
      });

      return NextResponse.json(
        { error: bodyValidation.error },
        { status: HttpStatusCode.BadRequest }
      );
    }

    const { notification_ids } = bodyValidation.data;

    // 5. User-scoped service call with ownership check
    const result = await notificationService.markAsRead(notification_ids);

    if (result.success === null || result.success === undefined || result.success === false) {
      // 11. Distinguish between 404 (not found) and 400 (bad request)
      const statusCode = result.error !== null && result.error !== undefined && result.error.includes('not found') 
        ? HttpStatusCode.NotFound 
        : HttpStatusCode.BadRequest;

      const duration = timer();
      recordAPIMetrics({
        endpoint: ENDPOINT_NAME,
        method: 'PATCH',
        statusCode,
        duration,
        userId,
        error: 'Service operation failed',
      });

      logger.warn('Failed to mark notifications as read', {
        userId,
        statusCode,
        error: result.error,
        metadata: {
          requestedCount: notification_ids.length,
        },
      });

      return NextResponse.json(
        { 
          error: result.error,
        },
        { status: statusCode }
      );
    }

    const duration = timer();
    recordAPIMetrics({
      endpoint: ENDPOINT_NAME,
      method: 'PATCH',
      statusCode: HttpStatusCode.OK,
      duration,
      userId,
    });

    logger.info('Successfully marked notifications as read', {
      userId,
      statusCode: HttpStatusCode.OK,
      duration,
      metadata: {
        updatedCount: notification_ids.length,
      },
    });

    return NextResponse.json({ success: true }, {
      headers: rateLimitResult.headers,
    });

  } catch (error: unknown) {
    const duration = timer();
    recordAPIMetrics({
      endpoint: ENDPOINT_NAME,
      method: 'PATCH',
      statusCode: HttpStatusCode.InternalServerError,
      duration,
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    logger.error('Failed to update notifications', {
      userId,
      statusCode: HttpStatusCode.InternalServerError,
      duration,
      error: error instanceof Error ? error : new Error(String(error)),
    });

    return NextResponse.json(
      { error: 'Failed to mark notifications as read' },
      { status: HttpStatusCode.InternalServerError }
    );
  }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const logger = createAPILogger(req, ENDPOINT_NAME);
  const timer = createMetricsTimer();
  let userId: string | undefined;

  try {
    // Session-aware Supabase client, authentication, rate limiting, validation, service call
    // Similar pattern as PATCH but for deletion
    const supabase = createRequestScopedSupabaseClient(req);
    
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError !== null || user === null) {
      const duration = timer();
      recordAPIMetrics({
        endpoint: ENDPOINT_NAME,
        method: 'DELETE',
        statusCode: HttpStatusCode.Unauthorized,
        duration,
        error: 'Authentication failed',
      });

      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: HttpStatusCode.Unauthorized }
      );
    }

    userId = user.id;

    const rateLimitResult = await applyRateLimit(req, userId);
    if (!rateLimitResult.allowed) {
      const duration = timer();
      recordAPIMetrics({
        endpoint: ENDPOINT_NAME,
        method: 'DELETE',
        statusCode: HttpStatusCode.TooManyRequests,
        duration,
        userId,
        error: 'Rate limit exceeded',
      });

      return NextResponse.json(
        { error: rateLimitResult.error },
        { 
          status: HttpStatusCode.TooManyRequests,
          headers: rateLimitResult.headers,
        }
      );
    }

    const bodyValidation = await safeParseJson(req, notificationActionSchema);
    if (!bodyValidation.success) {
      const duration = timer();
      recordAPIMetrics({
        endpoint: ENDPOINT_NAME,
        method: 'DELETE',
        statusCode: HttpStatusCode.BadRequest,
        duration,
        userId,
        error: 'Invalid request body',
      });

      return NextResponse.json(
        { error: bodyValidation.error },
        { status: HttpStatusCode.BadRequest }
      );
    }

    const { notification_ids } = bodyValidation.data;

    const result = await notificationService.deleteNotifications(notification_ids);

    if (result.success === null || result.success === undefined || result.success === false) {
      const statusCode = result.error !== null && result.error !== undefined && result.error.includes('not found') 
        ? HttpStatusCode.NotFound 
        : HttpStatusCode.BadRequest;

      const duration = timer();
      recordAPIMetrics({
        endpoint: ENDPOINT_NAME,
        method: 'DELETE',
        statusCode,
        duration,
        userId,
        error: 'Service operation failed',
      });

      return NextResponse.json(
        { 
          error: result.error,
        },
        { status: statusCode }
      );
    }

    const duration = timer();
    recordAPIMetrics({
      endpoint: ENDPOINT_NAME,
      method: 'DELETE',
      statusCode: HttpStatusCode.OK,
      duration,
      userId,
    });

    logger.info('Successfully deleted notifications', {
      userId,
      statusCode: HttpStatusCode.OK,
      duration,
      metadata: {
        deletedCount: notification_ids.length,
      },
    });

    return NextResponse.json({ success: true }, {
      headers: rateLimitResult.headers,
    });

  } catch (error: unknown) {
    const duration = timer();
    recordAPIMetrics({
      endpoint: ENDPOINT_NAME,
      method: 'DELETE',
      statusCode: HttpStatusCode.InternalServerError,
      duration,
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    logger.error('Failed to delete notifications', {
      userId,
      statusCode: HttpStatusCode.InternalServerError,
      duration,
      error: error instanceof Error ? error : new Error(String(error)),
    });

    return NextResponse.json(
      { error: 'Failed to delete notifications' },
      { status: HttpStatusCode.InternalServerError }
    );
  }
} 