import crypto from 'node:crypto';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { supabaseAdmin } from '@/lib/supabaseAdmin';

// ─────────────────────────────────────────────────────────────────────────────
// Build-time Environment Validation - Fix #1
// ─────────────────────────────────────────────────────────────────────────────

const WebhookEnvSchema = z.object({
  MUX_WEBHOOK_SECRET: z.string().min(1, 'MUX_WEBHOOK_SECRET is required'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('error'),
});

// Validate at module load time to fail fast - prevents 500s on every request
const env = WebhookEnvSchema.parse(process.env);

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

// HTTP Status Codes
const HTTP_STATUS_UNAUTHORIZED = 401;
const HTTP_STATUS_BAD_REQUEST = 400;
const HTTP_STATUS_REQUEST_ENTITY_TOO_LARGE = 413;
const HTTP_STATUS_INTERNAL_SERVER_ERROR = 500;

// Security Configuration
const BYTES_PER_KB = 1024;
const MAX_WEBHOOK_BODY_SIZE_BYTES = BYTES_PER_KB * BYTES_PER_KB; // 1MB - Fix #13
const TIMESTAMP_TOLERANCE_SECONDS = 300; // 5 minutes - Fix #2
const SIGNATURE_HEADER_PRIMARY = 'mux-signature'; // Fix #3 - case insensitive
const SIGNATURE_HEADER_FALLBACK = 'Mux-Signature';

// Signature parsing constants
const SIGNATURE_TIMESTAMP_PREFIX_LENGTH = 2; // 't='.length
const SIGNATURE_V1_PREFIX_LENGTH = 3; // 'v1='.length
const MILLISECONDS_TO_SECONDS = 1000;
const DEBUG_RECORD_LIMIT = 5;

// Database Configuration
const UPDATE_LIMIT = 1; // Fix #6 - concurrency control

// Log truncation lengths for security
const LOG_TRUNCATE_SIGNATURE = 16;
const LOG_TRUNCATE_HEADER = 50;

// ─────────────────────────────────────────────────────────────────────────────
// Structured Logging - Fix #4
// ─────────────────────────────────────────────────────────────────────────────

interface LogContext {
  timestamp: string;
  service: string;
  operation: string;
  webhook_type?: string;
  [key: string]: unknown;
}

interface StructuredLogger {
  error: (message: string, context?: Record<string, unknown>) => void;
  warn: (message: string, context?: Record<string, unknown>) => void;
  info: (message: string, context?: Record<string, unknown>) => void;
  debug: (message: string, context?: Record<string, unknown>) => void;
}

class WebhookLogger implements StructuredLogger {
  private shouldLog(level: string): boolean {
    const levels = ['error', 'warn', 'info', 'debug'];
    const currentLevel = env.LOG_LEVEL;
    return levels.indexOf(level) <= levels.indexOf(currentLevel);
  }

  private formatLog(level: string, message: string, context?: Record<string, unknown>): LogContext {
    return {
      timestamp: new Date().toISOString(),
      service: 'mux-webhook-api',
      operation: 'webhook_processing',
      level,
      message,
      // Sanitize PII and sensitive data - Fix #12
      ...this.sanitizeContext(context),
    };
  }

  private sanitizeContext(context?: Record<string, unknown>): Record<string, unknown> {
    if (context === undefined) return {};
    
    const sanitized = { ...context };
    
    // Redact sensitive fields - Fix #12
    if ('webhook_secret' in sanitized) sanitized['webhook_secret'] = '[REDACTED]';
    if ('signature' in sanitized) sanitized['signature'] = '[REDACTED]';
    if ('video_records' in sanitized) sanitized['video_records'] = '[REDACTED]';
    if ('raw_body' in sanitized) sanitized['raw_body'] = '[REDACTED]';
    
    return sanitized;
  }

  error(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('error')) {
      console.error(JSON.stringify(this.formatLog('error', message, context)));
    }
  }

  warn(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('warn')) {
      console.warn(JSON.stringify(this.formatLog('warn', message, context)));
    }
  }

  info(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('info')) {
      // Using console.warn for info level to comply with ESLint no-console rules
      console.warn(JSON.stringify(this.formatLog('info', message, context)));
    }
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('debug')) {
      console.warn(JSON.stringify(this.formatLog('debug', message, context)));
    }
  }
}

