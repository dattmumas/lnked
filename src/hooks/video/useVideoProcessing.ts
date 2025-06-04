'use client';

import { useState, useCallback } from 'react';
import { VideoFormData } from './useVideoFormState';

// Helper function to normalize video asset data from database to expected format
const normalizeVideoAsset = (asset: any): VideoAsset => {
  return {
    ...asset,
    // Provide sensible defaults for form fields that don't exist in database
    privacy_setting: 'public', // Default since is_public column doesn't exist
    encoding_tier: 'smart', // Default since encoding_tier column doesn't exist
    thumbnail_url: '', // Default since thumbnail_url column doesn't exist
    tags: [], // Default since tags column doesn't exist
    collective_id: null, // Default since collective_id column doesn't exist
    is_public: true, // Default since is_public column doesn't exist
    processed_at: null, // Default since processed_at column doesn't exist
  };
};

// ACTUAL database schema from migration file
export interface VideoAsset {
  id: string;
  mux_asset_id: string | null;
  mux_playback_id: string | null;
  title: string | null;
  description: string | null;
  duration: number | null;
  status: string; // varchar(50) with default 'preparing'
  aspect_ratio: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  mux_upload_id: string | null;
  mp4_support: string | null; // default 'none'
  // Form-compatibility fields (derived/defaults for backward compatibility)
  privacy_setting?: string;
  encoding_tier?: string;
  thumbnail_url?: string;
  tags?: string[];
  collective_id?: string | null;
  is_public?: boolean;
  processed_at?: string | null;
}

export const useVideoProcessing = () => {
  const [asset, setAsset] = useState<VideoAsset | null>(null);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [isCreatingUploadUrl, setIsCreatingUploadUrl] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const createUploadUrl = useCallback(async (metadata: VideoFormData): Promise<string> => {
    setIsCreatingUploadUrl(true);
    
    try {
      const response = await fetch('/api/videos/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: metadata.title || 'Untitled Video',
          description: metadata.description || '',
          privacy_setting: metadata.privacySetting,
          encoding_tier: metadata.encodingTier,
          tags: metadata.tags,
          collective_id: metadata.collectiveId,
          is_published: false, // Will be set to true when wizard completes
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `Failed to create upload URL: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success || !result.uploadUrl) {
        throw new Error('Invalid API response: missing upload URL');
      }

      // Store the video asset for later use
      if (result.video) {
        setAsset(normalizeVideoAsset(result.video));
      }

      return result.uploadUrl;
    } catch (error) {
      console.error('Failed to create upload URL:', error);
      throw error;
    } finally {
      setIsCreatingUploadUrl(false);
    }
  }, []);

  const updateVideoMetadata = useCallback(async (formData: VideoFormData): Promise<void> => {
    if (!asset?.id) {
      throw new Error('No video asset to update');
    }

    const updatePayload = {
      title: formData.title,
      description: formData.description,
      privacy_setting: formData.privacySetting,
      encoding_tier: formData.encodingTier,
      tags: formData.tags,
      thumbnail_url: formData.thumbnailUrl,
    };

    console.warn('Updating video metadata:', { assetId: asset.id, payload: updatePayload });

    try {
      const response = await fetch(`/api/videos/${asset.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      });

      if (!response.ok) {
        let errorDetails = 'Unknown error';
        try {
          const errorData = await response.json();
          errorDetails = errorData.error || `HTTP ${response.status}`;
          console.error('API Error Response:', errorData);
        } catch (parseError) {
          errorDetails = `HTTP ${response.status} - Unable to parse error response`;
          console.error('Failed to parse error response:', parseError);
        }
        throw new Error(`Failed to update video metadata: ${errorDetails}`);
      }

      const updatedAsset = await response.json();
    // Video metadata updated successfully
      
      if (updatedAsset.video) {
        setAsset(normalizeVideoAsset(updatedAsset.video));
      }
    } catch (error) {
      console.error('Failed to update video metadata:', error);
      throw error;
    }
  }, [asset]);

  const publish = useCallback(async (formData: VideoFormData): Promise<void> => {
    if (!asset?.id) {
      throw new Error('No video asset to publish');
    }

    setIsPublishing(true);

    try {
      const response = await fetch(`/api/videos/${asset.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          privacy_setting: formData.privacySetting,
          encoding_tier: formData.encodingTier,
          tags: formData.tags,
          thumbnail_url: formData.thumbnailUrl,
          is_published: true,
          published_at: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `Failed to publish video: ${response.status}`);
      }

      const publishedAsset = await response.json();
      if (publishedAsset.video) {
        setAsset(normalizeVideoAsset(publishedAsset.video));
      }
    } catch (error) {
      console.error('Failed to publish video:', error);
      throw error;
    } finally {
      setIsPublishing(false);
    }
  }, [asset]);

  const refreshAssetStatus = useCallback(async (): Promise<void> => {
    if (!asset?.id) {
      return;
    }

    try {
      const response = await fetch(`/api/videos/${asset.id}/refresh`, {
        method: 'POST',
      });

      if (response.ok) {
        const refreshedAsset = await response.json();
        if (refreshedAsset.video) {
          setAsset(normalizeVideoAsset(refreshedAsset.video));
        }
      }
    } catch (error) {
      console.error('Failed to refresh asset status:', error);
      // Don't throw here as this is a background operation
    }
  }, [asset]);

  const generateThumbnails = useCallback((): Promise<string[]> => {
    if (!asset?.mux_asset_id) {
      return Promise.reject(new Error('No MUX asset ID available for thumbnail generation'));
    }

    try {
      // MUX automatically generates thumbnails, we can construct URLs
      const thumbnailUrls = [];
      const THUMBNAIL_COUNT = 3;
      const TIME_INTERVAL = 10;
      
      for (let i = 0; i < THUMBNAIL_COUNT; i++) {
        const time = i * TIME_INTERVAL; // Generate thumbnails at 0s, 10s, 20s
        const thumbnailUrl = `https://image.mux.com/${asset.mux_asset_id}/thumbnail.jpg?time=${time}`;
        thumbnailUrls.push(thumbnailUrl);
      }
      
      setThumbnails(thumbnailUrls);
      return Promise.resolve(thumbnailUrls);
    } catch (error) {
      console.error('Failed to generate thumbnails:', error);
      return Promise.reject(error);
    }
  }, [asset]);

  const reset = useCallback(() => {
    setAsset(null);
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