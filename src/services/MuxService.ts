import Mux from '@mux/mux-node';
import { Buffer } from 'buffer';
import crypto from 'crypto';

// Types for MUX service
export interface VideoMetadata {
  title?: string;
  description?: string;
  tags?: string[];
  viewer_user_id?: string;
  video_title?: string;
  video_id?: string;
  [key: string]: unknown;
}

export interface UploadOptions {
  cors_origin?: string;
  new_asset_settings?: {
    playback_policy?: ('public' | 'signed')[];
    encoding_tier?: 'baseline' | 'smart';
    normalize_audio?: boolean;
    master_access?: 'temporary' | 'none';
    test?: boolean;
  };
  timeout?: number;
}

export interface AssetInput {
  url?: string;
  upload_id?: string;
}

export interface AssetOptions {
  playback_policy?: ('public' | 'signed')[];
  encoding_tier?: 'baseline' | 'smart';
  normalize_audio?: boolean;
  master_access?: 'temporary' | 'none';
  test?: boolean;
  passthrough?: string;
  mp4_support?: 'none' | 'capped-1080p' | 'audio-only';
}

export interface LiveStreamOptions {
  playback_policy?: ('public' | 'signed')[];
  new_asset_settings?: AssetOptions;
  reconnect_window?: number;
  max_continuous_duration?: number;
  latency_mode?: 'low' | 'reduced' | 'standard';
  test?: boolean;
  passthrough?: string;
}

export interface PlaybackUrlOptions {
  token?: string;
  expires?: number;
  type?: 'video' | 'audio' | 'storyboard';
  thumbnail_time?: number;
  download?: boolean;
}

export interface WebhookPayload {
  type: string;
  object: {
    type: string;
    id: string;
  };
  id: string;
  environment: {
    name: string;
    id: string;
  };
  data: Record<string, unknown>;
  created_at: string;
  accessor?: string;
  accessor_source?: string;
  request_id?: string;
}

export interface MuxServiceResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  details?: unknown;
}

/**
 * Comprehensive MUX service class for video streaming operations
 * Implements singleton pattern for consistent API access
 */
export class MuxService {
  private static instance: MuxService;
  private mux: Mux;
  private webhookSecret: string;

  private constructor() {
    // Initialize MUX client with credentials
    const tokenId = process.env.MUX_TOKEN_ID;
    const tokenSecret = process.env.MUX_TOKEN_SECRET;
    this.webhookSecret = process.env.MUX_WEBHOOK_SECRET || '';

    if (!tokenId || !tokenSecret) {
      throw new Error('MUX credentials not found in environment variables');
    }

    this.mux = new Mux({
      tokenId,
      tokenSecret,
    });
  }

  /**
   * Get singleton instance of MuxService
   */
  public static getInstance(): MuxService {
    if (!MuxService.instance) {
      MuxService.instance = new MuxService();
    }
    return MuxService.instance;
  }

  /**
   * Upload video file to MUX
   * @param videoFile - File object or file path
   * @param metadata - Video metadata
   * @returns Promise with upload result
   */
  public async uploadVideo(
    videoFile: File | string,
    metadata: VideoMetadata = {}
  ): Promise<MuxServiceResult> {
    try {
      // For direct file uploads, we need to create a direct upload first
      const uploadResult = await this.createDirectUpload({
        cors_origin: process.env.NEXT_PUBLIC_APP_URL || '*',
        new_asset_settings: {
          playback_policy: ['public'],
          encoding_tier: 'smart',
          normalize_audio: true,
          test: process.env.NODE_ENV !== 'production',
        },
      });

      if (!uploadResult.success || !uploadResult.data) {
        return {
          success: false,
          error: 'Failed to create direct upload',
          details: uploadResult.error,
        };
      }

      return {
        success: true,
        data: {
          upload: uploadResult.data,
          metadata,
          instructions: 'Use the upload URL to POST the video file directly to MUX',
        },
      };
    } catch (error) {
      console.error('MUX upload video error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown upload error',
        details: error,
      };
    }
  }

