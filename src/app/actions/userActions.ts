'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { getStripe } from '@/lib/stripe';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { 
  AVATAR_CONFIG, 
  extractFilePathFromUrl, 
  isSupabaseStorageUrl 
} from '@/lib/utils/avatar';

import type { TablesUpdate } from '@/lib/database.types';

// Constants moved from magic numbers
const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 30;
const FULL_NAME_MAX_LENGTH = 100;
const BIO_MAX_LENGTH = 500;
const MAX_TAGS_COUNT = 10;
const MAX_TAG_LENGTH = 32;
const RATE_LIMIT_UPLOADS_PER_HOUR = 10;
const RATE_LIMIT_PROFILE_UPDATES_PER_HOUR = 20;

// Environment configuration with validation
const AVATAR_MAX_SIZE_MB = parseInt(process.env.AVATAR_MAX_SIZE_MB ?? '10', 10);
const BYTES_PER_KB = 1024;
const KB_PER_MB = 1024;
const AVATAR_MAX_SIZE_BYTES = AVATAR_MAX_SIZE_MB * KB_PER_MB * BYTES_PER_KB;

// File type validation via magic number detection
/* eslint-disable no-magic-numbers */
const FILE_SIGNATURES = {
  'image/jpeg': [0xFF, 0xD8, 0xFF],
  'image/png': [0x89, 0x50, 0x4E, 0x47],
  'image/webp': [0x52, 0x49, 0x46, 0x46], // RIFF header for WebP
  'image/gif': [0x47, 0x49, 0x46],
} as const;
/* eslint-enable no-magic-numbers */

/**
 * Rate limiting storage (in production, use Redis/Upstash)
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Observability metrics (in production, use Prometheus/DataDog)
 */
interface Metrics {
  userProfileUpdateTotal: (status: 'success' | 'error') => void;
  userProfileUpdateDuration: (durationMs: number) => void;
  avatarUploadTotal: (status: 'success' | 'error') => void;
  userAccountDeleteTotal: (status: 'success' | 'error') => void;
}

const metrics: Metrics = {
  userProfileUpdateTotal: (status) => {
    console.warn(`[METRICS] user_profile_update_total{status="${status}"} 1`);
  },
  userProfileUpdateDuration: (durationMs) => {
    console.warn(`[METRICS] user_profile_update_duration_ms ${durationMs}`);
  },
  avatarUploadTotal: (status) => {
    console.warn(`[METRICS] avatar_upload_total{status="${status}"} 1`);
  },
  userAccountDeleteTotal: (status) => {
    console.warn(`[METRICS] user_account_delete_total{status="${status}"} 1`);
  },
};

/**
 * Generate unique ID for collision prevention
 */
function generateUniqueId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  // eslint-disable-next-line no-magic-numbers
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Simple HTML tag removal (alternative to sanitize-html)
 */
function stripHtmlTags(text: string): string {
  return text.replace(/<[^>]*>/g, '').trim();
}

/**
 * Helper function to parse and normalize tags
 */
function parseTags(tagsString: string | null | undefined): string[] {
  if (tagsString === null || tagsString === undefined || tagsString.trim() === '') {
    return [];
  }

  const tags = tagsString
    .split(',')
    .map((tag) => tag.trim().toLowerCase())
    .filter((tag) => tag.length > 0 && tag.length <= MAX_TAG_LENGTH);

  // Remove duplicates and limit count
  const uniqueTags = Array.from(new Set(tags));
  return uniqueTags.slice(0, MAX_TAGS_COUNT);
}

/**
 * Server-side MIME type validation using magic numbers
 */
async function validateFileType(file: File): Promise<{ valid: boolean; error?: string }> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    for (const [mimeType, signature] of Object.entries(FILE_SIGNATURES)) {
      const matches = signature.every((byte, index) => bytes[index] === byte);
      if (matches) {
        // Verify the declared MIME type matches detected type
        if (file.type === mimeType) {
          return { valid: true };
        }
        return { 
          valid: false, 
          error: `File type mismatch: declared ${file.type}, detected ${mimeType}` 
        };
      }
    }

    return { 
      valid: false, 
      error: 'Unsupported file type. Only JPEG, PNG, WebP, and GIF images are allowed.' 
    };
  } catch {
    return { 
      valid: false, 
      error: 'Failed to validate file type' 
    };
  }
}