const logger = new WebhookLogger();

// ─────────────────────────────────────────────────────────────────────────────
// Webhook Payload Validation - Fix #13
// ─────────────────────────────────────────────────────────────────────────────

const WebhookPayloadSchema = z.object({
  type: z.string().min(1),
  data: z.object({
    id: z.string().min(1),
  }).passthrough(), // Allow additional fields
});

// ─────────────────────────────────────────────────────────────────────────────
// Optimized Buffer Cache - Fix #5
// ─────────────────────────────────────────────────────────────────────────────

const webhookSecretBuffer = Buffer.from(env.MUX_WEBHOOK_SECRET, 'utf8');

// ─────────────────────────────────────────────────────────────────────────────
// Webhook Handler Router - Fix #15
// ─────────────────────────────────────────────────────────────────────────────

async function routeWebhookHandler(
  type: string, 
  data: Record<string, unknown>, 
  timestamp: string
): Promise<void> {
  switch (type) {
    case 'video.asset.ready':
      logger.info('Routing to asset ready handler', { webhook_type: type });
      await handleAssetReady(data as {
        id: string;
        status: string;
        duration?: number;
        aspect_ratio?: string;
        playback_ids?: Array<{ id: string; policy: string }>;
        upload_id?: string;
      }, timestamp);
      break;
    case 'video.upload.asset_created':
      logger.info('Routing to upload asset created handler', { webhook_type: type });
      await handleUploadAssetCreated(data as {
        id: string;
        upload_id: string;
        status?: string;
      }, timestamp);
      break;
    case 'video.asset.errored':
      logger.info('Routing to asset errored handler', { webhook_type: type });
      await handleAssetErrored(data as {
        id: string;
        errors?: Array<{ type: string; messages: string[] }>;
        upload_id?: string;
      }, timestamp);
      break;
    case 'video.upload.errored':
      logger.info('Routing to upload errored handler', { webhook_type: type });
      await handleUploadErrored(data as {
        id: string;
        error?: { type: string; message: string };
      }, timestamp);
      break;
    case 'video.upload.cancelled':
      logger.info('Routing to upload cancelled handler', { webhook_type: type });
      await handleUploadCancelled(data as {
        id: string;
      }, timestamp);
      break;
    default:
      logger.warn('Unhandled webhook type', { webhook_type: type });
      // Don't throw error for unknown types - just log and continue
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Enhanced Signature Verification - Fix #2, #3, #5
// ─────────────────────────────────────────────────────────────────────────────

interface SignatureVerificationResult {
  isValid: boolean;
  reason?: string;
  timestampAge?: number;
}

/**
 * Verify MUX webhook signature with replay attack prevention
 * Following: https://docs.mux.com/guides/video/verify-webhook-signatures
 */
function isValidMuxSignature(
  rawBody: string, 
  header: string, 
  _currentTime: string
): SignatureVerificationResult {
  logger.debug('Starting signature verification');
  
  try {
    // MUX signature format: "t=timestamp,v1=signature"
    const parts = header.split(',');
    
    const timestamp = parts.find(p => p.startsWith('t='))?.slice(SIGNATURE_TIMESTAMP_PREFIX_LENGTH);
    const signature = parts.find(p => p.startsWith('v1='))?.slice(SIGNATURE_V1_PREFIX_LENGTH);

    if (timestamp === undefined || timestamp.trim().length === 0) {
      return { 
        isValid: false, 
        reason: 'Missing timestamp in signature header' 
      };
    }

    if (signature === undefined || signature.trim().length === 0) {
      return { 
        isValid: false, 
        reason: 'Missing signature in header' 
      };
    }

    // Fix #2: Replay attack prevention - check timestamp tolerance
    const webhookTimestamp = parseInt(timestamp, 10);
    const currentTimestamp = Math.floor(Date.now() / MILLISECONDS_TO_SECONDS);
    const timestampAge = currentTimestamp - webhookTimestamp;
    
    if (timestampAge > TIMESTAMP_TOLERANCE_SECONDS) {
      return {
        isValid: false,
        reason: 'Timestamp too old - possible replay attack',
        timestampAge,
      };
    }

    // Create the signed payload by concatenating timestamp and body
    const payload = `${timestamp}.${rawBody}`;
    
    // Fix #5: Use cached buffer for performance
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecretBuffer)
      .update(payload)
      .digest('hex');

    logger.debug('Signature comparison', {
      expected_preview: expectedSignature.substring(0, LOG_TRUNCATE_SIGNATURE),
      received_preview: signature.substring(0, LOG_TRUNCATE_SIGNATURE),
      timestamp_age_seconds: timestampAge,
    });

    // Timing-safe comparison with optimized buffers
    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(signature, 'hex')
    );
    
    return {
      isValid,
      timestampAge,
      ...(isValid ? {} : { reason: 'Signature mismatch' }),
    };
  } catch (error: unknown) {
    logger.error('Signature verification error', {
      error_message: error instanceof Error ? error.message : String(error),
    });
    return { 
      isValid: false, 
      reason: 'Signature verification failed due to error' 
    };
  }
}

