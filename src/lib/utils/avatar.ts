/**
 * Avatar utility functions for Supabase storage operations
 */

import supabase from '@/lib/supabase/browser';

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
  allowedTypes: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
  ] as const,
  bucket: 'avatars',
  cacheControl: '3600', // 1 hour cache
} as const;

/**
 * Validates an image file for avatar upload
 */
export function validateAvatarFile(file: File): {
  isValid: boolean;
  error?: string;
} {
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
export function generateAvatarFilename(
  userId: string,
  mimeType: string,
): string {
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
export function extractFilePathFromUrl(
  url: string,
  bucketName: string = AVATAR_CONFIG.bucket,
): string | undefined {
  try {
    const urlParts = url.split('/');
    const bucketIndex = urlParts.findIndex((part) => part === bucketName);

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
export function generateUserInitials(
  fullName?: string | null,
  username?: string | null,
): string {
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
export function extractSupabaseImagePath(
  url: string,
): { bucket: string; path: string } | undefined {
  try {
    // Extract bucket and path
    const pathMatch =
      /^https?:\/\/[^/]+\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/.exec(
        url,
      );
    if (pathMatch === null || pathMatch === undefined) {
      throw new Error('Invalid storage URL format');
    }

    const bucketMatch = pathMatch[1];
    const pathMatch2 = pathMatch[2];

    if (!bucketMatch || !pathMatch2) {
      throw new Error('Could not extract bucket and path from URL');
    }

    // Remove any existing query params so we don't duplicate transformations
    let path = pathMatch2.split('?')[0];

    if (!path || path === '') {
      throw new Error('Could not extract bucket and path from URL');
    }

    // Handle legacy URLs with duplicate bucket paths (e.g., "avatars/avatars/file.jpg")
    // Remove duplicate bucket prefix if it exists
    if (path.startsWith(`${bucketMatch}/`)) {
      path = path.substring(bucketMatch.length + 1);
    }

    // At this point we know both values are defined due to the checks above
    return { bucket: bucketMatch, path };
  } catch {
    return undefined;
  }
}

/**
 * Get optimized avatar URL using Supabase image transformations
 */
export function getOptimizedAvatarUrl(
  avatarUrl: string | undefined,
  options: ImageTransformOptions = {},
): string | undefined {
  if (avatarUrl === undefined || avatarUrl.trim() === '') return undefined;

  // If the URL already contains Supabase transformation params (e.g. ?width=)
  // assume it is already optimised and avoid adding another set which causes
  // duplicated query strings like `...?width=128...?width=256`.
  if (/[?&]width=/.test(avatarUrl)) {
    return avatarUrl;
  }

  // Prepare transformation options early (shared by both absolute/relative).
  const transformOptions: {
    quality: number;
    resize: string;
    width?: number;
    height?: number;
    format?: string;
  } = {
    quality: options.quality ?? QUALITY.MEDIUM,
    resize: options.resize || 'cover',
  };

  if (options.width !== undefined) transformOptions.width = options.width;
  if (options.height !== undefined) transformOptions.height = options.height;
  if (options.format) transformOptions.format = options.format;

  // ---------------------------------------------------------------------
  // A. Absolute Supabase storage URL (already contains project domain)
  // ---------------------------------------------------------------------
  const pathInfo = extractSupabaseImagePath(avatarUrl);
  if (pathInfo) {
    try {
      const { data } = supabase.storage
        .from(pathInfo.bucket)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .getPublicUrl(pathInfo.path, { transform: transformOptions as any });

      return data.publicUrl;
    } catch (error: unknown) {
      console.warn('Failed to transform Supabase avatar URL:', error);
      return avatarUrl;
    }
  }

  // ---------------------------------------------------------------------
  // B. Relative storage path (e.g. "avatars/user-123/xyz.png")
  // ---------------------------------------------------------------------
  if (!avatarUrl.startsWith('http') && !avatarUrl.startsWith('data:')) {
    const relativeMatch = /^([^/]+)\/(.+)$/.exec(avatarUrl);
    if (relativeMatch !== null) {
      // Capture groups are guaranteed by regex, but TS can't infer non-null.
      const bucket = relativeMatch[1] as string;
      const path = relativeMatch[2] as string;
      try {
        const { data } = supabase.storage
          .from(bucket)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .getPublicUrl(path, { transform: transformOptions as any });

        return data.publicUrl;
      } catch (error: unknown) {
        console.warn(
          'Failed to build public avatar URL from relative path:',
          error,
        );
        return avatarUrl; // Let custom loader attempt resolution.
      }
    }
  }

  // Fallback: return original value untouched so that custom Next image
  // loader can attempt to resolve it (or browser shows broken image).
  return avatarUrl;
}

/**
 * Get responsive avatar URLs for different display sizes
 */
export function getResponsiveAvatarUrls(avatarUrl: string | undefined):
  | {
      small: string | undefined;
      medium: string | undefined;
      large: string | undefined;
      xl: string | undefined;
      original: string | undefined;
    }
  | undefined {
  if (avatarUrl === undefined || avatarUrl === '') return undefined;

  return {
    // Small avatars (32px) - for comments, mentions
    small: getOptimizedAvatarUrl(avatarUrl, {
      width: 32,
      height: 32,
      quality: QUALITY.SMALL,
    }),
    // Medium avatars (48px) - for lists, cards
    medium: getOptimizedAvatarUrl(avatarUrl, {
      width: 48,
      height: 48,
      quality: QUALITY.MEDIUM,
    }),
    // Large avatars (128px) - for profile hero
    large: getOptimizedAvatarUrl(avatarUrl, {
      width: 128,
      height: 128,
      quality: QUALITY.LARGE,
    }),
    // XL avatars (256px) - for profile modals, settings
    xl: getOptimizedAvatarUrl(avatarUrl, {
      width: 256,
      height: 256,
      quality: QUALITY.XL,
    }),
    // Original optimized (quality only)
    original: getOptimizedAvatarUrl(avatarUrl, {
      quality: QUALITY.ORIGINAL,
    }),
  };
}