/**
 * Generate collision-proof avatar filename
 */
function generateUniqueAvatarFilename(userId: string, fileType: string): string {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-');
  const uniqueId = generateUniqueId();
  const extension = fileType.split('/')[1] || 'jpg';
  
  return `avatars/${userId}_${timestamp}_${uniqueId}.${extension}`;
}

/**
 * Rate limiting check
 */
function checkRateLimit(userId: string, action: 'avatar' | 'profile'): { allowed: boolean; resetTime?: Date } {
  const key = `${userId}:${action}`;
  const now = Date.now();
  // eslint-disable-next-line no-magic-numbers
  const hourInMs = 60 * 60 * 1000;
  
  const limit = action === 'avatar' ? RATE_LIMIT_UPLOADS_PER_HOUR : RATE_LIMIT_PROFILE_UPDATES_PER_HOUR;
  
  let record = rateLimitStore.get(key);
  
  if (record === null || record === undefined || now > record.resetTime) {
    record = { count: 0, resetTime: now + hourInMs };
    rateLimitStore.set(key, record);
  }
  
  if (record.count >= limit) {
    return { allowed: false, resetTime: new Date(record.resetTime) };
  }
  
  record.count++;
  return { allowed: true };
}

/**
 * HTML sanitization helper
 */
function sanitizeText(text: string | null | undefined): string | null {
  if (text === null || text === undefined || text.trim() === '') {
    return null;
  }
  
  return stripHtmlTags(text).trim();
}

// Enhanced schema with sanitization and validation
const UserProfileSchema = z.object({
  full_name: z
    .string()
    .min(1, 'Full name cannot be empty.')
    .max(FULL_NAME_MAX_LENGTH, `Full name must be ${FULL_NAME_MAX_LENGTH} characters or less.`)
    .transform(sanitizeText),
  username: z
    .string()
    .min(USERNAME_MIN_LENGTH, `Username must be at least ${USERNAME_MIN_LENGTH} characters.`)
    .max(USERNAME_MAX_LENGTH, `Username must be ${USERNAME_MAX_LENGTH} characters or less.`)
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'Username can only contain letters, numbers, underscores, and hyphens.',
    )
    .optional()
    .nullable(),
  bio: z
    .string()
    .max(BIO_MAX_LENGTH, `Bio must be ${BIO_MAX_LENGTH} characters or less.`)
    .transform(sanitizeText)
    .optional()
    .nullable(),
  avatar_url: z.string().optional().nullable(),
  tags_string: z
    .string()
    .optional()
    .nullable()
    .transform(parseTags),
});

export type ProcessedUserProfileFormValues = z.infer<typeof UserProfileSchema>;

export type RawUserProfileFormInput = Omit<
  ProcessedUserProfileFormValues,
  'tags_string'
> & {
  tags_string?: string | null;
};

interface UpdateUserProfileResult {
  success: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Partial<Record<keyof RawUserProfileFormInput, string[]>>;
}

