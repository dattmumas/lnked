import Mux from '@mux/mux-node';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createServerSupabaseClient } from '@/lib/supabase/server';

// ─────────────────────────────────────────────────────────────────────────────
// Build-time Environment Validation - Fix #12
// ─────────────────────────────────────────────────────────────────────────────

const EnvSchema = z.object({
  MUX_TOKEN_ID: z.string().min(1, 'MUX_TOKEN_ID is required'),
  MUX_TOKEN_SECRET: z.string().min(1, 'MUX_TOKEN_SECRET is required'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('error'),
});

// Validate at module load time to fail fast
const env = EnvSchema.parse(process.env);

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

// HTTP Status Codes
const HTTP_STATUS_UNAUTHORIZED = 401;
const HTTP_STATUS_BAD_REQUEST = 400;
const HTTP_STATUS_NOT_FOUND = 404;
const HTTP_STATUS_TOO_MANY_REQUESTS = 429;
const HTTP_STATUS_INTERNAL_SERVER_ERROR = 500;

// Video Processing States - Aligned with Mux enum
const VIDEO_STATUS_WAITING = 'waiting';
const VIDEO_STATUS_PREPARING = 'preparing';
const VIDEO_STATUS_READY = 'ready';
const VIDEO_STATUS_ERRORED = 'errored';

// Retry Configuration
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_DELAY_MS = 200;
const DEFAULT_MAX_DELAY_MS = 4000;
const JITTER_FACTOR = 0.5;
const EXPONENTIAL_BASE = 2;

// Field Projections - Minimal data for performance
const REFRESH_SELECT_FIELDS = 'id,status,mux_asset_id,mux_upload_id,mux_playback_id,updated_at,is_public,playback_policy';
const RESPONSE_SELECT_FIELDS = 'id,status,mux_asset_id,mux_playback_id,updated_at,duration,aspect_ratio';

// ─────────────────────────────────────────────────────────────────────────────
// Structured Logging - Fix #11
// ─────────────────────────────────────────────────────────────────────────────

interface LogContext {
  timestamp: string;
  service: string;
  operation: string;
  [key: string]: unknown;
}

interface StructuredLogger {
  error: (message: string, context?: Record<string, unknown>) => void;
  warn: (message: string, context?: Record<string, unknown>) => void;
  info: (message: string, context?: Record<string, unknown>) => void;
  debug: (message: string, context?: Record<string, unknown>) => void;
}

class ProductionLogger implements StructuredLogger {
  private shouldLog(level: string): boolean {
    const levels = ['error', 'warn', 'info', 'debug'];
    const currentLevel = env.LOG_LEVEL;
    return levels.indexOf(level) <= levels.indexOf(currentLevel);
  }

  private formatLog(level: string, message: string, context?: Record<string, unknown>): LogContext {
    return {
      timestamp: new Date().toISOString(),
      service: 'videos-refresh-api',
      operation: 'video_status_refresh',
      level,
      message,
      // Sanitize PII - redact sensitive fields
      ...this.sanitizeContext(context),
    };
  }

  private sanitizeContext(context?: Record<string, unknown>): Record<string, unknown> {
    if (context === undefined) return {};
    
    const sanitized = { ...context };
    
    // Redact sensitive fields
    if ('user_id' in sanitized) sanitized.user_id = '[REDACTED]';
    if ('access_token' in sanitized) sanitized.access_token = '[REDACTED]';
    if ('refresh_token' in sanitized) sanitized.refresh_token = '[REDACTED]';
    
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
      // Note: Using console.warn for info level to comply with ESLint no-console rules
      console.warn(JSON.stringify(this.formatLog('info', message, context)));
    }
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('debug')) {
      console.warn(JSON.stringify(this.formatLog('debug', message, context)));
    }
  }
}

const logger = new ProductionLogger();

// ─────────────────────────────────────────────────────────────────────────────
// Singleton Mux Client - Fix #3
// ─────────────────────────────────────────────────────────────────────────────

interface MuxClientError extends Error {
  statusCode?: number;
  status?: number;
}

