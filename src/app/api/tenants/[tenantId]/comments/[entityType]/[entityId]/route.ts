// Tenant-Aware Comments API Route
// Provides tenant-scoped comment management with proper access control

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  createTenantErrorResponse,
  createTenantSuccessResponse,
} from '@/lib/api/tenant-helpers';
import { checkTenantAccessCached } from '@/lib/cache/tenant-cache';
import { commentsV2Service } from '@/lib/services/comments-v2';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  CommentEntityType,
  CommentValidationError,
  CommentPermissionError,
} from '@/types/comments-v2';

// =============================================================================
// CONSTANTS
// =============================================================================

const MIN_LIMIT = 1;
const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;
const MIN_OFFSET = 0;
const MIN_CONTENT_LENGTH = 1;
const MAX_CONTENT_LENGTH = 10000;
const HTTP_BAD_REQUEST = 400;
const HTTP_FORBIDDEN = 403;
const HTTP_INTERNAL_SERVER_ERROR = 500;
const HTTP_CREATED = 201;

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const CommentsQuerySchema = z.object({
  limit: z.coerce.number().min(MIN_LIMIT).max(MAX_LIMIT).default(DEFAULT_LIMIT),
  offset: z.coerce.number().min(MIN_OFFSET).default(MIN_OFFSET),
});

const CreateCommentSchema = z.object({
  content: z.string().min(MIN_CONTENT_LENGTH).max(MAX_CONTENT_LENGTH),
  parent_id: z.string().uuid().optional(),
});

// Valid entity types for tenant-scoped comments
const VALID_ENTITY_TYPES = ['video', 'post', 'collective', 'profile'] as const;

// =============================================================================
// GET TENANT COMMENTS
// =============================================================================

export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ tenantId: string; entityType: string; entityId: string }>;
  },
): Promise<NextResponse> {
  try {
    const { tenantId, entityType, entityId } = await params;
    const { searchParams } = new URL(request.url);

    // Validate query parameters
    const queryResult = CommentsQuerySchema.safeParse({
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
    });

    if (!queryResult.success) {
      return createTenantErrorResponse(
        `Invalid query parameters: ${queryResult.error.message}`,
        HTTP_BAD_REQUEST,
      );
    }

    // Validate entity type
    if (
      !VALID_ENTITY_TYPES.includes(
        entityType as (typeof VALID_ENTITY_TYPES)[number],
      )
    ) {
      return createTenantErrorResponse('Invalid entity type', HTTP_BAD_REQUEST);
    }

    const { limit, offset } = queryResult.data;

    // Check tenant access with caching
    const access = await checkTenantAccessCached(tenantId, 'member');
    if (!access.hasAccess) {
      return createTenantErrorResponse(access.error || 'Access denied', 403);
    }

    const supabase = await createServerSupabaseClient();

    // Verify entity belongs to tenant
    switch (entityType) {
    case 'post': {
      const { data: entityData, error: entityError } = await supabase
        .from('posts')
        .select('tenant_id')
        .eq('id', entityId)
        .single();

      if (entityError) {
        return createTenantErrorResponse(
          `Entity not found: ${entityError.message}`,
          404,
        );
      }

      if (entityData.tenant_id !== tenantId) {
        return createTenantErrorResponse(
          'Entity does not belong to this tenant',
          403,
        );
      }
    
    break;
    }
    case 'video': {
      const { data: entityData, error: entityError } = await supabase
        .from('video_assets')
        .select('collective_id')
        .eq('id', entityId)
        .single();

      if (entityError) {
        return createTenantErrorResponse(
          `Entity not found: ${entityError.message}`,
          404,
        );
      }

      if (entityData.collective_id !== tenantId) {
        return createTenantErrorResponse(
          'Entity does not belong to this tenant',
          403,
        );
      }
    
    break;
    }
    case 'collective': {
      // For collectives, the entityId should match the tenantId
      if (entityId !== tenantId) {
        return createTenantErrorResponse(
          'Entity does not belong to this tenant',
          403,
        );
      }
    
    break;
    }
    // No default
    }

    // Get comments using the existing service
    const page = Math.floor(offset / limit) + 1;
    const comments = await commentsV2Service.getComments(
      entityType as CommentEntityType,
      entityId,
      page,
      limit,
    );

    // Get total comment count
    const totalCount = await commentsV2Service.getCommentCount(
      entityType as CommentEntityType,
      entityId,
    );

    return createTenantSuccessResponse({
      comments,
      pagination: {
        limit,
        offset,
        total: totalCount,
        has_more: comments.length === limit,
      },
      meta: {
        tenant_id: tenantId,
        entity_type: entityType,
        entity_id: entityId,
        user_role: access.userRole,
      },
    });
  } catch (error) {
    console.error('Error in tenant comments GET:', error);
    if (error instanceof CommentValidationError) {
      return createTenantErrorResponse(error.message, HTTP_BAD_REQUEST);
    }
    return createTenantErrorResponse(
      'Internal server error',
      HTTP_INTERNAL_SERVER_ERROR,
    );
  }
}

