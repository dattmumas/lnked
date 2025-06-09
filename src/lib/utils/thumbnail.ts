/**
 * Thumbnail utility functions for Supabase storage operations
 */

import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

export const THUMBNAIL_CONFIG = {
  maxSize: 15 * 1024 * 1024, // 15MB (larger than avatars for high-quality post thumbnails)
  allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'] as const,
  bucket: 'post-thumbnails',
  cacheControl: '3600', // 1 hour cache
  // Recommended dimensions for post thumbnails
  recommendedWidth: 1200,
  recommendedHeight: 630, // 1.91:1 aspect ratio (good for social sharing)
} as const;

/**
 * Validates an image file for thumbnail upload
 */
export function validateThumbnailFile(file: File): { isValid: boolean; error?: string } {
  // Check file type
  if (!file.type.startsWith('image/')) {
    return {
      isValid: false,
      error: 'Please select an image file (JPEG, PNG, WebP).',
    };
  }

  // Check file size
  if (file.size > THUMBNAIL_CONFIG.maxSize) {
    return {
      isValid: false,
      error: 'Image size must be less than 15MB.',
    };
  }

  // Check for allowed image formats
  if (!(THUMBNAIL_CONFIG.allowedTypes as readonly string[]).includes(file.type)) {
    return {
      isValid: false,
      error: 'Please upload a JPEG, PNG, or WebP image.',
    };
  }

  return { isValid: true };
}

/**
 * Generates a unique filename for thumbnail upload
 */
export function generateThumbnailFilename(userId: string, postId: string | undefined, mimeType: string): string {
  const extension = mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'png';
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const fileName = `thumbnail-${timestamp}-${randomSuffix}.${extension}`;
  const prefix = postId ? `post-${postId}` : `user-${userId}/draft`;
  return `${prefix}/${fileName}`;
}

/**
 * Extracts the file path from a Supabase storage URL
 */
export function extractThumbnailFilePathFromUrl(url: string): string | null {
  try {
    const urlParts = url.split('/');
    const bucketIndex = urlParts.findIndex(part => part === THUMBNAIL_CONFIG.bucket);
    
    if (bucketIndex !== -1 && bucketIndex < urlParts.length - 1) {
      return urlParts.slice(bucketIndex + 1).join('/');
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Checks if a URL is from our Supabase storage
 */
export function isSupabaseStorageUrl(url: string): boolean {
  return url.includes('supabase') && url.includes('storage');
}

/**
 * Extract bucket and file path from Supabase storage URL
 */
export function extractSupabaseImagePath(url: string): { bucket: string; path: string } | null {
  try {
    // Pattern: https://project.supabase.co/storage/v1/object/public/bucket/path/to/file.ext
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    
    // Find the bucket and path after /storage/v1/object/public/
    const publicIndex = pathParts.findIndex(part => part === 'public');
    if (publicIndex === -1 || publicIndex + 1 >= pathParts.length) {
      return null;
    }
    
    const bucket = pathParts[publicIndex + 1];
    const path = pathParts.slice(publicIndex + 2).join('/');
    
    return { bucket, path };
  } catch {
    return null;
  }
}

/**
 * Supabase Image Transformation utilities for thumbnails
 */

export interface ThumbnailTransformOptions {
  width?: number;
  height?: number;
  quality?: number;
  resize?: 'cover' | 'contain' | 'fill';
  format?: 'origin';
}

/**
 * Get optimized thumbnail URL using Supabase image transformations
 */
export function getOptimizedThumbnailUrl(
  thumbnailUrl: string | null | undefined,
  options: ThumbnailTransformOptions = {}
): string | null {
  if (!thumbnailUrl) return null;
  
  // Check if it's a Supabase storage URL
  const pathInfo = extractSupabaseImagePath(thumbnailUrl);
  if (!pathInfo) {
    // Return original URL if not a Supabase storage URL
    return thumbnailUrl;
  }
  
  try {
    const supabase = createSupabaseBrowserClient();
    const { data } = supabase.storage
      .from(pathInfo.bucket)
      .getPublicUrl(pathInfo.path, {
        transform: {
          width: options.width,
          height: options.height,
          quality: options.quality || 85,
          resize: options.resize || 'cover',
          ...(options.format && { format: options.format }),
        },
      });
    
    return data.publicUrl;
  } catch (error) {
    console.warn('Failed to get optimized thumbnail URL:', error);
    return thumbnailUrl;
  }
}

/**
 * Get responsive thumbnail URLs for different display contexts
 */
export function getResponsiveThumbnailUrls(thumbnailUrl: string | null | undefined) {
  if (!thumbnailUrl) return null;
  
  return {
    // Small thumbnails (320px) - for lists, mobile cards
    small: getOptimizedThumbnailUrl(thumbnailUrl, { 
      width: 320, 
      height: 168, // 1.91:1 aspect ratio
      quality: 75 
    }),
    // Medium thumbnails (640px) - for cards, previews
    medium: getOptimizedThumbnailUrl(thumbnailUrl, { 
      width: 640, 
      height: 336, 
      quality: 80 
    }),
    // Large thumbnails (1024px) - for hero sections, featured posts
    large: getOptimizedThumbnailUrl(thumbnailUrl, { 
      width: 1024, 
      height: 537, 
      quality: 85 
    }),
    // Original optimized (quality only)
    original: getOptimizedThumbnailUrl(thumbnailUrl, { 
      quality: 85 
    }),
  };
} 