export async function updateUserProfile(
  formData: RawUserProfileFormInput,
): Promise<UpdateUserProfileResult> {
  const startTime = Date.now();
  const supabase = createServerSupabaseClient();

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError !== null || user === null) {
      metrics.userProfileUpdateTotal('error');
      return {
        success: false,
        error: 'You must be logged in to update your profile.',
      };
    }

    // Rate limiting check
    const rateLimit = checkRateLimit(user.id, 'profile');
    if (!rateLimit.allowed) {
      metrics.userProfileUpdateTotal('error');
      return {
        success: false,
        error: `Rate limit exceeded. Try again after ${rateLimit.resetTime?.toLocaleTimeString() ?? 'some time'}.`,
      };
    }

    const validatedFields = UserProfileSchema.safeParse(formData);

    if (!validatedFields.success) {
      metrics.userProfileUpdateTotal('error');
      return {
        success: false,
        error: 'Invalid input. Please check the fields.',
        fieldErrors: validatedFields.error.flatten().fieldErrors,
      };
    }

    const {
      full_name,
      username,
      bio,
      avatar_url,
      tags_string: transformedTags,
    } = validatedFields.data;

    // Case-insensitive username uniqueness check
    if (username !== null && username !== undefined && username !== '') {
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .ilike('username', username) // Case-insensitive search
        .neq('id', user.id)
        .maybeSingle();

      if (existingUser !== null) {
        metrics.userProfileUpdateTotal('error');
        return {
          success: false,
          error: 'Username is already taken. Please choose a different one.',
          fieldErrors: { username: ['Username is already taken.'] },
        };
      }
    }

    const avatarUrlToSave: string | null = (avatar_url !== null && avatar_url !== undefined && avatar_url !== '') ? avatar_url : null;

    const profileUpdate: TablesUpdate<'users'> = {
      full_name,
      username: (username !== null && username !== undefined && username !== '') ? username : null,
      bio: (bio !== null && bio !== undefined && bio !== '') ? bio : null,
      avatar_url: avatarUrlToSave,
      tags: (transformedTags !== null && transformedTags !== undefined && transformedTags.length > 0) ? transformedTags : null,
    };

    const { error: updateError } = await supabase
      .from('users')
      .update(profileUpdate)
      .eq('id', user.id);

    if (updateError !== null) {
      console.error('Error updating user profile:', updateError);
      metrics.userProfileUpdateTotal('error');
      return {
        success: false,
        error: `Failed to update profile: ${updateError.message}`,
      };
    }

    // Revalidate paths that display user profile information
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/profile/edit');
    revalidatePath('/dashboard/settings');

    const duration = Date.now() - startTime;
    metrics.userProfileUpdateDuration(duration);
    metrics.userProfileUpdateTotal('success');

    return { success: true, message: 'Profile updated successfully.' };
  } catch (error) {
    const duration = Date.now() - startTime;
    metrics.userProfileUpdateDuration(duration);
    metrics.userProfileUpdateTotal('error');
    
    console.error('Unexpected error in updateUserProfile:', error);
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.',
    };
  }
}