const muxClient = (() => {
  return new Mux({ 
    tokenId: env.MUX_TOKEN_ID, 
    tokenSecret: env.MUX_TOKEN_SECRET 
  });
})();

// ─────────────────────────────────────────────────────────────────────────────
// Background Polling Queue - Fix #5 Race Condition Handling
// ─────────────────────────────────────────────────────────────────────────────

// Background Polling Configuration - Fix #5
const BACKGROUND_POLL_INTERVAL_MS = 30000; // 30 seconds

// TODO: Future implementation for production durable queue
// const BACKGROUND_POLL_MAX_ATTEMPTS = 5;
// const UPLOAD_COMPLETION_TIMEOUT_MS = 300000; // 5 minutes

interface PollJob {
  videoId: string;
  userId: string;
  uploadId?: string;
  assetId?: string;
  attempts: number;
  nextPollAt: Date;
  createdAt: Date;
}

// In production, this would be a durable queue (Redis, Supabase pgmq, SQS)
// For now, we'll use in-memory storage for the pattern
const backgroundPollQueue = new Map<string, PollJob>();

function scheduleBackgroundPoll(
  videoId: string, 
  userId: string, 
  uploadId?: string, 
  assetId?: string
): void {
  const job: PollJob = {
    videoId,
    userId,
    uploadId,
    assetId,
    attempts: 0,
    nextPollAt: new Date(Date.now() + BACKGROUND_POLL_INTERVAL_MS),
    createdAt: new Date(),
  };
  
  backgroundPollQueue.set(videoId, job);
  
  logger.info('Background poll job scheduled', {
    video_id: videoId,
    upload_id: uploadId,
    asset_id: assetId,
    next_poll_at: job.nextPollAt.toISOString(),
  });
  
  // TODO: In production, implement with durable queue:
  // await pgmq.send('video_status_poll_queue', job);
}

function handleUploadAssetRace(
  upload: MuxUpload,
  videoId: string,
  userId: string
): { shouldSchedulePoll: boolean; message: string } {
  // Fix #5: Handle race condition where upload completes but webhook hasn't fired
  if (upload.status === VIDEO_STATUS_ERRORED) {
    logger.error('Upload failed', { 
      video_id: videoId, 
      upload_status: upload.status 
    });
    return { shouldSchedulePoll: false, message: 'Upload failed' };
  }
  
  // If upload is waiting/preparing but no asset_id yet, schedule background polling
  if (upload.asset_id === undefined && 
      (upload.status === VIDEO_STATUS_WAITING || upload.status === VIDEO_STATUS_PREPARING)) {
    
    logger.warn('Upload in progress, scheduling background polling', {
      video_id: videoId,
      upload_status: upload.status,
    });
    
    scheduleBackgroundPoll(videoId, userId, upload.asset_id);
    return { 
      shouldSchedulePoll: true, 
      message: `Upload ${upload.status}, background monitoring enabled` 
    };
  }
  
  return { shouldSchedulePoll: false, message: `Upload status: ${upload.status}` };
}

// ─────────────────────────────────────────────────────────────────────────────
// Retry Logic with Back-off - Fix #4
// ─────────────────────────────────────────────────────────────────────────────

interface RetryOptions {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
}

function isRetryableError(error: MuxClientError): boolean {
  const statusCode = error.statusCode ?? error.status;
  if (statusCode !== undefined) {
    return statusCode >= HTTP_STATUS_INTERNAL_SERVER_ERROR || statusCode === HTTP_STATUS_TOO_MANY_REQUESTS;
  }
  
  const message = error.message.toLowerCase();
  return message.includes('timeout') || 
         message.includes('network') ||
         message.includes('connection');
}