/**
 * POST /api/mux-webhook
 * MUX webhook handler with comprehensive security validation
 * Following: https://docs.mux.com/guides/video/verify-webhook-signatures
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const now = new Date().toISOString(); // Fix #17 - reuse timestamp
  
  try {
    logger.info('Webhook request received', { 
      method: request.method,
      content_length: request.headers.get('content-length'),
    });

    // Fix #13: Content length validation before reading body
    const contentLengthHeader = request.headers.get('content-length');
    if (contentLengthHeader !== null) {
      const contentLength = parseInt(contentLengthHeader, 10);
      if (contentLength > MAX_WEBHOOK_BODY_SIZE_BYTES) {
        logger.warn('Request body too large', { 
          content_length: contentLength,
          max_allowed: MAX_WEBHOOK_BODY_SIZE_BYTES 
        });
        return NextResponse.json(
          { error: 'Request body too large' },
          { status: HTTP_STATUS_REQUEST_ENTITY_TOO_LARGE }
        );
      }
    }

    // Get the raw body for signature verification
    const rawBody = await request.text();
    
    if (rawBody.length > MAX_WEBHOOK_BODY_SIZE_BYTES) {
      logger.warn('Request body exceeds size limit', { 
        body_length: rawBody.length,
        max_allowed: MAX_WEBHOOK_BODY_SIZE_BYTES 
      });
      return NextResponse.json(
        { error: 'Request body too large' },
        { status: HTTP_STATUS_REQUEST_ENTITY_TOO_LARGE }
      );
    }

    // Fix #3: Case-insensitive header check
    const signatureHeader = 
      request.headers.get(SIGNATURE_HEADER_PRIMARY) ?? 
      request.headers.get(SIGNATURE_HEADER_FALLBACK);
      
    if (signatureHeader === null || signatureHeader.trim().length === 0) {
      logger.warn('Missing webhook signature header');
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: HTTP_STATUS_UNAUTHORIZED }
      );
    }

    logger.debug('Signature header found', {
      header_preview: signatureHeader.substring(0, LOG_TRUNCATE_HEADER),
    });

    // Verify the signature with timestamp tolerance
    const signatureResult = isValidMuxSignature(rawBody, signatureHeader, now);
    if (!signatureResult.isValid) {
      logger.warn('Webhook signature verification failed', {
        reason: signatureResult.reason,
        timestamp_age_seconds: signatureResult.timestampAge,
      });
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: HTTP_STATUS_UNAUTHORIZED }
      );
    }

    logger.info('Webhook signature verified successfully');

    // Parse and validate the webhook payload
    let webhookPayload: z.infer<typeof WebhookPayloadSchema>;
    try {
      const rawPayload = JSON.parse(rawBody) as unknown;
      webhookPayload = WebhookPayloadSchema.parse(rawPayload);
    } catch (parseError: unknown) {
      logger.error('Invalid webhook payload', {
        error_message: parseError instanceof Error ? parseError.message : String(parseError),
        body_length: rawBody.length,
      });
      return NextResponse.json(
        { error: 'Invalid webhook payload' },
        { status: HTTP_STATUS_BAD_REQUEST }
      );
    }

    const { type, data } = webhookPayload;
    
    logger.info('Webhook payload validated', {
      webhook_type: type,
      data_id: data.id,
    });

    // Route to appropriate handler with error handling - Fix #15
    try {
      await routeWebhookHandler(type, data, now);
      
      const processingTime = Date.now() - startTime;
      logger.info('Webhook processing completed successfully', {
        webhook_type: type,
        processing_time_ms: processingTime,
      });

      return NextResponse.json({ message: 'ok' });
    } catch (handlerError: unknown) {
      // Fix #15: Don't swallow handler errors
      const processingTime = Date.now() - startTime;
      logger.error('Webhook handler failed', {
        webhook_type: type,
        processing_time_ms: processingTime,
        error_message: handlerError instanceof Error ? handlerError.message : String(handlerError),
        error_stack: handlerError instanceof Error ? handlerError.stack : undefined,
      });
      
      // Return 500 to trigger external alerts and retries
      return NextResponse.json({
        error: 'Webhook processing failed',
      }, { status: HTTP_STATUS_INTERNAL_SERVER_ERROR });
    }
  } catch (error: unknown) {
    const processingTime = Date.now() - startTime;
    logger.error('Critical webhook processing error', {
      processing_time_ms: processingTime,
      error_message: error instanceof Error ? error.message : String(error),
      error_stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: HTTP_STATUS_INTERNAL_SERVER_ERROR }
    );
  }
}

/**
 * Handle asset ready webhook - update database with MUX asset info
 */
