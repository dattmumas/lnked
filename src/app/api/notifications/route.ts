import { NextRequest, NextResponse } from 'next/server';

import { HttpStatusCode } from '@/lib/constants/errors';
import { createNotificationService } from '@/lib/notifications/service';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { recordAPIMetrics, createMetricsTimer } from '@/lib/utils/metrics';
import { applyRateLimit } from '@/lib/utils/rate-limiting';
import { 
  notificationQuerySchema, 
  notificationActionSchema, 
  safeParseJson
} from '@/lib/utils/request-validation';
import { createAPILogger } from '@/lib/utils/structured-logger';

import type { NotificationFilters, NotificationType } from '@/types/notifications';

/**
 * Enhanced notifications API with enterprise-grade security and performance
 * Fixes: session context, rate limiting, validation, ownership, logging, metrics
 */

const ENDPOINT_NAME = '/api/notifications';

// Define request body interfaces
interface MarkReadRequestBody {
  notification_ids?: string[];
}

interface DeleteNotificationsRequestBody {
  notification_ids: string[];
}

/**
 * GET /api/notifications
 * Fetch notifications for the authenticated user
 */
export async function GET(request: NextRequest): Promise<Response> {
  const logger = createAPILogger(request, ENDPOINT_NAME);
  const timer = createMetricsTimer();
  let userId: string | undefined;

  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');
    const typeParam = searchParams.get('type');
    const readParam = searchParams.get('read');

    // Convert and validate parameters
    const limit = limitParam !== null ? parseInt(limitParam, 10) : undefined;
    const offset = offsetParam !== null ? parseInt(offsetParam, 10) : undefined;
    
    // Validate type parameter against allowed notification types
    const validTypes: NotificationType[] = [
      'follow', 'unfollow', 'post_like', 'post_comment', 'comment_reply', 
      'comment_like', 'post_published', 'collective_invite', 'collective_join', 
      'collective_leave', 'subscription_created', 'subscription_cancelled', 
      'mention', 'post_bookmark', 'featured_post'
    ];
    const type: NotificationType | undefined = typeParam !== null && validTypes.includes(typeParam as NotificationType) 
      ? typeParam as NotificationType 
      : undefined;
    
    let read: boolean | undefined;

    if (readParam !== null) {
      if (readParam === 'true') {
        read = true;
      } else if (readParam === 'false') {
        read = false;
      }
      // If readParam is not 'true' or 'false', leave read as undefined
    }

    // Validate numeric parameters
    if ((limitParam !== null && (isNaN(limit!) || limit! < 0)) ||
        (offsetParam !== null && (isNaN(offset!) || offset! < 0))) {
      const duration = timer();
      recordAPIMetrics({
        endpoint: ENDPOINT_NAME,
        method: 'GET',
        statusCode: HttpStatusCode.BadRequest,
        duration,
        userId,
        error: 'Invalid limit or offset parameter',
      });

      logger.warn('Invalid limit or offset parameter', {
        userId,
        statusCode: HttpStatusCode.BadRequest,
        error: 'Invalid limit or offset parameter',
      });

      return NextResponse.json(
        { error: 'Invalid limit or offset parameter' },
        { status: HttpStatusCode.BadRequest }
      );
    }

    // Build service filters
    const serviceFilters: NotificationFilters = {};
    if (limit !== undefined) serviceFilters.limit = limit;
    if (offset !== undefined) serviceFilters.offset = offset;
    if (type !== undefined) serviceFilters.type = type;
    if (read !== undefined) serviceFilters.read = read;

    const notificationService = createNotificationService();
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
          type: type,
          read: read,
          limit: limit,
          offset: offset,
        },
      },
    });

    return NextResponse.json(response);
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

/**
 * PATCH /api/notifications
 * Mark notifications as read
 */