  /**
   * Create MUX asset from URL or upload ID
   * @param input - Asset input (URL or upload ID)
   * @param options - Asset creation options
   * @returns Promise with asset creation result
   */
  public async createAsset(
    input: AssetInput,
    options: AssetOptions = {}
  ): Promise<MuxServiceResult> {
    try {
      const {mux} = this;
      
      const assetParams = {
        inputs: [input],
        playback_policy: options.playback_policy || ['public'],
        encoding_tier: options.encoding_tier || 'smart',
        normalize_audio: options.normalize_audio ?? true,
        master_access: options.master_access || 'none',
        test: options.test ?? process.env.NODE_ENV !== 'production',
        ...(options.passthrough && { passthrough: options.passthrough }),
        ...(options.mp4_support && { mp4_support: options.mp4_support }),
      };

      const asset = await mux.video.assets.create(assetParams);

      return {
        success: true,
        data: asset,
      };
    } catch (error) {
      console.error('MUX create asset error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown asset creation error',
        details: error,
      };
    }
  }

  /**
   * Retrieve asset details from MUX
   * @param assetId - MUX asset ID
   * @returns Promise with asset details
   */
  public async getAsset(assetId: string): Promise<MuxServiceResult> {
    try {
      if (!assetId) {
        return {
          success: false,
          error: 'Asset ID is required',
        };
      }

      const asset = await this.mux.video.assets.retrieve(assetId);

      return {
        success: true,
        data: asset,
      };
    } catch (error) {
      console.error('MUX get asset error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown asset retrieval error',
        details: error,
      };
    }
  }

  /**
   * Delete MUX asset
   * @param assetId - MUX asset ID
   * @returns Promise with deletion result
   */
  public async deleteAsset(assetId: string): Promise<MuxServiceResult> {
    try {
      if (!assetId) {
        return {
          success: false,
          error: 'Asset ID is required',
        };
      }

      await this.mux.video.assets.delete(assetId);

      return {
        success: true,
        data: { assetId, deleted: true },
      };
    } catch (error) {
      console.error('MUX delete asset error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown asset deletion error',
        details: error,
      };
    }
  }

  /**
   * Create live stream
   * @param options - Live stream options
   * @returns Promise with live stream creation result
   */
  public async createLiveStream(options: LiveStreamOptions = {}): Promise<MuxServiceResult> {
    try {
      const streamParams = {
        playback_policy: options.playback_policy || ['public'],
        reconnect_window: options.reconnect_window || 60,
        max_continuous_duration: options.max_continuous_duration || 43200, // 12 hours
        latency_mode: options.latency_mode || 'standard',
        test: options.test ?? process.env.NODE_ENV !== 'production',
        ...(options.new_asset_settings && { new_asset_settings: options.new_asset_settings }),
        ...(options.passthrough && { passthrough: options.passthrough }),
      };

      const liveStream = await this.mux.video.liveStreams.create(streamParams);

      return {
        success: true,
        data: liveStream,
      };
    } catch (error) {
      console.error('MUX create live stream error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown live stream creation error',
        details: error,
      };
    }
  }

  /**
   * Delete live stream
   * @param streamId - MUX live stream ID
   * @returns Promise with deletion result
   */
  public async deleteLiveStream(streamId: string): Promise<MuxServiceResult> {
    try {
      if (!streamId) {
        return {
          success: false,
          error: 'Stream ID is required',
        };
      }

      await this.mux.video.liveStreams.delete(streamId);

      return {
        success: true,
        data: { streamId, deleted: true },
      };
    } catch (error) {
      console.error('MUX delete live stream error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown live stream deletion error',
        details: error,
      };
    }
  }