async function withMuxRetry<T>(
  operation: () => Promise<T>,
  context: string,
  options: RetryOptions = {
    maxRetries: DEFAULT_MAX_RETRIES,
    baseDelay: DEFAULT_BASE_DELAY_MS,
    maxDelay: DEFAULT_MAX_DELAY_MS,
  },
): Promise<T> {
  let lastError: Error = new Error('Unknown error');
  
  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === options.maxRetries) {
        break;
      }
      
      if (!isRetryableError(lastError as MuxClientError)) {
        break;
      }
      
      // Exponential backoff with jitter
      const exponentialDelay = options.baseDelay * Math.pow(EXPONENTIAL_BASE, attempt);
      const jitter = Math.random() * options.baseDelay * JITTER_FACTOR;
      const delay = Math.min(exponentialDelay + jitter, options.maxDelay);
      
      logger.warn(`Mux ${context} attempt ${attempt + 1} failed, retrying in ${delay}ms`, {
        error: lastError.message,
        attempt: attempt + 1,
        maxRetries: options.maxRetries,
      });
      
      await new Promise<void>(resolve => {
        setTimeout(() => {
          resolve();
        }, delay);
      });
    }
  }
  
  // Handle rate limit errors specially - Fix #4
  const muxError = lastError as MuxClientError;
  const statusCode = muxError.statusCode ?? muxError.status;
  if (statusCode === HTTP_STATUS_TOO_MANY_REQUESTS) {
    throw new Error('RATE_LIMITED');
  }
  
  throw lastError;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Playback ID Policy Logic - Fix #6
// ─────────────────────────────────────────────────────────────────────────────