async function handleAssetReady(data: {
  id: string;
  status: string;
  duration?: number;
  aspect_ratio?: string;
  playback_ids?: Array<{ id: string; policy: string }>;
  upload_id?: string;
}, timestamp: string): Promise<void> {
  logger.info('Asset ready handler started', {
    asset_id: data.id,
    upload_id: data.upload_id,
    status: data.status,
    duration: data.duration,
    aspect_ratio: data.aspect_ratio,
    playback_ids_count: data.playback_ids?.length ?? 0,
  });

  const supabase = supabaseAdmin;

  try {
    // Fix #8: Policy-aware playbook ID selection instead of taking first
    const publicPlaybackId = data.playback_ids?.find(p => p.policy === 'public')?.id;
    const signedPlaybackId = data.playback_ids?.find(p => p.policy === 'signed')?.id;
    
    // Prefer public, fallback to signed, then first available
    const playbackId = publicPlaybackId ?? signedPlaybackId ?? data.playback_ids?.[0]?.id ?? null;
    const playbackPolicy = publicPlaybackId !== undefined ? 'public' : 
                          signedPlaybackId !== undefined ? 'signed' : 
                          data.playback_ids?.[0]?.policy ?? 'public';
    
    logger.debug('Playback ID selection', {
      public_id: publicPlaybackId,
      signed_id: signedPlaybackId,
      selected_id: playbackId,
      selected_policy: playbackPolicy,
    });
    
    // Fix #9: Only update changed fields, not all columns
    const updateData: Record<string, unknown> = {
      updated_at: timestamp,
    };
    
    // Only include fields that have actual values
    if (data.status !== undefined) updateData['status'] = data.status;
    if (data.duration !== undefined) updateData['duration'] = data.duration;
    if (data.aspect_ratio !== undefined) updateData['aspect_ratio'] = data.aspect_ratio;
    if (playbackId !== null) updateData['mux_playback_id'] = playbackId;
    if (playbackPolicy !== undefined) updateData['playback_policy'] = playbackPolicy;
    updateData['processed_at'] = timestamp;

    logger.debug('Update data prepared', {
      fields_to_update: Object.keys(updateData),
    });

    // Fix #6: Add concurrency control with limit(1)
    // Primary approach: Update by mux_asset_id
    const { data: updateResult, error: updateError } = await supabase
      .from('video_assets')
      .update(updateData)
      .eq('mux_asset_id', data.id)
      .limit(UPDATE_LIMIT)
      .select('id');

    if (updateError !== null) {
      // Fix #15: Throw instead of swallowing errors
      logger.error('Database error during primary update', {
        error_message: updateError.message,
        asset_id: data.id,
      });
      throw new Error(`Asset ready primary update failed: ${updateError.message}`);
    }

    logger.debug('Primary update result', {
      rows_affected: updateResult?.length ?? 0,
    });

    // Check if we actually updated a row
    if (updateResult === null || updateResult.length === 0) {
      logger.info('No rows updated by asset_id, trying upload_id fallback');
      
      // Fallback: Try to find by upload_id if asset_id didn't match
      if (data.upload_id !== undefined && data.upload_id.trim().length > 0) {
        logger.debug('Upload ID available, attempting fallback update');
        
        // Fix #6: Add concurrency control with limit(1) for fallback too
        const { data: fallbackResult, error: fallbackError } = await supabase
          .from('video_assets')
          .update({
            ...updateData,
            mux_asset_id: data.id, // Also set the asset_id since it's missing
          })
          .eq('mux_upload_id', data.upload_id)
          .limit(UPDATE_LIMIT)
          .select('id');

        if (fallbackError !== null) {
          logger.error('Database error during fallback update', {
            error_message: fallbackError.message,
            upload_id: data.upload_id,
          });
          throw new Error(`Asset ready fallback update failed: ${fallbackError.message}`);
        }

        logger.debug('Fallback update result', {
          rows_affected: fallbackResult?.length ?? 0,
        });

        if (fallbackResult === null || fallbackResult.length === 0) {
          const errorMessage = `No matching video record found for asset: ${data.id}`;
          logger.error('Asset not found in database', {
            asset_id: data.id,
            upload_id: data.upload_id,
          });
          throw new Error(errorMessage);
        }

        logger.info('Asset ready processed via upload_id fallback');
      } else {
        const errorMessage = `No upload_id available for asset: ${data.id}`;
        logger.error('Asset fallback not possible', {
          asset_id: data.id,
          has_upload_id: data.upload_id !== undefined,
        });
        throw new Error(errorMessage);
      }
    } else {
      logger.info('Asset ready processed via primary path');
    }

    logger.info('Asset ready handler completed successfully', {
      asset_id: data.id,
      status: data.status,
    });
  } catch (error: unknown) {
    logger.error('Asset ready handler error', {
      asset_id: data.id,
      error_message: error instanceof Error ? error.message : String(error),
      error_stack: error instanceof Error ? error.stack : undefined,
    });
    // Re-throw to trigger proper error handling in main handler
    throw error;
  }
}

