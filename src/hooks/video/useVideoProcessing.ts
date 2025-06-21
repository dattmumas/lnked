'use client';

import { useState, useCallback } from 'react';

import { VideoAsset } from '@/lib/data-access/schemas/video.schema';

import { VideoFormData } from './useVideoFormState';

// API Response types
interface VideoUploadResponse {
  success: boolean;
  uploadUrl?: string;
  video?: VideoAsset;
  error?: string;
}

interface VideoUpdateResponse {
  video?: VideoAsset;
  error?: string;
}

interface ErrorResponse {
  error?: string;
}

// Note: VideoAsset type now imported from schema with null-to-undefined transformation

interface UseVideoProcessingReturn {
  // State
  asset: VideoAsset | undefined;
  thumbnails: string[];
  isCreatingUploadUrl: boolean;
  isPublishing: boolean;
  
  // Operations
  createUploadUrl: (metadata: VideoFormData) => Promise<string>;
  updateVideoMetadata: (formData: VideoFormData) => Promise<void>;
  publish: (formData: VideoFormData) => Promise<void>;
  refreshAssetStatus: () => Promise<void>;
  generateThumbnails: () => Promise<string[]>;
  reset: () => void;
  
  // Computed properties
  hasAsset: boolean;
  isReady: boolean;
  canPublish: boolean;
}