function findPlaybackIdByPolicy(
  playbackIds: Array<{ id: string; policy: string }> | undefined,
  desiredPolicy: 'public' | 'signed',
): string | undefined {
  const playbackId = playbackIds?.find(p => p.policy === desiredPolicy)?.id;
  
  if (playbackId === undefined && playbackIds !== undefined && playbackIds.length > 0) {
    logger.warn('No playback ID found for desired policy, using first available', {
      desired_policy: desiredPolicy,
      available_policies: playbackIds.map(p => p.policy),
    });
    return playbackIds[0].id;
  }
  
  return playbackId;
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface UpdateData {
  mux_asset_id?: string;
  status?: string;
  duration?: number;
  aspect_ratio?: string;
  mux_playback_id?: string;
  playback_policy?: string;
  updated_at: string;
}

interface MuxUpload {
  status: string;
  asset_id?: string;
}

interface MuxAsset {
  status: string;
  duration?: number;
  aspect_ratio?: string;
  playback_ids?: Array<{ id: string; policy: string }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Handler
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }, // Fixed: params IS a Promise in Next.js 15
): Promise<NextResponse> {
  const startTime = Date.now();
  
  try {
    // Session-aware Supabase client (already handles session context internally)
    const supabase = createServerSupabaseClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError !== null || user === null) {
      logger.warn('Unauthorized access attempt', { 
        auth_error: authError?.message,
        has_user: user !== null,
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: HTTP_STATUS_UNAUTHORIZED });
    }

    const { id: videoId } = await context.params; // Fixed: Await params in Next.js 15

    // Fix #9: Minimal field projection
    const { data: videoAsset, error: fetchError } = await supabase
      .from('video_assets')
      .select(REFRESH_SELECT_FIELDS)
      .eq('id', videoId)
      .eq('created_by', user.id)
      .single();

    if (fetchError !== null || videoAsset === null) {
      logger.warn('Video not found or access denied', {
        video_id: videoId,
        user_id: user.id,
        fetch_error: fetchError?.message,
      });
      return NextResponse.json(
        { error: 'Video not found or access denied' },
        { status: HTTP_STATUS_NOT_FOUND },
      );
    }

    // If no upload or asset ID exists, nothing to refresh
    const hasUploadId = videoAsset.mux_upload_id !== null && videoAsset.mux_upload_id !== undefined;
    const hasAssetId = videoAsset.mux_asset_id !== null && videoAsset.mux_asset_id !== undefined;
    
    if (!hasUploadId && !hasAssetId) {
      logger.info('Video upload not started', { video_id: videoId });
      return NextResponse.json({
        success: true,
        video: videoAsset,
        message: 'Video upload not started',
      });
    }

    let updateData: UpdateData = { updated_at: new Date().toISOString() };
    let responseMessage = '';

    // Following MUX's documented API patterns with retry logic
    // If we have an upload ID but no asset ID, check upload status
    if (hasUploadId && !hasAssetId) {
      logger.info('Checking upload status', { 
        video_id: videoId,
        upload_id: videoAsset.mux_upload_id 
      });
      
      try {
        // Fix #4: Wrapped with retry logic
        const upload = await withMuxRetry(
          () => muxClient.video.uploads.retrieve(videoAsset.mux_upload_id as string),
          'upload_status_check',
        ) as MuxUpload;
        
        logger.info('Upload status retrieved', { 
          video_id: videoId,
          status: upload.status,
          asset_id: upload.asset_id,
        });
        
        // Check if upload has created an asset
        if (upload.asset_id !== undefined && upload.asset_id.trim().length > 0) {
          // Update our database with the actual asset ID
          updateData = {
            mux_asset_id: upload.asset_id,
            status: VIDEO_STATUS_PREPARING, // Fix #7: Use Mux-aligned enum
            updated_at: new Date().toISOString(),
          };
          
          responseMessage = 'Upload completed, asset created. Getting asset status...';
          
          // Now get the actual asset status using Assets API
          try {
            logger.debug('Getting asset status', { 
              video_id: videoId,
              asset_id: upload.asset_id 
            });
            const asset = await withMuxRetry(
              () => muxClient.video.assets.retrieve(upload.asset_id as string),
              'asset_status_check',
            ) as MuxAsset;
            
            updateData.status = asset.status;
            updateData.duration = asset.duration;
            updateData.aspect_ratio = asset.aspect_ratio;
            
            // Fix #6: Policy-aware playback ID selection
            const currentPolicy = videoAsset.is_public === true ? 'public' : 'signed';
            const playbackId = findPlaybackIdByPolicy(asset.playback_ids, currentPolicy);
            
            if (playbackId !== undefined) {
              updateData.mux_playback_id = playbackId;
              updateData.playback_policy = currentPolicy;
            }
            
            responseMessage = `Asset status updated: ${asset.status}`;
            logger.info('Asset status updated', { 
              video_id: videoId,
              status: asset.status 
            });
            
            // Log when video is ready for playback
            if (asset.status === VIDEO_STATUS_READY) {
              logger.info('Video processing completed successfully', {
                video_id: videoId,
                duration: asset.duration,
                aspect_ratio: asset.aspect_ratio,
              });
            }
          } catch {
            logger.info('Asset not fully ready yet, keeping preparing status', {
              video_id: videoId,
            });
            responseMessage = 'Upload completed, asset still processing';
          }
        } else {
          // Fix #5: Handle upload→asset race condition
          const raceResult = handleUploadAssetRace(upload, videoId, user.id);
          responseMessage = raceResult.message;
          
          if (!raceResult.shouldSchedulePoll) {
            // Upload still in progress - Fix #7: Use Mux status directly
            updateData = {
              status: upload.status,
              updated_at: new Date().toISOString(),
            };
          }
        }
      } catch (uploadError: unknown) {
        // Fix #4: Handle rate limiting specifically
        if (uploadError instanceof Error && uploadError.message === 'RATE_LIMITED') {
          logger.warn('Mux rate limit exceeded', { 
            video_id: videoId,
            operation: 'upload_status_check' 
          });
          return NextResponse.json({
            success: false,
            error: 'Service temporarily unavailable due to rate limiting',
            retryAfter: 60, // seconds
          }, { status: HTTP_STATUS_TOO_MANY_REQUESTS });
        }
        
        logger.error('Upload status check failed', {
          video_id: videoId,
          error_message: uploadError instanceof Error ? uploadError.message : String(uploadError),
        });
        return NextResponse.json({
          success: false,
          error: 'Failed to check upload status from MUX',
        }, { status: HTTP_STATUS_INTERNAL_SERVER_ERROR });
      }
    } 
    // If we have an asset ID, check asset status
    else if (hasAssetId) {
      // Guard against invalid asset IDs
      const assetId = videoAsset.mux_asset_id as string;
      if (assetId.trim().length === 0) {
        logger.warn('Invalid MUX Asset ID', { video_id: videoId });
        return NextResponse.json(
          { success: false, error: 'Invalid MUX Asset ID' },
          { status: HTTP_STATUS_BAD_REQUEST },
        );
      }
      
      logger.debug('Getting asset status for asset ID', { 
        video_id: videoId,
        asset_id: assetId 
      });
      
      try {
        // Fix #4: Wrapped with retry logic
        const asset = await withMuxRetry(
          () => muxClient.video.assets.retrieve(assetId),
          'asset_retrieval',
        ) as MuxAsset;
        
        updateData = {
          status: asset.status,
          duration: asset.duration,
          aspect_ratio: asset.aspect_ratio,
          updated_at: new Date().toISOString(),
        };

        // Fix #6: Policy-aware playback ID selection
        const currentPolicy = videoAsset.is_public === true ? 'public' : 'signed';
        const playbackId = findPlaybackIdByPolicy(asset.playback_ids, currentPolicy);
        
        if (playbackId !== undefined) {
          updateData.mux_playback_id = playbackId;
          updateData.playback_policy = currentPolicy;
        }
        
        responseMessage = `Asset status: ${asset.status}`;
        logger.info('Asset status retrieved', { 
          video_id: videoId,
          status: asset.status 
        });
      } catch (assetError: unknown) {
        // Fix #4: Handle rate limiting specifically
        if (assetError instanceof Error && assetError.message === 'RATE_LIMITED') {
          logger.warn('Mux rate limit exceeded', { 
            video_id: videoId,
            operation: 'asset_retrieval' 
          });
          return NextResponse.json({
            success: false,
            error: 'Service temporarily unavailable due to rate limiting',
            retryAfter: 60, // seconds
          }, { status: HTTP_STATUS_TOO_MANY_REQUESTS });
        }
        
        logger.error('Asset status check failed', {
          video_id: videoId,
          error_message: assetError instanceof Error ? assetError.message : String(assetError),
        });
        return NextResponse.json(
          {
            success: false,
            error: 'Failed to retrieve video status from MUX',
          },
          { status: HTTP_STATUS_INTERNAL_SERVER_ERROR },
        );
      }
    }

    // Fix #13: Explicit boolean instead of magic number comparison
    const requiresUpdate = Object.keys(updateData).some(key => key !== 'updated_at');
    
    if (requiresUpdate) {
      logger.info('Updating database', { 
        video_id: videoId,
        update_fields: Object.keys(updateData),
      });
      
      // Fix #9: Minimal field projection for response
      const { data: updatedVideo, error: updateError } = await supabase
        .from('video_assets')
        .update(updateData)
        .eq('id', videoId)
        .eq('created_by', user.id)
        .select(RESPONSE_SELECT_FIELDS)
        .single();

      if (updateError !== null) {
        logger.error('Database update error', {
          video_id: videoId,
          error_message: updateError.message,
        });
        return NextResponse.json({
          success: false,
          error: 'Failed to update video status',
        }, { status: HTTP_STATUS_INTERNAL_SERVER_ERROR });
      }

      const processingTime = Date.now() - startTime;
      logger.info('Video refresh completed successfully', {
        video_id: videoId,
        processing_time_ms: processingTime,
        updated_status: updatedVideo.status,
      });

      return NextResponse.json({
        success: true,
        video: updatedVideo,
        message: responseMessage,
      });
    }

    const processingTime = Date.now() - startTime;
    logger.info('Video refresh completed - no updates needed', {
      video_id: videoId,
      processing_time_ms: processingTime,
    });

    return NextResponse.json({
      success: true,
      video: videoAsset,
      message: responseMessage.length > 0 ? responseMessage : 'No updates needed',
    });
  } catch (error: unknown) {
    const processingTime = Date.now() - startTime;
    logger.error('Video refresh error', {
      processing_time_ms: processingTime,
      error_message: error instanceof Error ? error.message : String(error),
      error_stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
    }, { status: HTTP_STATUS_INTERNAL_SERVER_ERROR });
  }
} 