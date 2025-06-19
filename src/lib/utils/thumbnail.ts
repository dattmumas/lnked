/**
 * Thumbnail utility functions for Supabase storage operations
 */

import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

// ---------------------------------------------------------------------------
// Thumbnail utility constants
// ---------------------------------------------------------------------------
const BYTE_SHIFT_EXPONENT = 10; // 2^10 = 1024 bytes
const BYTES_PER_KB = 1 << BYTE_SHIFT_EXPONENT; // 1024 bytes
const BYTES_PER_MB = BYTES_PER_KB * BYTES_PER_KB; // 1024 x 1024
const THUMBNAIL_MAX_SIZE_MB = 15;

const RANDOM_ID_START = 2;
const RANDOM_ID_LENGTH = 6; // substring length (8 - 2)

const DEFAULT_IMAGE_QUALITY = 85;

const PATH_OFFSET_AFTER_PUBLIC = 2; // skip "public" and bucket name

export const THUMBNAIL_CONFIG = {
  maxSize: THUMBNAIL_MAX_SIZE_MB * BYTES_PER_MB, // 15 MB
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
  const randomSuffix = crypto
    .randomUUID()
    .replace(/-/g, '')
    .slice(RANDOM_ID_START, RANDOM_ID_START + RANDOM_ID_LENGTH);
  const fileName = `thumbnail-${timestamp}-${randomSuffix}.${extension}`;
  const prefix =
    postId !== undefined && postId !== ''
      ? `post-${postId}`
      : `user-${userId}/draft`;
  return `${prefix}/${fileName}`;
}

/**
 * Extracts the file path from a Supabase storage URL
 */
export function extractThumbnailFilePathFromUrl(url: string): string | undefined {
  try {
    const urlParts = url.split('/');
    const bucketIndex = urlParts.findIndex(part => part === THUMBNAIL_CONFIG.bucket);
    
    if (bucketIndex !== -1 && bucketIndex < urlParts.length - 1) {
      return urlParts.slice(bucketIndex + 1).join('/');
    }
    
    return undefined;
  } catch {
    return undefined;
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
export function extractSupabaseImagePath(url: string): { bucket: string; path: string } | undefined {
  try {
    // Pattern: https://project.supabase.co/storage/v1/object/public/bucket/path/to/file.ext
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    
    // Find the bucket and path after /storage/v1/object/public/
    const publicIndex = pathParts.findIndex(part => part === 'public');
    if (publicIndex === -1 || publicIndex + 1 >= pathParts.length) {
      return undefined;
    }
    
    const bucket = pathParts[publicIndex + 1];
    const path = pathParts
      .slice(publicIndex + PATH_OFFSET_AFTER_PUBLIC)
      .join('/');
    
    return { bucket, path };
  } catch {
    return undefined;
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
  thumbnailUrl: string | undefined,
  options: ThumbnailTransformOptions = {}
): string | undefined {
  if (thumbnailUrl === undefined || thumbnailUrl === '') return undefined;
  
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
          quality: options.quality ?? DEFAULT_IMAGE_QUALITY,
          resize: options.resize || 'cover',
          ...(options.format && { format: options.format }),
        },
      });
    
    return data.publicUrl;
  } catch (error: unknown) {
    console.warn('Failed to get optimized thumbnail URL:', error);
    return thumbnailUrl;
  }
}

/**
 * Get responsive thumbnail URLs for different display contexts
 */
export function getResponsiveThumbnailUrls(
  thumbnailUrl: string | undefined
): {
  small: string | undefined;
  medium: string | undefined;
  large: string | undefined;
  original: string | undefined;
} | undefined {
  if (thumbnailUrl === undefined || thumbnailUrl === '') return undefined;
  
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
      quality: DEFAULT_IMAGE_QUALITY 
    }),
    // Original optimized (quality only)
    original: getOptimizedThumbnailUrl(thumbnailUrl, { 
      quality: DEFAULT_IMAGE_QUALITY 
    }),
  };
}

/**
 * Gets the public URL for a thumbnail stored in Supabase storage
 * 
 * @param path - The storage path to the thumbnail (undefined or empty string if invalid)
 * @returns The public URL for the thumbnail, or undefined if the path is invalid
 * 
 * @example
 * const url = getThumbnailUrl('avatars/user123.jpg');
 * // Returns: 'https://your-project.supabase.co/storage/v1/object/public/avatars/user123.jpg'
 */
export function getThumbnailUrl(path: string | undefined): string | undefined {
  if (path === undefined || path === '') {
    return undefined;
  }
  
  try {
    const supabase = createSupabaseBrowserClient();
    const {storage} = supabase;
    
    const { data } = storage
      .from('thumbnails')
      .getPublicUrl(path);
    
    // Validate the URL is properly formed
    if (!data?.publicUrl) {
      console.warn(`Failed to generate thumbnail URL for path: ${path}`);
      return undefined;
    }
    
    return data.publicUrl;
  } catch (error) {
    console.error('Error generating thumbnail URL:', error);
    return undefined;
  }
}