export async function PATCH(request: NextRequest): Promise<Response> {
  const logger = createAPILogger(request, ENDPOINT_NAME);
  const timer = createMetricsTimer();
  let userId: string | undefined;

  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
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

    const body = (await request.json()) as MarkReadRequestBody;
    const { notification_ids } = body;

    // Validate notification IDs if provided
    if (notification_ids !== undefined) {
      if (!Array.isArray(notification_ids)) {
        const duration = timer();
        recordAPIMetrics({
          endpoint: ENDPOINT_NAME,
          method: 'PATCH',
          statusCode: HttpStatusCode.BadRequest,
          duration,
          userId,
          error: 'notification_ids must be an array',
        });

        logger.warn('Invalid notification_ids format', {
          userId,
          statusCode: HttpStatusCode.BadRequest,
          error: 'notification_ids must be an array',
        });

        return NextResponse.json(
          { error: 'notification_ids must be an array' },
          { status: HttpStatusCode.BadRequest }
        );
      }

      if (notification_ids.some(id => typeof id !== 'string' || id.trim() === '')) {
        const duration = timer();
        recordAPIMetrics({
          endpoint: ENDPOINT_NAME,
          method: 'PATCH',
          statusCode: HttpStatusCode.BadRequest,
          duration,
          userId,
          error: 'All notification IDs must be non-empty strings',
        });

        logger.warn('Invalid notification_ids format', {
          userId,
          statusCode: HttpStatusCode.BadRequest,
          error: 'All notification IDs must be non-empty strings',
        });

        return NextResponse.json(
          { error: 'All notification IDs must be non-empty strings' },
          { status: HttpStatusCode.BadRequest }
        );
      }
    }

    const notificationService = createNotificationService();
    const result = await notificationService.markAsRead(notification_ids);

    if (!result.success) {
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
          requestedCount: notification_ids?.length ?? 0,
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
        updatedCount: notification_ids?.length ?? 0,
      },
    });

    return NextResponse.json({ success: true });
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

    logger.error('Failed to mark notifications as read', {
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

/**
 * DELETE /api/notifications
 * Delete specific notifications
 */
export async function DELETE(request: NextRequest): Promise<Response> {
  const logger = createAPILogger(request, ENDPOINT_NAME);
  const timer = createMetricsTimer();
  let userId: string | undefined;

  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
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

    const body = (await request.json()) as DeleteNotificationsRequestBody;
    const { notification_ids } = body;

    // Validate required notification IDs
    if (!Array.isArray(notification_ids) || notification_ids.length === 0) {
      const duration = timer();
      recordAPIMetrics({
        endpoint: ENDPOINT_NAME,
        method: 'DELETE',
        statusCode: HttpStatusCode.BadRequest,
        duration,
        userId,
        error: 'notification_ids array is required and cannot be empty',
      });

      logger.warn('Invalid notification_ids format', {
        userId,
        statusCode: HttpStatusCode.BadRequest,
        error: 'notification_ids array is required and cannot be empty',
      });

      return NextResponse.json(
        { error: 'notification_ids array is required and cannot be empty' },
        { status: HttpStatusCode.BadRequest }
      );
    }

    if (notification_ids.some(id => typeof id !== 'string' || id.trim() === '')) {
      const duration = timer();
      recordAPIMetrics({
        endpoint: ENDPOINT_NAME,
        method: 'DELETE',
        statusCode: HttpStatusCode.BadRequest,
        duration,
        userId,
        error: 'All notification IDs must be non-empty strings',
      });

      logger.warn('Invalid notification_ids format', {
        userId,
        statusCode: HttpStatusCode.BadRequest,
        error: 'All notification IDs must be non-empty strings',
      });

      return NextResponse.json(
        { error: 'All notification IDs must be non-empty strings' },
        { status: HttpStatusCode.BadRequest }
      );
    }

    const notificationService = createNotificationService();
    const result = await notificationService.deleteNotifications(notification_ids);

    if (!result.success) {
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

    return NextResponse.json({ success: true });
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