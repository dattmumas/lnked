/**
 * Avatar utility functions for Supabase storage operations
 */

import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

export const AVATAR_CONFIG = {
  maxSize: 10 * 1024 * 1024, // 10MB
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
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const fileName = `avatar-${timestamp}-${randomSuffix}.${extension}`;
  return `user-${userId}/${fileName}`;
}

/**
 * Extracts the file path from a Supabase storage URL
 */
export function extractFilePathFromUrl(url: string, bucketName: string = AVATAR_CONFIG.bucket): string | null {
  try {
    const urlParts = url.split('/');
    const bucketIndex = urlParts.findIndex(part => part === bucketName);
    
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
 * Generates user initials from name for avatar fallback
 */
export function generateUserInitials(fullName?: string | null, username?: string | null): string {
  const name = fullName || username;
  if (!name) return 'U';
  
  return name
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase())
    .slice(0, 2)
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
 * Get optimized avatar URL using Supabase image transformations
 */
export function getOptimizedAvatarUrl(
  avatarUrl: string | null | undefined,
  options: ImageTransformOptions = {}
): string | null {
  if (!avatarUrl) return null;
  
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
          quality: options.quality || 80,
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
export function getResponsiveAvatarUrls(avatarUrl: string | null | undefined) {
  if (!avatarUrl) return null;
  
  return {
    // Small avatars (32px) - for comments, mentions
    small: getOptimizedAvatarUrl(avatarUrl, { 
      width: 32, 
      height: 32, 
      quality: 75 
    }),
    // Medium avatars (48px) - for lists, cards
    medium: getOptimizedAvatarUrl(avatarUrl, { 
      width: 48, 
      height: 48, 
      quality: 80 
    }),
    // Large avatars (128px) - for profile hero
    large: getOptimizedAvatarUrl(avatarUrl, { 
      width: 128, 
      height: 128, 
      quality: 85 
    }),
    // XL avatars (256px) - for profile modals, settings
    xl: getOptimizedAvatarUrl(avatarUrl, { 
      width: 256, 
      height: 256, 
      quality: 90 
    }),
    // Original optimized (quality only)
    original: getOptimizedAvatarUrl(avatarUrl, { 
      quality: 85 
    }),
  };
} 