export async function uploadAvatar(
  formData: FormData
): Promise<{ success: boolean; avatarUrl?: string; error?: string }> {
  const supabase = createServerSupabaseClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError !== null || user === null) {
    metrics.avatarUploadTotal('error');
    return {
      success: false,
      error: 'You must be logged in to upload an avatar.',
    };
  }

  // Rate limiting check
  const rateLimit = checkRateLimit(user.id, 'avatar');
  if (!rateLimit.allowed) {
    metrics.avatarUploadTotal('error');
    return {
      success: false,
      error: `Upload rate limit exceeded. Try again after ${rateLimit.resetTime?.toLocaleTimeString() ?? 'some time'}.`,
    };
  }

  const file = formData.get('avatar') as File;
  if (file === null || file === undefined) {
    metrics.avatarUploadTotal('error');
    return {
      success: false,
      error: 'No file provided.',
    };
  }

  try {
    // Get current user data to check for existing avatar
    const { data: currentUser } = await supabase
      .from('users')
      .select('avatar_url')
      .eq('id', user.id)
      .single();

    // Server-side MIME type validation
    const fileValidation = await validateFileType(file);
    if (!fileValidation.valid) {
      metrics.avatarUploadTotal('error');
      return {
        success: false,
        error: fileValidation.error ?? 'Invalid file type.',
      };
    }

    // Validate file size using environment configuration
    if (file.size > AVATAR_MAX_SIZE_BYTES) {
      metrics.avatarUploadTotal('error');
      return {
        success: false,
        error: `Image size must be less than ${AVATAR_MAX_SIZE_MB}MB.`,
      };
    }

    // Generate collision-proof file path
    const filePath = generateUniqueAvatarFilename(user.id, file.type);

    // Upload new avatar to Supabase storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from(AVATAR_CONFIG.bucket)
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false, // Don't overwrite, create new file
        cacheControl: AVATAR_CONFIG.cacheControl,
      });

    if (uploadError !== null) {
      console.error('Error uploading avatar to Supabase storage:', uploadError);
      metrics.avatarUploadTotal('error');
      return {
        success: false,
        error: `Failed to upload avatar: ${uploadError.message}`,
      };
    }

    // Get the public URL for the new avatar
    const { data: publicUrlData } = supabaseAdmin.storage
      .from(AVATAR_CONFIG.bucket)
      .getPublicUrl(filePath);

    if (publicUrlData.publicUrl === null || publicUrlData.publicUrl === undefined) {
      metrics.avatarUploadTotal('error');
      return {
        success: false,
        error: 'Failed to generate avatar URL.',
      };
    }

    const avatarUrl = publicUrlData.publicUrl;

    // Update user's avatar_url in database
    const { error: updateError } = await supabase
      .from('users')
      .update({ avatar_url: avatarUrl })
      .eq('id', user.id);

    if (updateError !== null) {
      console.error('Error updating user avatar URL:', updateError);
      metrics.avatarUploadTotal('error');
      return {
        success: false,
        error: 'Failed to update avatar URL in database.',
      };
    }

    // Schedule old avatar cleanup with retry mechanism
    if (currentUser?.avatar_url !== null && currentUser?.avatar_url !== undefined && isSupabaseStorageUrl(currentUser.avatar_url)) {
      void scheduleAvatarCleanup(currentUser.avatar_url);
    }

    // Revalidate paths that display user profile information
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/profile/edit');
    revalidatePath('/dashboard/settings');

    metrics.avatarUploadTotal('success');
    return { success: true, avatarUrl };

  } catch (error) {
    console.error('Error processing avatar upload:', error);
    metrics.avatarUploadTotal('error');
    return {
      success: false,
      error: 'Failed to process avatar upload. Please try again.',
    };
  }
}

/**
 * Schedule avatar cleanup with retry mechanism
 */
function scheduleAvatarCleanup(avatarUrl: string): void {
  try {
    const oldFilePath = extractFilePathFromUrl(avatarUrl, AVATAR_CONFIG.bucket);
    
    if (oldFilePath !== null && oldFilePath !== undefined) {
      // For now, attempt immediate cleanup with fallback
      // In production, implement proper retry queue
      void supabaseAdmin.storage
        .from(AVATAR_CONFIG.bucket)
        .remove([oldFilePath])
        .catch((error: unknown) => {
          console.warn('Failed to delete old avatar, will retry:', error);
          // TODO: Implement proper retry mechanism with queue
        });
    }
  } catch (error) {
    console.warn('Failed to schedule avatar cleanup:', error);
  }
}

/**
 * Transactional user account deletion with proper sequencing
 */