/**
 * Handle upload asset created webhook - link upload to asset
 */
async function handleUploadAssetCreated(data: {
  id: string;
  upload_id: string;
  status?: string;
}, timestamp: string): Promise<void> {
  logger.info('Upload asset created handler started', {
    asset_id: data.id,
    upload_id: data.upload_id,
    status: data.status,
  });

  const supabase = supabaseAdmin;

  try {
    logger.debug('Preparing update data for upload-asset link');
    
    // The data contains the new asset that was created from the upload
    // data.id is the asset ID, data.upload_id is the original upload ID
    
    // Fix #9: Only update necessary fields
    const updateData: Record<string, unknown> = {
      mux_asset_id: data.id, // This is the actual asset ID
      status: 'processing',
      updated_at: timestamp,
    };

    logger.debug('Update data prepared', {
      asset_id: data.id,
      upload_id: data.upload_id,
    });
    
    // Fix #6: Add concurrency control with limit(1)
    const { data: updateResult, error: updateError } = await supabase
      .from('video_assets')
      .update(updateData)
      .eq('mux_upload_id', data.upload_id)
      .limit(UPDATE_LIMIT)
      .select('id');

    if (updateError !== null) {
      // Fix #15: Throw instead of swallowing errors
      logger.error('Database error during upload-asset link', {
        error_message: updateError.message,
        upload_id: data.upload_id,
        asset_id: data.id,
      });
      throw new Error(`Upload asset created update failed: ${updateError.message}`);
    }

    logger.debug('Upload-asset link result', {
      rows_affected: updateResult?.length ?? 0,
    });

    if (updateResult === null || updateResult.length === 0) {
      // Fix #12: Don't log sensitive table data in production
      if (env.NODE_ENV === 'development') {
        logger.debug('No matching upload found, attempting to find existing records');
        
        const { data: existingRecords, error: searchError } = await supabase
          .from('video_assets')
          .select('id, mux_upload_id, mux_asset_id, status, created_at')
          .order('created_at', { ascending: false })
          .limit(DEBUG_RECORD_LIMIT);
        
        if (searchError !== null) {
          logger.debug('Error searching for existing records', {
            error_message: searchError.message,
          });
        } else {
          logger.debug('Recent video records found', {
            record_count: existingRecords?.length ?? 0,
          });
        }
      }

      const errorMessage = `No matching upload found for upload_id: ${data.upload_id}`;
      logger.error('Upload record not found', {
        upload_id: data.upload_id,
        asset_id: data.id,
      });
      throw new Error(errorMessage);
    }

    logger.info('Upload asset created handler completed successfully', {
      asset_id: data.id,
      upload_id: data.upload_id,
    });
  } catch (error: unknown) {
    logger.error('Upload asset created handler error', {
      asset_id: data.id,
      upload_id: data.upload_id,
      error_message: error instanceof Error ? error.message : String(error),
      error_stack: error instanceof Error ? error.stack : undefined,
    });
    // Re-throw to trigger proper error handling in main handler
    throw error;
  }
}

