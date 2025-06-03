'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { TablesUpdate } from '@/lib/database.types';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getStripe } from '@/lib/stripe';
import { 
  AVATAR_CONFIG, 
  generateAvatarFilename, 
  extractFilePathFromUrl, 
  isSupabaseStorageUrl 
} from '@/lib/utils/avatar';

// Schema for validating user profile updates
// Adjust fields and validation rules as necessary
const UserProfileSchema = z.object({
  full_name: z
    .string()
    .min(1, 'Full name cannot be empty.')
    .max(100, 'Full name must be 100 characters or less.'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters.')
    .max(30, 'Username must be 30 characters or less.')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'Username can only contain letters, numbers, underscores, and hyphens.',
    )
    .optional()
    .nullable(),
  bio: z
    .string()
    .max(500, 'Bio must be 500 characters or less.')
    .optional()
    .nullable(),
  avatar_url: z.string().optional().nullable(),
  // Assuming tags is an array of strings, to be stored as text[] in Supabase
  // For simplicity, we might handle string-to-array conversion here or expect a specific format.
  // Let's assume a comma-separated string for now from the form, then split into an array.
  tags_string: z
    .string()
    .optional()
    .nullable()
    .transform((val) =>
      val
        ? val
            .split(',')
            .map((tag) => tag.trim())
            .filter((tag) => tag)
        : [],
    ),
});

// This type represents the data *after* Zod parsing and transformation (tags_string is string[])
// export type UserProfileFormValues = z.infer<typeof UserProfileSchema>;
// We will rename this to reflect its post-transformation state.
export type ProcessedUserProfileFormValues = z.infer<typeof UserProfileSchema>;

// This type represents the raw form input *before* Zod transformation (tags_string is string | null | undefined)
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
  // Field errors should ideally map to RawUserProfileFormInput keys if they occur before transform
  fieldErrors?: Partial<Record<keyof RawUserProfileFormInput, string[]>>;
}

export async function updateUserProfile(
  formData: RawUserProfileFormInput, // Use the raw input type for the function signature
): Promise<UpdateUserProfileResult> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      error: 'You must be logged in to update your profile.',
    };
  }

  const validatedFields = UserProfileSchema.safeParse(formData);

  if (!validatedFields.success) {
    return {
      success: false,
      error: 'Invalid input. Please check the fields.',
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  // The validatedFields.data will have tags_string as string[] due to the transform
  const {
    full_name,
    username,
    bio,
    avatar_url,
    tags_string: transformed_tags,
  } = validatedFields.data;

  // Check username uniqueness if username is provided and different from current
  if (username) {
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .neq('id', user.id)
      .maybeSingle();

    if (existingUser) {
      return {
        success: false,
        error: 'Username is already taken. Please choose a different one.',
        fieldErrors: { username: ['Username is already taken.'] },
      };
    }
  }

  // For avatar_url, we expect either:
  // 1. null/empty (no avatar or removing avatar)
  // 2. A valid URL (keeping existing avatar or setting new one)
  // The actual file upload should be handled separately via a dedicated upload endpoint
  const avatarUrlToSave: string | null = avatar_url || null;

  const profileUpdate: TablesUpdate<'users'> = {
    full_name,
    username: username || null, // Ensure null if empty string
    bio: bio || null, // Ensure null if empty string
    avatar_url: avatarUrlToSave,
    tags:
      transformed_tags && transformed_tags.length > 0 ? transformed_tags : null, // Store as array or null
  };

  const { error: updateError } = await supabase
    .from('users')
    .update(profileUpdate)
    .eq('id', user.id);

  if (updateError) {
    console.error('Error updating user profile:', updateError);
    return {
      success: false,
      error: `Failed to update profile: ${updateError.message}`,
    };
  }

  // Revalidate paths that display user profile information
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/profile/edit');
  revalidatePath('/dashboard/settings');

  return { success: true, message: 'Profile updated successfully.' };
}

// New function specifically for handling avatar uploads
export async function uploadAvatar(
  formData: FormData
): Promise<{ success: boolean; avatarUrl?: string; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      error: 'You must be logged in to upload an avatar.',
    };
  }

  const file = formData.get('avatar') as File;
  if (!file) {
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

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return {
        success: false,
        error: 'File must be an image (JPEG, PNG, WebP, etc.).',
      };
    }

    // Validate file size
    if (file.size > AVATAR_CONFIG.maxSize) {
      return {
        success: false,
        error: 'Image size must be less than 10MB.',
      };
    }

    // Generate file path using utility function
    const filePath = generateAvatarFilename(user.id, file.type);

    // Upload new avatar to Supabase storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from(AVATAR_CONFIG.bucket)
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false, // Don't overwrite, create new file
        cacheControl: AVATAR_CONFIG.cacheControl,
      });

    if (uploadError) {
      console.error('Error uploading avatar to Supabase storage:', uploadError);
      return {
        success: false,
        error: `Failed to upload avatar: ${uploadError.message}`,
      };
    }

    // Get the public URL for the new avatar
    const { data: publicUrlData } = supabaseAdmin.storage
      .from(AVATAR_CONFIG.bucket)
      .getPublicUrl(filePath);

    if (!publicUrlData.publicUrl) {
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

    if (updateError) {
      console.error('Error updating user avatar URL:', updateError);
      return {
        success: false,
        error: 'Failed to update avatar URL in database.',
      };
    }

    // Clean up old avatar if it exists and was stored in our bucket
    if (currentUser?.avatar_url && isSupabaseStorageUrl(currentUser.avatar_url)) {
      try {
        const oldFilePath = extractFilePathFromUrl(currentUser.avatar_url, AVATAR_CONFIG.bucket);
        
        if (oldFilePath) {
          // Delete old avatar (don't await to avoid blocking the response)
          supabaseAdmin.storage
            .from(AVATAR_CONFIG.bucket)
            .remove([oldFilePath])
            .catch(error => {
              console.warn('Could not delete old avatar:', error.message);
            });
        }
      } catch (error) {
        // Log warning but don't fail the operation
        console.warn('Error cleaning up old avatar:', error);
      }
    }

    // Revalidate paths that display user profile information
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/profile/edit');
    revalidatePath('/dashboard/settings');

    return { success: true, avatarUrl };

  } catch (error) {
    console.error('Error processing avatar upload:', error);
    return {
      success: false,
      error: 'Failed to process avatar upload. Please try again.',
    };
  }
}