  /**
   * Generate playback URL (signed if needed)
   * @param playbackId - MUX playback ID
   * @param options - Playback URL options
   * @returns Promise with playback URL
   */
  public async getPlaybackUrl(
    playbackId: string,
    options: PlaybackUrlOptions = {}
  ): Promise<MuxServiceResult> {
    try {
      if (!playbackId) {
        return {
          success: false,
          error: 'Playback ID is required',
        };
      }

      // For public playback policies, return direct URL
      if (!options.token) {
        const baseUrl = 'https://stream.mux.com';
        let url = `${baseUrl}/${playbackId}`;

        if (options.type === 'audio') {
          url += '.m4a';
        } else if (options.type === 'storyboard') {
          url += '/storyboard.vtt';
        } else {
          url += '.m3u8';
        }

        // Add query parameters
        const params = new URLSearchParams();
        if (options.thumbnail_time !== undefined) {
          params.append('time', String(options.thumbnail_time));
        }
        if (options.download) {
          params.append('download', '1');
        }

        const finalUrl = params.toString() ? `${url}?${params.toString()}` : url;

        return {
          success: true,
          data: { url: finalUrl, playbackId, type: options.type || 'video' },
        };
      }

      // For signed URLs, use MUX JWT
      const signedUrl = await this.mux.video.assets.createPlaybackId(playbackId, {
        policy: 'signed',
      });

      return {
        success: true,
        data: signedUrl,
      };
    } catch (error) {
      console.error('MUX get playback URL error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown playback URL error',
        details: error,
      };
    }
  }

  /**
   * Create direct upload URL
   * @param options - Upload options
   * @returns Promise with direct upload URL
   */
  public async createDirectUpload(options: UploadOptions = {}): Promise<MuxServiceResult> {
    try {
      const uploadParams = {
        cors_origin: options.cors_origin || '*',
        new_asset_settings: {
          playback_policy: ['public'] as ('public' | 'signed')[],
          encoding_tier: (options.new_asset_settings?.encoding_tier || 'smart') as 'baseline' | 'smart',
          normalize_audio: options.new_asset_settings?.normalize_audio ?? true,
          test: options.new_asset_settings?.test ?? process.env.NODE_ENV !== 'production',
          ...(options.new_asset_settings?.master_access && { 
            master_access: options.new_asset_settings.master_access 
          }),
        },
        timeout: options.timeout || 3600, // 1 hour default
      };

      const upload = await this.mux.video.uploads.create(uploadParams);

      return {
        success: true,
        data: upload,
      };
    } catch (error) {
      console.error('MUX create direct upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown direct upload error',
        details: error,
      };
    }
  }

  /**
   * Process MUX webhook payload
   * @param payload - Webhook payload
   * @param signature - Webhook signature for verification
   * @returns Promise with webhook processing result
   */
  public async processWebhook(
    payload: string | WebhookPayload,
    signature: string
  ): Promise<MuxServiceResult> {
    try {
      // Verify webhook signature
      if (!this.verifyWebhookSignature(payload, signature)) {
        return {
          success: false,
          error: 'Invalid webhook signature',
        };
      }

      // Parse payload if it's a string
      const webhookData: WebhookPayload = 
        typeof payload === 'string' ? JSON.parse(payload) : payload;

      // Process different webhook types
      const result = await this.handleWebhookEvent(webhookData);

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      console.error('MUX webhook processing error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown webhook processing error',
        details: error,
      };
    }
  }