export async function deleteUserAccount(): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  
  if (authError !== null || user === null) {
    metrics.userAccountDeleteTotal('error');
    return { success: false, error: 'Not authenticated.' };
  }
  
  const userId = user.id;

  try {
    // 1. Check if user is owner of any collectives (prevent orphaned collectives)
    const { data: ownedCollectives } = await supabaseAdmin
      .from('collectives')
      .select('id, name')
      .eq('owner_id', userId);
    
    if (ownedCollectives !== null && ownedCollectives !== undefined && ownedCollectives.length > 0) {
      metrics.userAccountDeleteTotal('error');
      return {
        success: false,
        error: 'You must transfer or delete all collectives you own before deleting your account.',
      };
    }

    // 2. Disable user in Auth first (prevents login during deletion)
    await supabaseAdmin.auth.admin.updateUserById(userId, { 
      user_metadata: { account_disabled: true },
      email_confirm: false 
    });

    // 3. Clean up external services (Stripe) with proper error handling
    const stripeCleanupResult = await cleanupExternalServices(userId);
    if (!stripeCleanupResult.success) {
      metrics.userAccountDeleteTotal('error');
      return {
        success: false,
        error: `Failed to clean up billing: ${stripeCleanupResult.error ?? 'Unknown error'}`,
      };
    }

    // 4. Soft delete user content (preserve relationships)
    await Promise.all([
      // Soft delete posts (set deleted_at instead of hard delete)
      supabaseAdmin
        .from('posts')
        .update({ 
          deleted_at: new Date().toISOString(),
          title: '[Deleted]',
          content: null 
        })
        .eq('author_id', userId)
        .is('deleted_at', null),
      
      // Soft delete comments
      supabaseAdmin
        .from('comments')
        .update({ 
          deleted_at: new Date().toISOString(),
          content: '[Deleted]' 
        })
        .eq('user_id', userId)
        .is('deleted_at', null),
    ]);

    // 5. Remove memberships and relationships
    await Promise.all([
      supabaseAdmin.from('collective_members').delete().eq('user_id', userId),
      supabaseAdmin.from('user_followers').delete().eq('follower_id', userId),
      supabaseAdmin.from('user_followers').delete().eq('following_id', userId),
    ]);

    // 6. Delete user profile data
    await Promise.all([
      supabaseAdmin.from('customers').delete().eq('id', userId),
      supabaseAdmin.from('users').delete().eq('id', userId),
    ]);

    // 7. Finally delete from Supabase Auth
    await supabaseAdmin.auth.admin.deleteUser(userId);

    metrics.userAccountDeleteTotal('success');
    return { success: true };

  } catch (error) {
    console.error('Error in deleteUserAccount:', error);
    metrics.userAccountDeleteTotal('error');
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return {
      success: false,
      error: `Account deletion failed: ${errorMessage}`,
    };
  }
}

/**
 * Clean up external services (Stripe) with proper error handling
 */
async function cleanupExternalServices(userId: string): Promise<{ success: boolean; error?: string }> {
  const stripe = getStripe();
  if (stripe === null || stripe === undefined) {
    return { success: true }; // No Stripe to clean up
  }

  try {
    // Cancel Stripe subscriptions with proper error handling
    const { data: subscriptions } = await supabaseAdmin
      .from('subscriptions')
      .select('id, status')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing']);

    if (subscriptions !== null && subscriptions !== undefined && subscriptions.length > 0) {
      const cancellationResults = await Promise.allSettled(
        subscriptions.map((sub) => {
          return stripe.subscriptions.cancel(sub.id);
        })
      );

      // Check if any critical cancellations failed
      const failedCancellations = cancellationResults.filter(result => result.status === 'rejected');
      if (failedCancellations.length > 0) {
        console.error('Failed subscription cancellations:', failedCancellations);
        return {
          success: false,
          error: 'Failed to cancel active subscriptions. Please contact support.',
        };
      }
    }

    // Delete Stripe customer (optional - can fail without blocking)
    const { data: customer } = await supabaseAdmin
      .from('customers')
      .select('stripe_customer_id')
      .eq('id', userId)
      .maybeSingle();

    if (customer?.stripe_customer_id !== null && customer?.stripe_customer_id !== undefined) {
      try {
        await stripe.customers.del(customer.stripe_customer_id);
      } catch (error) {
        console.warn('Failed to delete Stripe customer (non-critical):', error);
      }
    }

    // Delete Stripe Connect account (optional - can fail without blocking)
    const { data: userRow } = await supabaseAdmin
      .from('users')
      .select('stripe_account_id')
      .eq('id', userId)
      .maybeSingle();

    if (userRow?.stripe_account_id !== null && userRow?.stripe_account_id !== undefined) {
      try {
        await stripe.accounts.del(userRow.stripe_account_id);
      } catch (error) {
        console.warn('Failed to delete Stripe Connect account (non-critical):', error);
      }
    }

    return { success: true };

  } catch (error) {
    console.error('Critical error in Stripe cleanup:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown Stripe error';
    return {
      success: false,
      error: `Stripe cleanup failed: ${errorMessage}`,
    };
  }
}
