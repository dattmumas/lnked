/**
 * Simple MUX Upload Service - Following MUX Documentation Exactly
 * https://docs.mux.com/guides/video/upload-files-directly
 */

export interface MuxUploadResponse {
  uploadUrl: string;
  video: {
    id: string;
    title: string | null;
    description: string | null;
    mux_asset_id: string;
    status: string;
    created_by: string;
  };
}

export interface UploadServiceResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Simple upload service following MUX's documented direct upload pattern
 */
export class UploadService {
  private static instance: UploadService;

  private constructor() {}

  public static getInstance(): UploadService {
    if (!UploadService.instance) {
      UploadService.instance = new UploadService();
    }
    return UploadService.instance;
  }

  /**
   * Step 1: Get MUX direct upload URL from our API
   * Following MUX documentation pattern
   */
  private async createDirectUpload(metadata: {
    title: string;
    description?: string;
    is_public?: boolean;
    collective_id?: string;
  }): Promise<UploadServiceResult<MuxUploadResponse>> {
    try {
      const response = await fetch('/api/videos/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metadata),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      
      // New API format: { success: true, uploadUrl: string, video: object }
      if (result.success && result.uploadUrl && result.video) {
        return { 
          success: true, 
          data: {
            uploadUrl: result.uploadUrl,
            video: result.video
          }
        };
      } else {
        throw new Error('Invalid API response format');
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get upload URL',
      };
    }
  }

  /**
   * Step 2: Upload file directly to MUX using PUT
   * Following MUX documentation exactly
   */
  private async uploadToMux(
    file: File,
    uploadUrl: string,
    onProgress?: (percentage: number) => void
  ): Promise<UploadServiceResult<void>> {
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();

      // Progress tracking
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const percentage = Math.round((event.loaded / event.total) * 100);
          onProgress(percentage);
        }
      });

      // Success
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({ success: true });
        } else {
          resolve({ success: false, error: `Upload failed: HTTP ${xhr.status}` });
        }
      });

      // Error
      xhr.addEventListener('error', () => {
        resolve({ success: false, error: 'Network error' });
      });

      // Start upload - MUX requires PUT with file as body
      xhr.open('PUT', uploadUrl);
      xhr.send(file);
    });
  }

  /**
   * Complete upload workflow (following MUX docs)
   * 1. Get upload URL from MUX
   * 2. Upload file directly to MUX
   * 3. MUX processes video and sends webhooks
   */
  async uploadVideo(
    file: File,
    metadata: {
      title: string;
      description?: string;
      is_public?: boolean;
      collective_id?: string;
    },
    onProgress?: (percentage: number) => void
  ): Promise<UploadServiceResult<{ asset_id: string }>> {
    try {
      // Step 1: Get MUX upload URL
      const urlResult = await this.createDirectUpload(metadata);
      if (!urlResult.success || !urlResult.data) {
        return { success: false, error: urlResult.error };
      }

      const { uploadUrl, video } = urlResult.data;

      // Step 2: Upload to MUX
      const uploadResult = await this.uploadToMux(file, uploadUrl, onProgress);
      if (!uploadResult.success) {
        return { success: false, error: uploadResult.error };
      }

      // Step 3: Return video ID (MUX processes video via webhooks)
      return { success: true, data: { asset_id: video.id } };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }
}

export const uploadService = UploadService.getInstance(); 