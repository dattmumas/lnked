import { createServerSupabaseClient } from '@/lib/supabase/server';

import type { SupabaseClient, User } from '@supabase/supabase-js';

// Standardized error messages (Issue #18)
export const ERROR_MESSAGES = {
  AUTH_REQUIRED: 'Authentication required. Please sign in to continue.',
  FORBIDDEN:
    'Access denied. You do not have permission to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  ALREADY_EXISTS: 'This resource already exists.',
  INVALID_INPUT:
    'Invalid input provided. Please check your data and try again.',
  INTERNAL_ERROR: 'An internal error occurred. Please try again later.',
  RATE_LIMITED: 'Too many requests. Please wait and try again.',
} as const;

// Common action result type
export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

// Authentication result type
export type AuthResult =
  | {
      success: true;
      user: User;
      supabase: SupabaseClient;
    }
  | {
      success: false;
      error: string;
    };

/**
 * Unified authentication helper for all server actions
 * Replaces duplicate auth boilerplate across action files
 */
export async function requireUser(): Promise<AuthResult> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError !== null || user === null) {
      return { success: false, error: ERROR_MESSAGES.AUTH_REQUIRED };
    }

    return { success: true, user, supabase };
  } catch (error) {
    console.error('Authentication error:', error);
    return { success: false, error: ERROR_MESSAGES.INTERNAL_ERROR };
  }
}

/**
 * Create a standardized action result
 */
export function createActionResult<T = void>(
  success: boolean,
  data?: T,
  error?: string,
): ActionResult<T> {
  return {
    success,
    ...(data !== undefined ? { data } : {}),
    ...(error !== undefined ? { error } : {}),
  };
}

/**
 * Create a success result
 */
export function createSuccessResult<T = void>(data?: T): ActionResult<T> {
  return createActionResult(true, data);
}

/**
 * Create an error result
 */
export function createErrorResult(error: string): ActionResult {
  return createActionResult(false, undefined, error);
}

/**
 * Validate that user owns or can edit a resource
 */
export function validateOwnership(
  resourceOwnerId: string,
  currentUserId: string,
  resourceType: string = 'resource',
): ActionResult {
  if (resourceOwnerId !== currentUserId) {
    return createErrorResult(
      `${ERROR_MESSAGES.FORBIDDEN} You can only modify your own ${resourceType}.`,
    );
  }
  return createSuccessResult();
}

/**
 * Generic reaction toggle helper (Issue #9)
 * Handles toggle logic for posts or any entity type
 */
export async function toggleReaction(
  supabase: SupabaseClient,
  config: {
    tableName: string;
    entityIdField: string;
    entityId: string;
    userId: string;
    reactionType: string;
    tenantId?: string;
  },
): Promise<ActionResult<{ isLiked: boolean; newCount: number }>> {
  const { tableName, entityIdField, entityId, userId, reactionType, tenantId } =
    config;

  try {
    // Check for existing reaction
    let existingQuery = supabase
      .from(tableName)
      .select('*')
      .eq(entityIdField, entityId)
      .eq('user_id', userId)
      .eq('type', reactionType);

    if (tenantId !== null && tenantId !== undefined) {
      existingQuery = existingQuery.eq('tenant_id', tenantId);
    }

    const { data: existingReaction, error: checkError } =
      await existingQuery.maybeSingle();

    if (checkError) {
      console.error(`Error checking existing ${reactionType}:`, checkError);
      return { success: false, error: ERROR_MESSAGES.INTERNAL_ERROR };
    }

    let isLiked: boolean;

    if (existingReaction) {
      // Remove existing reaction
      const { error: deleteError } = await supabase
        .from(tableName)
        .delete()
        .eq('id', existingReaction.id);

      if (deleteError) {
        console.error(`Error removing ${reactionType}:`, deleteError);
        return { success: false, error: ERROR_MESSAGES.INTERNAL_ERROR };
      }
      isLiked = false;
    } else {
      // Add new reaction
      const insertData: Record<string, string> = {
        [entityIdField]: entityId,
        user_id: userId,
        type: reactionType,
      };

      if (tenantId !== null && tenantId !== undefined) {
        insertData['tenant_id'] = tenantId;
      }

      if (entityId === null || entityId === undefined) {
        return { success: false, error: ERROR_MESSAGES.INVALID_INPUT };
      }

      const { error: insertError } = await supabase
        .from(tableName)
        .insert(insertData);

      if (insertError) {
        console.error(`Error adding ${reactionType}:`, insertError);
        return { success: false, error: ERROR_MESSAGES.INTERNAL_ERROR };
      }
      isLiked = true;
    }

    // Get updated count
    let countQuery = supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true })
      .eq(entityIdField, entityId)
      .eq('type', reactionType);

    if (tenantId !== null && tenantId !== undefined) {
      countQuery = countQuery.eq('tenant_id', tenantId);
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      console.error(`Error getting ${reactionType} count:`, countError);
      // Don't fail the operation for count errors
    }

    if (entityId === null || entityId === undefined) {
      return { success: false, error: ERROR_MESSAGES.INVALID_INPUT };
    }

    return {
      success: true,
      data: {
        isLiked,
        newCount: count ?? 0,
      },
    };
  } catch (error) {
    console.error(`Error toggling ${reactionType}:`, error);
    return { success: false, error: ERROR_MESSAGES.INTERNAL_ERROR };
  }
}