/**
 * Handle asset errored webhook - mark video as errored
 */
async function handleAssetErrored(data: {
  id: string;
  errors?: Array<{ type: string; messages: string[] }>;
  upload_id?: string;
}, timestamp: string): Promise<void> {
  logger.info('Asset errored handler started', {
    asset_id: data.id,
    upload_id: data.upload_id,
    error_count: data.errors?.length ?? 0,
  });

  const supabase = supabaseAdmin;

  try {
    logger.debug('Preparing error data for asset');
    
    // Extract error information
    const errorDetails = {
      type: 'asset_error',
      errors: data.errors ?? [],
      asset_id: data.id,
      timestamp,
    };

    // Fix #9: Only update necessary fields
    const updateData: Record<string, unknown> = {
      status: 'errored' as const,
      error_details: errorDetails,
      updated_at: timestamp,
    };

    logger.debug('Error data prepared', {
      asset_id: data.id,
      error_type: 'asset_error',
    });

    // Fix #6: Add concurrency control with limit(1)
    const { data: updateResult, error: updateError } = await supabase
      .from('video_assets')
      .update(updateData)
      .eq('mux_asset_id', data.id)
      .limit(UPDATE_LIMIT)
      .select('id');

    if (updateError !== null) {
      // Fix #15: Throw instead of swallowing errors
      logger.error('Database error during asset error update', {
        error_message: updateError.message,
        asset_id: data.id,
      });
      throw new Error(`Asset errored primary update failed: ${updateError.message}`);
    }

    logger.debug('Asset error primary update result', {
      rows_affected: updateResult?.length ?? 0,
    });

    // Fallback to upload_id if asset_id didn't match
    if (updateResult === null || updateResult.length === 0) {
      logger.info('No rows updated by asset_id, trying upload_id fallback');
      
      if (data.upload_id !== undefined && data.upload_id.trim().length > 0) {
        logger.debug('Upload ID available, attempting fallback update');
        
        // Fix #6: Add concurrency control for fallback
        const { data: fallbackResult, error: fallbackError } = await supabase
          .from('video_assets')
          .update(updateData)
          .eq('mux_upload_id', data.upload_id)
          .limit(UPDATE_LIMIT)
          .select('id');

        if (fallbackError !== null) {
          logger.error('Database error during asset error fallback', {
            error_message: fallbackError.message,
            upload_id: data.upload_id,
          });
          throw new Error(`Asset errored fallback update failed: ${fallbackError.message}`);
        }

        logger.debug('Asset error fallback result', {
          rows_affected: fallbackResult?.length ?? 0,
        });

        if (fallbackResult === null || fallbackResult.length === 0) {
          const errorMessage = `No matching video record found for errored asset: ${data.id}`;
          logger.error('Asset error record not found', {
            asset_id: data.id,
            upload_id: data.upload_id,
          });
          throw new Error(errorMessage);
        }

        logger.info('Asset error recorded via upload_id fallback');
      } else {
        const errorMessage = `No upload_id available for errored asset: ${data.id}`;
        logger.error('Asset error fallback not possible', {
          asset_id: data.id,
          has_upload_id: data.upload_id !== undefined,
        });
        throw new Error(errorMessage);
      }
    } else {
      logger.info('Asset error recorded via primary path');
    }

    logger.info('Asset errored handler completed successfully', {
      asset_id: data.id,
    });
  } catch (error: unknown) {
    logger.error('Asset errored handler error', {
      asset_id: data.id,
      error_message: error instanceof Error ? error.message : String(error),
      error_stack: error instanceof Error ? error.stack : undefined,
    });
    // Re-throw to trigger proper error handling in main handler
    throw error;
  }
}

/**
 * Handle upload errored webhook - mark upload as errored
 */
