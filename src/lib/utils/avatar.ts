/**
 * Avatar utility functions for Supabase storage operations
 */

import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

// ---------------------------------------------------------------------------
// Avatar utility constants
// ---------------------------------------------------------------------------
const BYTE_SHIFT_EXPONENT = 10; // 2^10 = 1024
const BYTES_PER_KB = 1 << BYTE_SHIFT_EXPONENT; // 1024 bytes
const BYTES_PER_MB = BYTES_PER_KB * BYTES_PER_KB; // 1024 x 1024
const MAX_AVATAR_SIZE_MB = 10;
// const RANDOM_ID_RADIX = 36; // Removed as per instructions
const RANDOM_ID_START = 2;
const RANDOM_ID_LENGTH = 6; // substring length (8 - 2)
const MAX_INITIALS = 2;

const QUALITY = {
  SMALL: 75,
  MEDIUM: 80,
  LARGE: 85,
  XL: 90,
  ORIGINAL: 85,
} as const;

const PATH_OFFSET_AFTER_BUCKET = 1; // skip bucket name
const PATH_OFFSET_AFTER_PUBLIC = 2;

/**
 * Validates an image file for avatar upload
 */
export const AVATAR_CONFIG = {
  maxSize: MAX_AVATAR_SIZE_MB * BYTES_PER_MB, // 10 MB
  allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'] as const,
  bucket: 'avatars',
  cacheControl: '3600', // 1 hour cache
} as const;

/**
 * Validates an image file for avatar upload
 */
export function validateAvatarFile(file: File): { isValid: boolean; error?: string } {
  // Check file type
  if (!file.type.startsWith('image/')) {
    return {
      isValid: false,
      error: 'Please select an image file (JPEG, PNG, WebP, etc.).',
    };
  }

  // Check file size
  if (file.size > AVATAR_CONFIG.maxSize) {
    return {
      isValid: false,
      error: 'Image size must be less than 10MB.',
    };
  }

  // Check for allowed image formats
  if (!(AVATAR_CONFIG.allowedTypes as readonly string[]).includes(file.type)) {
    return {
      isValid: false,
      error: 'Please upload a JPEG, PNG, WebP, or GIF image.',
    };
  }

  return { isValid: true };
}

/**
 * Generates a unique filename for avatar upload
 */
export function generateAvatarFilename(userId: string, mimeType: string): string {
  const extension = mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'png';
  const timestamp = Date.now();
  const randomSuffix = crypto
    .randomUUID()
    .replace(/-/g, '')
    .slice(RANDOM_ID_START, RANDOM_ID_START + RANDOM_ID_LENGTH);
  const fileName = `avatar-${timestamp}-${randomSuffix}.${extension}`;
  return `user-${userId}/${fileName}`;
}

/**
 * Extracts the file path from a Supabase storage URL
 */
export function extractFilePathFromUrl(url: string, bucketName: string = AVATAR_CONFIG.bucket): string | undefined {
  try {
    const urlParts = url.split('/');
    const bucketIndex = urlParts.findIndex(part => part === bucketName);
    
    if (bucketIndex !== -1 && bucketIndex < urlParts.length - 1) {
      return urlParts.slice(bucketIndex + PATH_OFFSET_AFTER_BUCKET).join('/');
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
 * Generates user initials from name for avatar fallback
 */
export function generateUserInitials(fullName?: string | null, username?: string | null): string {
  const name = fullName ?? username;
  if (name === undefined || name === null || name.trim() === '') return 'U';
  
  return name
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase())
    .slice(0, MAX_INITIALS)
    .join('');
}

/**
 * Supabase Image Transformation utilities
 */

export interface ImageTransformOptions {
  width?: number;
  height?: number;
  quality?: number;
  resize?: 'cover' | 'contain' | 'fill';
  format?: 'origin'; // Supabase only supports 'origin' to opt-out of automatic WebP
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
 * Get optimized avatar URL using Supabase image transformations
 */
export function getOptimizedAvatarUrl(
  avatarUrl: string | undefined,
  options: ImageTransformOptions = {}
): string | undefined {
  if (avatarUrl === undefined || avatarUrl === '') return undefined;
  
  // Check if it's a Supabase storage URL
  const pathInfo = extractSupabaseImagePath(avatarUrl);
  if (!pathInfo) {
    // Return original URL if not a Supabase storage URL
    return avatarUrl;
  }
  
  try {
    const supabase = createSupabaseBrowserClient();
    const { data } = supabase.storage
      .from(pathInfo.bucket)
      .getPublicUrl(pathInfo.path, {
        transform: {
          width: options.width,
          height: options.height,
          quality: options.quality ?? QUALITY.MEDIUM,
          resize: options.resize || 'cover',
          ...(options.format && { format: options.format }),
        },
      });
    
    return data.publicUrl;
  } catch (error) {
    console.warn('Failed to get optimized avatar URL:', error);
    return avatarUrl;
  }
}

/**
 * Get responsive avatar URLs for different display sizes
 */
export function getResponsiveAvatarUrls(
  avatarUrl: string | undefined
): {
  small: string | undefined;
  medium: string | undefined;
  large: string | undefined;
  xl: string | undefined;
  original: string | undefined;
} | undefined {
  if (avatarUrl === undefined || avatarUrl === '') return undefined;
  
  return {
    // Small avatars (32px) - for comments, mentions
    small: getOptimizedAvatarUrl(avatarUrl, { 
      width: 32, 
      height: 32, 
      quality: QUALITY.SMALL 
    }),
    // Medium avatars (48px) - for lists, cards
    medium: getOptimizedAvatarUrl(avatarUrl, { 
      width: 48, 
      height: 48, 
      quality: QUALITY.MEDIUM 
    }),
    // Large avatars (128px) - for profile hero
    large: getOptimizedAvatarUrl(avatarUrl, { 
      width: 128, 
      height: 128, 
      quality: QUALITY.LARGE 
    }),
    // XL avatars (256px) - for profile modals, settings
    xl: getOptimizedAvatarUrl(avatarUrl, { 
      width: 256, 
      height: 256, 
      quality: QUALITY.XL 
    }),
    // Original optimized (quality only)
    original: getOptimizedAvatarUrl(avatarUrl, { 
      quality: QUALITY.ORIGINAL 
    }),
  };
}