export async function deleteUserAccount(): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Not authenticated.' };
  }
  const userId = user.id;

  // 1. Check if user is owner of any collectives
  const { data: ownedCollectives } = await supabaseAdmin
    .from('collectives')
    .select('id, name')
    .eq('owner_id', userId);
  if (ownedCollectives && ownedCollectives.length > 0) {
    return {
      success: false,
      error:
        'You must transfer or delete all collectives you own before deleting your account.',
    };
  }

  // 2. Cancel Stripe subscriptions (as subscriber)
  const stripe = getStripe();
  if (stripe) {
    const { data: subscriptions } = await supabaseAdmin
      .from('subscriptions')
      .select('id, status')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing']);
    if (subscriptions) {
      // Cancel all subscriptions in parallel
      await Promise.all(
        subscriptions.map(async (sub) => {
          try {
            await stripe.subscriptions.cancel(sub.id);
          } catch (err) {
            console.error('Error cancelling Stripe subscription:', err);
          }
        })
      );
    }
    // 3. Delete Stripe customer (if exists)
    const { data: customer } = await supabaseAdmin
      .from('customers')
      .select('stripe_customer_id')
      .eq('id', userId)
      .maybeSingle();
    if (customer?.stripe_customer_id) {
      try {
        await stripe.customers.del(customer.stripe_customer_id);
      } catch (err) {
        console.error('Error deleting Stripe customer:', err);
      }
    }
    // 4. Delete Stripe Connect account (if exists)
    const { data: userRow } = await supabaseAdmin
      .from('users')
      .select('stripe_account_id')
      .eq('id', userId)
      .maybeSingle();
    if (userRow?.stripe_account_id) {
      try {
        await stripe.accounts.del(userRow.stripe_account_id);
      } catch (err) {
        console.error('Error deleting Stripe Connect account:', err);
      }
    }
  }

  // 5. Remove from all memberships
  await supabaseAdmin.from('collective_members').delete().eq('user_id', userId);

  // 6. Delete/anonymize user content (posts, comments, etc.)
  // (Optional: anonymize instead of delete for posts/comments)
  await supabaseAdmin.from('posts').delete().eq('author_id', userId);
  await supabaseAdmin.from('comments').delete().eq('user_id', userId);

  // 7. Delete from users/profile tables
  await supabaseAdmin.from('users').delete().eq('id', userId);
  await supabaseAdmin.from('customers').delete().eq('id', userId);

  // 8. Delete from Supabase Auth
  try {
    await supabaseAdmin.auth.admin.deleteUser(userId);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: `Failed to delete Supabase Auth user: ${message}`,
    };
  }

  return { success: true };
}