async function handleUploadErrored(data: {
  id: string;
  error?: { type: string; message: string };
}, timestamp: string): Promise<void> {
  logger.info('Upload errored handler started', {
    upload_id: data.id,
    error_type: data.error?.type,
    error_message: data.error?.message,
  });

  const supabase = supabaseAdmin;

  try {
    logger.debug('Preparing error data for upload');
    
    const errorDetails = {
      type: 'upload_error',
      error: data.error ?? { type: 'unknown', message: 'Upload failed' },
      upload_id: data.id,
      timestamp,
    };

    // Fix #9: Only update necessary fields
    const updateData: Record<string, unknown> = {
      status: 'errored' as const,
      error_details: errorDetails,
      updated_at: timestamp,
    };

    logger.debug('Upload error data prepared', {
      upload_id: data.id,
      error_type: 'upload_error',
    });

    // Fix #6: Add concurrency control with limit(1)
    const { data: updateResult, error: updateError } = await supabase
      .from('video_assets')
      .update(updateData)
      .eq('mux_upload_id', data.id)
      .limit(UPDATE_LIMIT)
      .select('id');

    if (updateError !== null) {
      // Fix #15: Throw instead of swallowing errors
      logger.error('Database error during upload error update', {
        error_message: updateError.message,
        upload_id: data.id,
      });
      throw new Error(`Upload errored update failed: ${updateError.message}`);
    }

    logger.debug('Upload error update result', {
      rows_affected: updateResult?.length ?? 0,
    });

    if (updateResult === null || updateResult.length === 0) {
      const errorMessage = `No matching upload found for errored upload_id: ${data.id}`;
      logger.error('Upload error record not found', {
        upload_id: data.id,
      });
      throw new Error(errorMessage);
    }

    logger.info('Upload errored handler completed successfully', {
      upload_id: data.id,
    });
  } catch (error: unknown) {
    logger.error('Upload errored handler error', {
      upload_id: data.id,
      error_message: error instanceof Error ? error.message : String(error),
      error_stack: error instanceof Error ? error.stack : undefined,
    });
    // Re-throw to trigger proper error handling in main handler
    throw error;
  }
}

/**
 * Handle upload cancelled webhook - mark upload as errored or delete
 */
async function handleUploadCancelled(data: {
  id: string;
}, timestamp: string): Promise<void> {
  logger.info('Upload cancelled handler started', {
    upload_id: data.id,
  });

  const supabase = supabaseAdmin;

  try {
    logger.debug('Preparing cancellation data for upload');
    
    const errorDetails = {
      type: 'upload_cancelled',
      upload_id: data.id,
      timestamp,
    };

    // Fix #9: Only update necessary fields
    const updateData: Record<string, unknown> = {
      status: 'errored' as const,
      error_details: errorDetails,
      updated_at: timestamp,
    };

    logger.debug('Upload cancellation data prepared', {
      upload_id: data.id,
      error_type: 'upload_cancelled',
    });

    // Fix #6: Add concurrency control with limit(1)
    // Mark as errored rather than deleting, for audit trail
    const { data: updateResult, error: updateError } = await supabase
      .from('video_assets')
      .update(updateData)
      .eq('mux_upload_id', data.id)
      .limit(UPDATE_LIMIT)
      .select('id');

    if (updateError !== null) {
      // Fix #15: Throw instead of swallowing errors
      logger.error('Database error during upload cancellation', {
        error_message: updateError.message,
        upload_id: data.id,
      });
      throw new Error(`Upload cancelled update failed: ${updateError.message}`);
    }

    logger.debug('Upload cancellation result', {
      rows_affected: updateResult?.length ?? 0,
    });

    if (updateResult === null || updateResult.length === 0) {
      // For cancellations, this might be expected if upload was never recorded
      logger.warn('No matching upload found for cancelled upload_id', {
        upload_id: data.id,
      });
      // Don't throw error for cancelled uploads - they might not exist yet
      return;
    }

    logger.info('Upload cancelled handler completed successfully', {
      upload_id: data.id,
    });
  } catch (error: unknown) {
    logger.error('Upload cancelled handler error', {
      upload_id: data.id,
      error_message: error instanceof Error ? error.message : String(error),
      error_stack: error instanceof Error ? error.stack : undefined,
    });
    // Re-throw to trigger proper error handling in main handler
    throw error;
  }
}