  /**
   * Verify webhook signature
   * @param payload - Raw payload
   * @param signature - Signature to verify
   * @returns Boolean indicating if signature is valid
   */
  private verifyWebhookSignature(payload: string | WebhookPayload, signature: string): boolean {
    if (!this.webhookSecret) {
      console.warn('MUX webhook secret not configured');
      return false;
    }

    try {
      const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(payloadString, 'utf8')
        .digest('hex');

      const providedSignature = signature.replace('sha256=', '');
      
      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(providedSignature, 'hex')
      );
    } catch (error) {
      console.error('Webhook signature verification error:', error);
      return false;
    }
  }

  /**
   * Handle different webhook event types
   * @param webhookData - Parsed webhook data
   * @returns Promise with event handling result
   */
  private async handleWebhookEvent(webhookData: WebhookPayload): Promise<Record<string, unknown>> {
    const { type, object, data } = webhookData;

    console.info(`Processing MUX webhook: ${type} for ${object.type} ${object.id}`);

    switch (type) {
      case 'video.asset.ready':
        return this.handleAssetReady(data);
      
      case 'video.asset.errored':
        return this.handleAssetError(data);
      
      case 'video.upload.asset_created':
        return this.handleUploadAssetCreated(data);
      
      case 'video.upload.cancelled':
        return this.handleUploadCancelled(data);
      
      case 'video.upload.errored':
        return this.handleUploadError(data);
      
      case 'video.live_stream.active':
        return this.handleLiveStreamActive(data);
      
      case 'video.live_stream.idle':
        return this.handleLiveStreamIdle(data);
      
      default:
        console.warn(`Unhandled MUX webhook type: ${type}`);
        return { type, handled: false, data };
    }
  }

  /**
   * Handle asset ready webhook
   */
  private async handleAssetReady(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    console.info('Asset is ready for playback:', data);
    // Add your custom logic here (e.g., update database, send notifications)
    return { event: 'asset_ready', processed: true, data };
  }

  /**
   * Handle asset error webhook
   */
  private async handleAssetError(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    console.error('Asset processing failed:', data);
    // Add your custom logic here (e.g., notify user, retry logic)
    return { event: 'asset_error', processed: true, data };
  }

  /**
   * Handle upload asset created webhook
   */
  private async handleUploadAssetCreated(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    console.info('Upload created asset:', data);
    // Add your custom logic here (e.g., link asset to user content)
    return { event: 'upload_asset_created', processed: true, data };
  }

  /**
   * Handle upload cancelled webhook
   */
  private async handleUploadCancelled(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    console.warn('Upload was cancelled:', data);
    // Add your custom logic here (e.g., cleanup, user notification)
    return { event: 'upload_cancelled', processed: true, data };
  }

  /**
   * Handle upload error webhook
   */
  private async handleUploadError(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    console.error('Upload failed:', data);
    // Add your custom logic here (e.g., retry logic, user notification)
    return { event: 'upload_error', processed: true, data };
  }

  /**
   * Handle live stream active webhook
   */
  private async handleLiveStreamActive(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    console.info('Live stream is now active:', data);
    // Add your custom logic here (e.g., notify viewers, update UI)
    return { event: 'live_stream_active', processed: true, data };
  }

  /**
   * Handle live stream idle webhook
   */
  private async handleLiveStreamIdle(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    console.info('Live stream is now idle:', data);
    // Add your custom logic here (e.g., save recording, update status)
    return { event: 'live_stream_idle', processed: true, data };
  }

  /**
   * Health check for MUX service
   * @returns Promise with service health status
   */
  public async healthCheck(): Promise<MuxServiceResult> {
    try {
      // Try to list assets to verify API connectivity
      await this.mux.video.assets.list({ limit: 1 });
      
      return {
        success: true,
        data: { 
          status: 'healthy', 
          timestamp: new Date().toISOString(),
          environment: process.env.NODE_ENV || 'unknown'
        },
      };
    } catch (error) {
      console.error('MUX health check failed:', error);
      return {
        success: false,
        error: 'MUX service health check failed',
        details: error,
      };
    }
  }

  /**
   * Get MUX client instance (for advanced usage)
   * @returns MUX client instance
   */
  public getMuxClient(): Mux {
    return this.mux;
  }
}

// Export singleton instance
export const muxService = MuxService.getInstance();

// Export default for convenience
export default muxService; 