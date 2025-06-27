import { z } from 'zod';

/**
 * Request validation utilities for API endpoints
 * Provides comprehensive validation with security limits
 */

// Environment-driven constants with safe defaults
const NOTIFICATION_PAGE_LIMIT_MAX = parseInt(process.env['NOTIF_PAGE_LIMIT_MAX'] || '100', 10);
const NOTIFICATION_PAGE_OFFSET_MAX = parseInt(process.env['NOTIF_PAGE_OFFSET_MAX'] || '10000', 10);
const NOTIFICATION_MAX_IDS_PER_REQUEST = parseInt(process.env['NOTIF_MAX_IDS_PER_REQUEST'] || '50', 10);
const MAX_REQUEST_BODY_SIZE = parseInt(process.env['MAX_REQUEST_BODY_SIZE'] || '1048576', 10); // 1MB
const DEFAULT_NOTIFICATION_LIMIT = 20;

// Notification type enum (should match database enum)
const notificationTypeEnum = z.enum([
  'follow',
  'like',
  'comment',
  'mention',
  'post_published',
  'collective_invitation',
  'system',
] as const);

/**
 * Query parameters validation for GET /api/notifications
 */
export const notificationQuerySchema = z.object({
  type: notificationTypeEnum.optional(),
  read: z.enum(['true', 'false']).optional().transform(val => 
    val === 'true' ? true : val === 'false' ? false : undefined
  ),
  limit: z.string().optional().transform((val, ctx) => {
    if (val === undefined || val === null) return DEFAULT_NOTIFICATION_LIMIT; // Default
    const parsed = parseInt(val, 10);
    if (isNaN(parsed)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'limit must be a valid number',
      });
      return z.NEVER;
    }
    return Math.max(1, Math.min(parsed, NOTIFICATION_PAGE_LIMIT_MAX));
  }),
  offset: z.string().optional().transform((val, ctx) => {
    if (val === undefined || val === null) return 0; // Default
    const parsed = parseInt(val, 10);
    if (isNaN(parsed)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'offset must be a valid number',
      });
      return z.NEVER;
    }
    return Math.max(0, Math.min(parsed, NOTIFICATION_PAGE_OFFSET_MAX));
  }),
});

/**
 * Request body validation for PATCH/DELETE operations
 */
export const notificationActionSchema = z.object({
  notification_ids: z.array(z.string().uuid('Invalid notification ID format'))
    .min(1, 'At least one notification ID is required')
    .max(NOTIFICATION_MAX_IDS_PER_REQUEST, `Maximum ${NOTIFICATION_MAX_IDS_PER_REQUEST} notification IDs allowed per request`)
    .refine(
      (ids) => new Set(ids).size === ids.length,
      'Duplicate notification IDs are not allowed'
    ),
});

/**
 * Parsed query parameters type
 */
export type NotificationQuery = z.infer<typeof notificationQuerySchema>;

/**
 * Parsed action body type
 */
export type NotificationAction = z.infer<typeof notificationActionSchema>;

/**
 * Validates request body size before parsing
 */
export function validateRequestSize(request: Request): { valid: boolean; error?: string } {
  const contentLength = request.headers.get('content-length');
  
  if (contentLength === null) {
    return { valid: false, error: 'Content-Length header is required' };
  }
  
  const size = parseInt(contentLength, 10);
  
  if (isNaN(size)) {
    return { valid: false, error: 'Invalid Content-Length header' };
  }
  
  if (size > MAX_REQUEST_BODY_SIZE) {
    return { 
      valid: false, 
      error: `Request body too large. Maximum size: ${MAX_REQUEST_BODY_SIZE} bytes` 
    };
  }
  
  return { valid: true };
}

/**
 * Safe JSON parsing with size validation
 */
export async function safeParseJson<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  // Validate size first
  const sizeCheck = validateRequestSize(request);
  if (!sizeCheck.valid) {
    return { success: false, error: sizeCheck.error ?? 'Invalid request size' };
  }
  
  try {
    const body = await request.json() as unknown;
    const result = schema.safeParse(body);
    
    if (!result.success) {
      const errorMessages = result.error.errors
        .map(err => `${err.path.join('.')}: ${err.message}`)
        .join(', ');
      return { success: false, error: `Validation failed: ${errorMessages}` };
    }
    
    return { success: true, data: result.data };
  } catch {
    return { success: false, error: 'Invalid JSON in request body' };
  }
}

/**
 * Constants for external use
 */
export const VALIDATION_CONSTANTS = {
  NOTIFICATION_PAGE_LIMIT_MAX,
  NOTIFICATION_PAGE_OFFSET_MAX,
  NOTIFICATION_MAX_IDS_PER_REQUEST,
  MAX_REQUEST_BODY_SIZE,
} as const; 