export const useVideoProcessing = (): UseVideoProcessingReturn => {
  const [asset, setAsset] = useState<VideoAsset | undefined>(undefined);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [isCreatingUploadUrl, setIsCreatingUploadUrl] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const createUploadUrl = useCallback(async (metadata: VideoFormData): Promise<string> => {
    setIsCreatingUploadUrl(true);
    
    try {
      const titleValue = metadata.title?.trim() || 'Untitled Video';
      const descriptionValue = metadata.description?.trim() || '';
      
      const response = await fetch('/api/videos/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: titleValue,
          description: descriptionValue,
          privacy_setting: metadata.privacySetting,
          encoding_tier: metadata.encodingTier,
          tags: metadata.tags,
          collective_id: metadata.collectiveId,
          is_published: false, // Will be set to true when wizard completes
        }),
      });

      if (!response.ok) {
        let errorMessage = `Failed to create upload URL: ${response.status}`;
        try {
          const errorData = await response.json() as unknown as ErrorResponse;
          const hasError = errorData.error !== undefined && errorData.error !== null && errorData.error !== '';
          if (hasError) {
            errorMessage = errorData.error ?? 'Unknown error';
          }
        } catch {
          // Use default error message if JSON parsing fails
        }
        throw new Error(errorMessage);
      }

      const result = await response.json() as unknown as VideoUploadResponse;
      
      const hasSuccessAndUrl = result.success === true && typeof result.uploadUrl === 'string' && result.uploadUrl !== '';
      if (!hasSuccessAndUrl) {
        throw new Error('Invalid API response: missing upload URL');
      }

      // Store the video asset for later use
      if (result.video !== undefined) {
        setAsset(result.video);
      }

      return result.uploadUrl as string; // Already validated above
    } catch (error: unknown) {
      console.error('Failed to create upload URL:', error);
      throw error;
    } finally {
      setIsCreatingUploadUrl(false);
    }
  }, []);

  const updateVideoMetadata = useCallback(async (formData: VideoFormData): Promise<void> => {
    const assetId = asset?.id;
    if (assetId === undefined || assetId === null || assetId === '') {
      throw new Error('No video asset to update');
    }

    const updatePayload = {
      title: formData.title,
      description: formData.description,
      privacy_setting: formData.privacySetting,
      encoding_tier: formData.encodingTier,
      // Note: tags, thumbnail_url are not supported by API
    };

    console.warn('Updating video metadata:', { assetId, payload: updatePayload });

    try {
      const response = await fetch(`/api/videos/${assetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      });

      if (!response.ok) {
        let errorDetails = 'Unknown error';
        try {
          const errorData = await response.json() as ErrorResponse;
          errorDetails = errorData.error ?? `HTTP ${response.status}`;
          console.error('API Error Response:', errorData);
        } catch (parseError) {
          errorDetails = `HTTP ${response.status} - Unable to parse error response`;
          console.error('Failed to parse error response:', parseError);
        }
        throw new Error(`Failed to update video metadata: ${errorDetails}`);
      }

      const updatedAsset = await response.json() as unknown as VideoUpdateResponse;
    // Video metadata updated successfully
      
      if (updatedAsset.video !== undefined) {
        setAsset(updatedAsset.video);
      }
    } catch (error: unknown) {
      console.error('Failed to update video metadata:', error);
      throw error;
    }
  }, [asset]);

  const publish = useCallback(async (formData: VideoFormData): Promise<void> => {
    const assetId = asset?.id;
    if (assetId === undefined || assetId === null || assetId === '') {
      throw new Error('No video asset to publish');
    }

    setIsPublishing(true);

    try {
      const response = await fetch(`/api/videos/${assetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          privacy_setting: formData.privacySetting,
          encoding_tier: formData.encodingTier,
          // Note: tags, thumbnail_url, is_published, published_at are not supported by API
        }),
      });

      if (!response.ok) {
        let errorMessage = `Failed to publish video: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json() as unknown as ErrorResponse;
          const hasError = errorData.error !== undefined && errorData.error !== null && errorData.error !== '';
          if (hasError) {
            errorMessage = errorData.error ?? 'Unknown error';
          }
        } catch {
          // Use default error message if JSON parsing fails
        }
        throw new Error(errorMessage);
      }

      const publishedAsset = await response.json() as unknown as VideoUpdateResponse;
      if (publishedAsset.video !== undefined) {
        setAsset(publishedAsset.video);
      }
    } catch (error: unknown) {
      console.error('Failed to publish video:', error);
      throw error;
    } finally {
      setIsPublishing(false);
    }
  }, [asset]);

  const refreshAssetStatus = useCallback(async (): Promise<void> => {
    const assetId = asset?.id;
    if (assetId === undefined || assetId === null || assetId === '') {
      return;
    }

    try {
      const response = await fetch(`/api/videos/${assetId}/refresh`, {
        method: 'POST',
      });

      if (response.ok) {
        const refreshedAsset = await response.json() as unknown as VideoUpdateResponse;
        if (refreshedAsset.video !== undefined) {
          setAsset(refreshedAsset.video);
        }
      }
    } catch (error: unknown) {
      console.error('Failed to refresh asset status:', error);
      // Don't throw here as this is a background operation
    }
  }, [asset]);

  const generateThumbnails = useCallback((): Promise<string[]> => {
    const muxAssetId = asset?.mux_asset_id;
    if (muxAssetId === null || muxAssetId === undefined || muxAssetId === '') {
      return Promise.reject(new Error('No MUX asset ID available for thumbnail generation'));
    }

    try {
      // MUX automatically generates thumbnails, we can construct URLs
      const thumbnailUrls = [];
      const THUMBNAIL_COUNT = 3;
      const TIME_INTERVAL = 10;
      
      for (let i = 0; i < THUMBNAIL_COUNT; i++) {
        const time = i * TIME_INTERVAL; // Generate thumbnails at 0s, 10s, 20s
        const thumbnailUrl = `https://image.mux.com/${muxAssetId}/thumbnail.jpg?time=${time}`;
        thumbnailUrls.push(thumbnailUrl);
      }
      
      setThumbnails(thumbnailUrls);
      return Promise.resolve(thumbnailUrls);
    } catch (error: unknown) {
      console.error('Failed to generate thumbnails:', error);
      if (error instanceof Error) {
        return Promise.reject(error);
      }
      return Promise.reject(new Error('Failed to generate thumbnails'));
    }
  }, [asset]);

  const reset = useCallback(() => {
    setAsset(undefined);
    setThumbnails([]);
    setIsCreatingUploadUrl(false);
    setIsPublishing(false);
  }, []);

  return {
    // State
    asset,
    thumbnails,
    isCreatingUploadUrl,
    isPublishing,

    // Operations
    createUploadUrl,
    updateVideoMetadata,
    publish,
    refreshAssetStatus,
    generateThumbnails,
    reset,

    // Computed properties
    hasAsset: Boolean(asset),
    isReady: Boolean(asset?.mux_upload_id),
    canPublish: Boolean(asset) && !isPublishing,
  };
}; 