// =============================================================================
// CREATE COMMENT IN TENANT
// =============================================================================

export async function POST(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ tenantId: string; entityType: string; entityId: string }>;
  },
): Promise<NextResponse> {
  try {
    const { tenantId, entityType, entityId } = await params;
    const body = await request.json();

    // Validate entity type
    if (
      !VALID_ENTITY_TYPES.includes(
        entityType as (typeof VALID_ENTITY_TYPES)[number],
      )
    ) {
      return createTenantErrorResponse('Invalid entity type', HTTP_BAD_REQUEST);
    }

    // Validate request body
    const validationResult = CreateCommentSchema.safeParse(body);
    if (!validationResult.success) {
      return createTenantErrorResponse(
        `Invalid request data: ${validationResult.error.message}`,
        HTTP_BAD_REQUEST,
      );
    }

    const { content, parent_id } = validationResult.data;

    // Check tenant access with caching
    const access = await checkTenantAccessCached(tenantId, 'member');
    if (!access.hasAccess) {
      return createTenantErrorResponse(access.error || 'Access denied', 403);
    }

    const supabase = await createServerSupabaseClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return createTenantErrorResponse('Authentication required', 401);
    }

    // Verify entity belongs to tenant
    switch (entityType) {
    case 'post': {
      const { data: entityData, error: entityError } = await supabase
        .from('posts')
        .select('tenant_id')
        .eq('id', entityId)
        .single();

      if (entityError) {
        return createTenantErrorResponse(
          `Entity not found: ${entityError.message}`,
          404,
        );
      }

      if (entityData.tenant_id !== tenantId) {
        return createTenantErrorResponse(
          'Entity does not belong to this tenant',
          403,
        );
      }
    
    break;
    }
    case 'video': {
      const { data: entityData, error: entityError } = await supabase
        .from('video_assets')
        .select('collective_id')
        .eq('id', entityId)
        .single();

      if (entityError) {
        return createTenantErrorResponse(
          `Entity not found: ${entityError.message}`,
          404,
        );
      }

      if (entityData.collective_id !== tenantId) {
        return createTenantErrorResponse(
          'Entity does not belong to this tenant',
          403,
        );
      }
    
    break;
    }
    case 'collective': {
      // For collectives, the entityId should match the tenantId
      if (entityId !== tenantId) {
        return createTenantErrorResponse(
          'Entity does not belong to this tenant',
          403,
        );
      }
    
    break;
    }
    // No default
    }

    // If replying to a comment, verify parent comment exists and belongs to same entity
    if (parent_id !== null && parent_id !== undefined) {
      const { data: parentComment, error: parentError } = await supabase
        .from('comments')
        .select('entity_type, entity_id')
        .eq('id', parent_id)
        .single();

      if (parentError) {
        return createTenantErrorResponse('Parent comment not found', 404);
      }

      if (
        (parentComment.entity_type !== null &&
          parentComment.entity_type !== undefined &&
          parentComment.entity_type !== entityType) ||
        (parentComment.entity_id !== null &&
          parentComment.entity_id !== undefined &&
          parentComment.entity_id !== entityId)
      ) {
        return createTenantErrorResponse(
          'Parent comment does not belong to this entity',
          400,
        );
      }
    }

    // Create the comment using the existing service
    const newComment = await commentsV2Service.addComment(
      entityType as CommentEntityType,
      entityId,
      user.id,
      content,
      parent_id,
    );

    if (!newComment) {
      return createTenantErrorResponse(
        'Failed to create comment',
        HTTP_INTERNAL_SERVER_ERROR,
      );
    }

    return createTenantSuccessResponse(
      {
        comment: newComment,
        message: 'Comment created successfully',
      },
      HTTP_CREATED,
    );
  } catch (error) {
    console.error('Error in tenant comments POST:', error);
    if (error instanceof CommentValidationError) {
      return createTenantErrorResponse(error.message, HTTP_BAD_REQUEST);
    }
    if (error instanceof CommentPermissionError) {
      return createTenantErrorResponse(error.message, HTTP_FORBIDDEN);
    }
    return createTenantErrorResponse(
      'Internal server error',
      HTTP_INTERNAL_SERVER_ERROR,
    );
  }
}
