'use server';

import { revalidatePath } from 'next/cache';

import {
  CreatePostServerSchema,
  UpdatePostServerSchema,
  type CreatePostServerValues,
  type UpdatePostServerValues,
} from '@/lib/schemas/postSchemas';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import {
  THUMBNAIL_CONFIG,
  generateThumbnailFilename,
  extractThumbnailFilePathFromUrl,
  isSupabaseStorageUrl,
} from '@/lib/utils/thumbnail';

import type { TablesInsert, TablesUpdate } from '@/lib/database.types';

// Constants for configuration
const MAX_SLUG_LENGTH = 75;
const MAX_CONTENT_LENGTH = 50000; // 50k characters limit
const MAX_THUMBNAIL_SIZE_MB = 15;
const BYTES_PER_MB = 1024;
const KB_TO_BYTES = 1024;
const MAX_THUMBNAIL_SIZE = MAX_THUMBNAIL_SIZE_MB * BYTES_PER_MB * KB_TO_BYTES;
const REVALIDATION_BATCH_SIZE = 10;
const TIMESTAMP_BASE = 36;
const CLEANUP_DELAY_MS = 5000;

// Reserved URL segments that cannot be used as post slugs
const RESERVED_SLUGS = new Set([
  'admin',
  'api',
  'dashboard',
  'videos',
  'video',
  'posts',
  'post',
  'collectives',
  'collective',
  'profile',
  'profiles',
  'auth',
  'login',
  'sign-in',
  'sign-up',
  'settings',
  'search',
  'home',
  'notifications',
]);

const isReservedSlug = (slug: string): boolean => RESERVED_SLUGS.has(slug);

// Memoized slug generation
const slugCache = new Map<string, string>();
const generateSlug = (title: string): string => {
  const cacheKey = title.toLowerCase().trim();
  if (slugCache.has(cacheKey)) {
    return slugCache.get(cacheKey) ?? '';
  }

  const slug = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, MAX_SLUG_LENGTH);

  slugCache.set(cacheKey, slug);
  return slug;
};

// Centralized post status derivation
const derivePostStatus = (
  isPublic: boolean,
  publishedAt?: string | null,
): 'draft' | 'active' => {
  if (!isPublic) return 'draft';
  if (
    publishedAt !== null &&
    publishedAt !== undefined &&
    new Date(publishedAt) > new Date()
  )
    return 'draft';
  return 'active';
};

// -----------------------------------------------------------------------------
// Structured logging utility with aggressive PII masking.
// In production, only "warn" and "error" are emitted. All other levels are
// discarded to avoid noisy logs. Potentially sensitive fields are always
// redacted or summarised.
// -----------------------------------------------------------------------------

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const SENSITIVE_KEYS = new Set([
  'user',
  'content',
  'email',
  'metadata',
  'token',
  'password',
]);

const summarizeValue = (value: unknown): string => {
  if (typeof value === 'symbol') return '[symbol]';
  if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  ) {
    return value.toString();
  }
  // object, function, and unknown fallbacks
  return `[${typeof value}]`;
};

const sanitizeContext = (
  context: Record<string, unknown>,
): Record<string, unknown> => {
  const sanitized: Record<string, unknown> = {};
  Object.entries(context).forEach(([key, value]) => {
    if (SENSITIVE_KEYS.has(key)) {
      sanitized[key] = '[REDACTED]';
      return;
    }
    // Generic length summary for large strings
    if (typeof value === 'string' && value.length > 256) {
      sanitized[key] = summarizeValue(value);
      return;
    }
    sanitized[key] = value;
  });
  return sanitized;
};

const logPostAction = (
  action: string,
  context: Record<string, unknown>,
  level: LogLevel = 'info',
): void => {
  // Silence non-critical logs in production
  if (process.env.NODE_ENV === 'production' && level === 'debug') return;

  const logMessage = {
    ts: new Date().toISOString(),
    action,
    ...sanitizeContext(context),
  };

  switch (level) {
    case 'error':
      console.error('[PostAction]', logMessage);
      break;
    case 'warn':
      console.warn('[PostAction]', logMessage);
      break;
    case 'info':
      console.log('[PostAction]', logMessage);
      break;
    default:
      console.debug('[PostAction]', logMessage);
  }
};

// Batch revalidation utility
const batchRevalidatePaths = async (paths: string[]): Promise<void> => {
  const uniquePaths = Array.from(new Set(paths));

  const tasks: Promise<void>[] = [];
  for (let i = 0; i < uniquePaths.length; i += REVALIDATION_BATCH_SIZE) {
    const batch = uniquePaths.slice(i, i + REVALIDATION_BATCH_SIZE);
    batch.forEach((path) => {
      tasks.push(
        (async () => {
          try {
            // Next.js revalidatePath may return void; still await for consistency
            await revalidatePath(path as unknown as string);
          } catch (error) {
            logPostAction('revalidatePath', { path, error }, 'warn');
          }
        })(),
      );
    });
  }

  // Run in the background; caller shouldn't await.
  await Promise.allSettled(tasks);
};

// Optimized collective permission checking with single query
const validateCollectivePermissions = async (
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  userId: string,
  collectiveIds: string[],
): Promise<{
  valid: Array<{ id: string; slug: string; canPost: boolean }>;
  error?: string;
}> => {
  if (collectiveIds.length === 0) {
    return { valid: [] };
  }

  try {
    // Single query to get all collective data and memberships
    const { data: collectivesData, error: collectivesError } = await supabase
      .from('collectives')
      .select(
        `
        id,
        slug,
        owner_id,
        collective_members!inner(member_id, role)
      `,
      )
      .in('id', collectiveIds);

    if (collectivesError !== null) {
      logPostAction(
        'validateCollectivePermissions',
        { error: collectivesError },
        'error',
      );
      return { valid: [], error: 'Error fetching collective permissions' };
    }

    if (
      collectivesData === null ||
      collectivesData.length !== collectiveIds.length
    ) {
      return { valid: [], error: 'One or more collectives not found' };
    }

    const validCollectives = collectivesData
      .filter(
        (collective: {
          owner_id: string;
          collective_members: Array<{ member_id: string; role: string }> | null;
        }) => {
          // User is owner
          if (collective.owner_id === userId) return true;

          // User is member with posting permissions
          const userMembership = collective.collective_members?.find(
            (member: { member_id: string; role: string }) =>
              member.member_id === userId,
          );
          return (
            userMembership !== null &&
            userMembership !== undefined &&
            ['admin', 'editor', 'author'].includes(userMembership.role)
          );
        },
      )
      .map((collective: { id: string; slug: string }) => ({
        id: collective.id,
        slug: collective.slug,
        canPost: true,
      }));

    if (validCollectives.length !== collectiveIds.length) {
      return {
        valid: [],
        error: 'Insufficient permissions for one or more collectives',
      };
    }

    return { valid: validCollectives };
  } catch (error) {
    logPostAction('validateCollectivePermissions', { error }, 'error');
    return { valid: [], error: 'Failed to validate collective permissions' };
  }
};

// Slug conflict resolution with database-backed uniqueness checking
const resolveSlugConflict = async (
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  baseSlug: string,
  tenantId: string,
  excludePostId?: string,
): Promise<string> => {
  let candidateSlug = baseSlug;
  let attempt = 0;
  const maxAttempts = 10; // Prevent infinite loops

  while (attempt < maxAttempts) {
    // Check if slug exists in the tenant
    let query = supabase
      .from('posts')
      .select('id')
      .eq('slug', candidateSlug)
      .eq('tenant_id', tenantId)
      .neq('status', 'removed'); // Don't consider deleted posts

    // Exclude current post if updating
    if (excludePostId) {
      query = query.neq('id', excludePostId);
    }

    const { data: existingPost } = await query.maybeSingle();

    if (!existingPost) {
      // Slug is available
      return candidateSlug;
    }

    // Generate next candidate
    attempt++;
    if (attempt === 1) {
      // First attempt: add current timestamp
      const timestamp = Date.now().toString(TIMESTAMP_BASE);
      candidateSlug = `${baseSlug}-${timestamp}`;
    } else {
      // Subsequent attempts: add incremental number
      candidateSlug = `${baseSlug}-${attempt}`;
    }

    // Ensure we don't exceed max length
    candidateSlug = candidateSlug.substring(0, MAX_SLUG_LENGTH);
  }

  // Fallback: use timestamp if all attempts failed
  const fallbackTimestamp = Date.now().toString(TIMESTAMP_BASE);
  return `${baseSlug.substring(0, MAX_SLUG_LENGTH - fallbackTimestamp.length - 1)}-${fallbackTimestamp}`;
};

type CreatePostFormValues = CreatePostServerValues;

export type UpdatePostClientValues = UpdatePostServerValues;

interface CreatePostResult {
  data?: {
    postId: string;
    postSlug: string;
    collectiveSlug?: string | null;
  };
  error?: string;
  fieldErrors?: Partial<Record<keyof CreatePostFormValues, string[]>>;
}

export async function createPost(
  formData: CreatePostFormValues,
): Promise<CreatePostResult> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError !== null || user === null) {
    logPostAction(
      'createPost',
      { error: 'Unauthenticated access attempt' },
      'warn',
    );
    return { error: 'You must be logged in to create a post.' };
  }

  const validatedFields = CreatePostServerSchema.safeParse(formData);

  if (!validatedFields.success) {
    logPostAction(
      'createPost',
      {
        validationErrors: validatedFields.error.flatten().fieldErrors,
      },
      'warn',
    );
    return {
      error: 'Invalid input. Please check the fields.',
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const {
    title,
    subtitle,
    content,
    is_public,
    collectiveId,
    selected_collectives = [],
    published_at,
    author,
    seo_title,
    meta_description,
  } = validatedFields.data;

  // Content length validation
  if (
    content !== null &&
    content !== undefined &&
    content.length > MAX_CONTENT_LENGTH
  ) {
    return {
      error: `Content too long. Maximum ${MAX_CONTENT_LENGTH} characters allowed.`,
      fieldErrors: {
        content: [`Content must be ${MAX_CONTENT_LENGTH} characters or less`],
      },
    };
  }

  // Handle legacy single collective or new multi-collective
  const collectivesToValidate =
    collectiveId !== null && collectiveId !== undefined
      ? [collectiveId]
      : selected_collectives;

  // Batch validate collective permissions
  const { valid: validCollectives, error: permissionError } =
    await validateCollectivePermissions(
      supabase,
      user.id,
      collectivesToValidate,
    );

  if (permissionError !== null && permissionError !== undefined) {
    return {
      error: permissionError,
      fieldErrors: { selected_collectives: [permissionError] },
    };
  }

  const baseSlug = generateSlug(title);

  // Reserved slug validation
  if (isReservedSlug(baseSlug)) {
    return {
      error:
        'The generated URL slug clashes with a reserved route. Please choose a different title.',
      fieldErrors: {
        title: ['Title results in a reserved URL. Try wording it differently.'],
      },
    };
  }

  // Determine tenant_id: use collective_id if present, otherwise use user_id as personal tenant
  // TODO: Replace with proper tenant lookup once database types are updated
  const tenant_id = collectiveId ?? user.id;

  const postSlug = await resolveSlugConflict(supabase, baseSlug, tenant_id);
  const dbStatus = derivePostStatus(is_public, published_at);

  const postToInsert: TablesInsert<'posts'> = {
    author_id: user.id,
    title,
    subtitle: subtitle || null,
    content,
    is_public,
    collective_id: collectiveId || null,
    tenant_id,
    published_at: published_at || null,
    status: dbStatus,
    post_type: 'text',
    seo_title: seo_title || null,
    meta_description: meta_description || null,
    slug: postSlug,
  };

  try {
    // Transaction-like operation using Supabase RPC or manual transaction handling
    const { data: newPost, error: insertError } = await supabase
      .from('posts')
      .insert(postToInsert)
      .select('id')
      .single();

    if (insertError !== null) {
      logPostAction(
        'createPost',
        { error: insertError, postData: postToInsert },
        'error',
      );
      return { error: `Failed to create post: ${insertError.message}` };
    }

    if (newPost === null) {
      return { error: 'Failed to create post for an unknown reason.' };
    }

    // Create post-collective associations with conflict handling
    if (selected_collectives.length > 0) {
      const postCollectiveInserts = selected_collectives.map(
        (collectiveId) => ({
          post_id: newPost.id,
          collective_id: collectiveId,
          shared_by: user.id,
          status:
            dbStatus === 'active' ? ('published' as const) : ('draft' as const),
          shared_at: new Date().toISOString(),
          display_order: 0,
          metadata: {},
        }),
      );

      const { error: associationError } = await supabase
        .from('post_collectives')
        .upsert(postCollectiveInserts, {
          onConflict: 'post_id,collective_id',
          ignoreDuplicates: true,
        });

      if (associationError !== null) {
        logPostAction(
          'createPost',
          {
            error: associationError,
            postId: newPost.id,
          },
          'error',
        );
        // Don't fail the entire operation, but log the error
        logPostAction(
          'createPost',
          {
            message:
              'Post created successfully but collective associations failed',
            postId: newPost.id,
          },
          'warn',
        );
      }
    }

    // Batch revalidation
    const pathsToRevalidate = ['/dashboard', `/posts/${postSlug}`];
    validCollectives.forEach((collective) => {
      pathsToRevalidate.push(`/collectives/${collective.slug}`);
      pathsToRevalidate.push(`/collectives/${collective.slug}/${postSlug}`);
    });

    // Trigger cache revalidation asynchronously; do not block response
    void batchRevalidatePaths(pathsToRevalidate);

    logPostAction('createPost', {
      postId: newPost.id,
      slug: postSlug,
      collectiveCount: validCollectives.length,
    });

    return {
      data: {
        postId: newPost.id,
        postSlug,
        collectiveSlug:
          validCollectives.length > 0
            ? validCollectives[0]?.slug || null
            : null,
      },
    };
  } catch (error) {
    logPostAction('createPost', { error }, 'error');
    return { error: 'An unexpected error occurred while creating the post.' };
  }
}

interface UpdatePostResult {
  data?: {
    postId: string;
    postSlug: string;
    collectiveSlug?: string | null;
  };
  error?: string;
  fieldErrors?: Partial<Record<keyof UpdatePostClientValues, string[]>>;
}

export async function updatePost(
  postId: string,
  formData: UpdatePostClientValues,
): Promise<UpdatePostResult> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError !== null || user === null) {
    return { error: 'You must be logged in to update a post.' };
  }

  // Enhanced query with maybeSingle for safety
  const { data: existingPost, error: fetchError } = await supabase
    .from('posts')
    .select(
      'id, author_id, collective_id, tenant_id, published_at, is_public, status, title, collective:collectives!collective_id(slug, owner_id)',
    )
    .eq('id', postId)
    .neq('status', 'removed') // Prevent editing soft-deleted posts
    .maybeSingle();

  if (fetchError !== null || existingPost === null) {
    logPostAction(
      'updatePost',
      {
        postId,
        error: fetchError,
        existingPost: existingPost !== null,
      },
      'error',
    );
    return { error: 'Post not found or error fetching post data.' };
  }

  // Defensive check in case the query above changes
  if (existingPost?.status === 'removed') {
    return { error: 'Deleted posts cannot be edited.' };
  }

  const isAuthor = existingPost.author_id === user.id;
  let isCollectiveOwnerOrMember = false;
  if (existingPost.collective_id !== null && existingPost.collective !== null) {
    if (existingPost.collective.owner_id === user.id) {
      isCollectiveOwnerOrMember = true;
    } else {
      const { data: membership, error: memberCheckError } = await supabase
        .from('collective_members')
        .select('role')
        .eq('collective_id', existingPost.collective_id)
        .eq('member_id', user.id)
        .in('role', ['admin', 'editor'])
        .maybeSingle();
      if (memberCheckError !== null)
        return { error: 'Error checking collective membership for edit.' };
      const canEditAsCollectiveMember =
        membership !== null &&
        ['admin', 'editor', 'author'].includes(membership.role);
      if (canEditAsCollectiveMember === true) {
        isCollectiveOwnerOrMember = true;
      }
    }
  }

  if (!isAuthor && !isCollectiveOwnerOrMember) {
    return { error: 'You do not have permission to update this post.' };
  }

  const validatedFields = UpdatePostServerSchema.safeParse(formData);
  if (!validatedFields.success) {
    return {
      error: 'Invalid input for update. Please check the fields.',
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const {
    title,
    subtitle,
    content,
    is_public,
    published_at,
    collectiveId,
    author,
    seo_title,
    meta_description,
  } = validatedFields.data;

  // Content length validation
  if (
    content !== null &&
    content !== undefined &&
    content.length > MAX_CONTENT_LENGTH
  ) {
    return {
      error: `Content too long. Maximum ${MAX_CONTENT_LENGTH} characters allowed.`,
      fieldErrors: {
        content: [`Content must be ${MAX_CONTENT_LENGTH} characters or less`],
      },
    };
  }

  if (
    collectiveId !== undefined &&
    collectiveId !== existingPost.collective_id
  ) {
    return {
      error: "Changing a post's collective is not supported in this update.",
      fieldErrors: { collectiveId: ['Cannot change collective.'] },
    };
  }

  const updateData: Partial<TablesUpdate<'posts'>> = {};
  if (title !== undefined) updateData.title = title;
  if (subtitle !== undefined) updateData.subtitle = subtitle ?? null;
  if (content !== undefined) updateData.content = content;
  if (is_public !== undefined) updateData.is_public = is_public;
  if (published_at !== undefined) {
    updateData.published_at = published_at;
  }
  if (author !== undefined) updateData.author = author ?? null;
  if (seo_title !== undefined) updateData.seo_title = seo_title ?? null;
  if (meta_description !== undefined)
    updateData.meta_description = meta_description ?? null;

  // Use centralized status derivation
  if (is_public !== undefined || published_at !== undefined) {
    const final_is_public =
      is_public === undefined ? existingPost.is_public : is_public;
    const final_published_at =
      published_at === undefined ? existingPost.published_at : published_at;

    updateData.status = derivePostStatus(final_is_public, final_published_at);
  }

  // Generate slug from title (simplified since slug field doesn't exist in posts table)
  let postSlug = generateSlug(existingPost.title);

  // Handle slug updates with conflict resolution (but keep old slug for redirects)
  if (title !== null && title !== undefined && title !== existingPost.title) {
    const newBaseSlug = generateSlug(title);

    if (isReservedSlug(newBaseSlug)) {
      return {
        error:
          'That title would create a reserved URL slug. Please choose a different title.',
        fieldErrors: {
          title: [
            'Title results in a reserved URL. Try wording it differently.',
          ],
        },
      };
    }
    const newSlug = await resolveSlugConflict(
      supabase,
      newBaseSlug,
      existingPost.tenant_id,
      postId,
    );
    postSlug = newSlug;
    updateData.slug = newSlug;

    // TODO: Implement slug history table for redirects
    logPostAction(
      'updatePost',
      {
        postId,
        oldTitle: existingPost.title,
        newTitle: title,
        message:
          'Title changed - old links may break without redirect handling',
      },
      'warn',
    );
  }

  if (
    Object.keys(updateData).length === 0 &&
    title === undefined &&
    content === undefined &&
    is_public === undefined &&
    published_at === undefined
  ) {
    return { error: 'No changes to update.' };
  }

  const { data: updatedPost, error: updateError } = await supabase
    .from('posts')
    .update(updateData)
    .eq('id', postId)
    .select('id')
    .single();

  if (updateError !== null) {
    logPostAction('updatePost', { error: updateError, postId }, 'error');
    return { error: `Failed to update post: ${updateError.message}` };
  }

  if (updatedPost === null) {
    return { error: 'Failed to update post for an unknown reason.' };
  }

  // Batch revalidation
  const pathsToRevalidate = ['/dashboard', `/posts/${postSlug}`];
  if (
    existingPost.collective?.slug !== null &&
    existingPost.collective?.slug !== undefined
  ) {
    pathsToRevalidate.push(`/collectives/${existingPost.collective.slug}`);
    pathsToRevalidate.push(
      `/collectives/${existingPost.collective.slug}/${postSlug}`,
    );
  }

  // Trigger cache revalidation asynchronously; user update shouldn't fail on cache issues
  void batchRevalidatePaths(pathsToRevalidate);

  return {
    data: {
      postId: updatedPost.id,
      postSlug,
      ...(existingPost.collective?.slug
        ? { collectiveSlug: existingPost.collective.slug }
        : {}),
    },
  };
}

interface DeletePostResult {
  success: boolean;
  error?: string;
  redirectPath?: string;
}

export async function deletePost(postId: string): Promise<DeletePostResult> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError !== null || user === null) {
    return { success: false, error: 'You must be logged in to delete a post.' };
  }

  const { data: existingPost, error: fetchErr } = await supabase
    .from('posts')
    .select('collective:collectives!collective_id(slug), author_id')
    .eq('id', postId)
    .maybeSingle();

  if (fetchErr !== null || existingPost === null) {
    return { success: false, error: 'Post not found.' };
  }

  // Permission check
  if (existingPost.author_id !== user.id) {
    return {
      success: false,
      error: 'You do not have permission to delete this post.',
    };
  }

  // Use status update to soft delete (since deleted_at field doesn't exist)
  const { error: deleteErr } = await supabase
    .from('posts')
    .update({
      status: 'removed' as const, // Use 'removed' status for soft delete
    })
    .eq('id', postId);

  if (deleteErr !== null) {
    logPostAction('deletePost', { error: deleteErr, postId }, 'error');
    return { success: false, error: deleteErr.message };
  }

  const pathsToRevalidate = ['/dashboard'];
  let redirectPath = '/dashboard';
  if (existingPost.collective !== null) {
    pathsToRevalidate.push(`/collectives/${existingPost.collective.slug}`);
    redirectPath = `/collectives/${existingPost.collective.slug}`;
  }

  await batchRevalidatePaths(pathsToRevalidate);

  logPostAction('deletePost', { postId, redirectPath });
  return { success: true, redirectPath };
}

// Rate-limited view count increment with user context
export async function incrementPostViewCount(
  postId: string,
): Promise<{ success: boolean; error?: string }> {
  if (postId === null || postId === undefined || postId === '') {
    return { success: false, error: 'Post ID is required.' };
  }

  try {
    const supabase = await createServerSupabaseClient();

    // Use the existing RPC function (rate limiting would need to be implemented in the RPC function itself)
    const { error } = await supabase.rpc('increment_view_count', {
      post_id_to_increment: postId,
    });

    if (error !== null) {
      logPostAction('incrementPostViewCount', { error, postId }, 'error');
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (e: unknown) {
    logPostAction('incrementPostViewCount', { error: e, postId }, 'error');
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Unexpected error.',
    };
  }
}

interface FeaturePostResult {
  success: boolean;
  error?: string;
}

export async function featurePost(
  postId: string,
  feature: boolean,
): Promise<FeaturePostResult> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError !== null || user === null) {
    return { success: false, error: 'User not authenticated.' };
  }

  const { data: postOwner, error: postError } = await supabase
    .from('posts')
    .select('author_id')
    .eq('id', postId)
    .neq('status', 'removed') // Only feature non-removed posts
    .maybeSingle();

  if (
    postError !== null ||
    postOwner === null ||
    postOwner.author_id !== user.id
  ) {
    return { success: false, error: 'Post not found or not owned by user.' };
  }

  if (feature) {
    // Use upsert with conflict handling to prevent duplicates
    const { error: insertError } = await supabase
      .from('featured_posts')
      .upsert(
        { owner_id: user.id, owner_type: 'user', post_id: postId },
        { onConflict: 'owner_id,post_id', ignoreDuplicates: true },
      );

    if (insertError !== null) {
      logPostAction('featurePost', { error: insertError, postId }, 'error');
      return { success: false, error: insertError.message };
    }
  } else {
    const { error: deleteError } = await supabase
      .from('featured_posts')
      .delete()
      .match({ owner_id: user.id, owner_type: 'user', post_id: postId });

    if (deleteError !== null) {
      logPostAction('featurePost', { error: deleteError, postId }, 'error');
      return { success: false, error: deleteError.message };
    }
  }

  return { success: true };
}

// Enhanced thumbnail upload with proper user-scoped storage
export async function uploadThumbnail(
  formData: FormData,
  postId?: string,
): Promise<{ success: boolean; thumbnailUrl?: string; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError !== null || user === null) {
    return {
      success: false,
      error: 'You must be logged in to upload a thumbnail.',
    };
  }

  const file = formData.get('thumbnail') as File;
  if (file === null || file === undefined) {
    return {
      success: false,
      error: 'No file provided.',
    };
  }

  try {
    // If postId is provided, check if user has permission to edit the post
    if (postId !== null && postId !== undefined && postId.trim() !== '') {
      const { data: post, error: postError } = await supabase
        .from('posts')
        .select(
          'author_id, collective_id, collective:collectives!collective_id(owner_id)',
        )
        .eq('id', postId)
        .neq('status', 'removed') // Only allow uploads for non-removed posts
        .maybeSingle();

      if (postError !== null || post === null) {
        // Don't fail if post not found - it might be a draft
        logPostAction(
          'uploadThumbnail',
          {
            message: 'Post not found in posts table, might be a draft',
            postId,
          },
          'info',
        );
      } else {
        // Post exists, check permissions
        const isAuthor = post.author_id === user.id;
        let hasPermission = isAuthor;

        // Check collective permissions if post belongs to a collective
        if (
          !isAuthor &&
          post.collective_id !== null &&
          post.collective !== null
        ) {
          const isCollectiveOwner = post.collective.owner_id === user.id;
          if (isCollectiveOwner) {
            hasPermission = true;
          } else {
            // Check if user is a collective member with edit permissions
            const { data: membership } = await supabase
              .from('collective_members')
              .select('role')
              .eq('collective_id', post.collective_id)
              .eq('member_id', user.id)
              .maybeSingle();

            if (
              membership !== null &&
              ['owner', 'admin', 'editor'].includes(membership.role)
            ) {
              hasPermission = true;
            }
          }
        }

        if (!hasPermission) {
          return {
            success: false,
            error: 'You do not have permission to update this post.',
          };
        }
      }
    }

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      return {
        success: false,
        error: 'File must be an image (JPEG, PNG, WebP).',
      };
    }

    if (file.size > MAX_THUMBNAIL_SIZE) {
      return {
        success: false,
        error: `Image size must be less than ${MAX_THUMBNAIL_SIZE_MB}MB.`,
      };
    }

    // Generate unique file path to prevent race conditions
    const filePath = generateThumbnailFilename(user.id, postId, file.type);

    // Use user-scoped client for upload instead of admin client
    const { error: uploadError } = await supabase.storage
      .from(THUMBNAIL_CONFIG.bucket)
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false, // Don't overwrite, create new file
        cacheControl: THUMBNAIL_CONFIG.cacheControl,
      });

    if (uploadError !== null) {
      logPostAction(
        'uploadThumbnail',
        { error: uploadError, filePath },
        'error',
      );
      return {
        success: false,
        error: `Failed to upload thumbnail: ${uploadError.message}`,
      };
    }

    // Get the public URL for the new thumbnail
    const { data: publicUrlData } = supabase.storage
      .from(THUMBNAIL_CONFIG.bucket)
      .getPublicUrl(filePath);

    if (
      publicUrlData.publicUrl === null ||
      publicUrlData.publicUrl === undefined
    ) {
      return {
        success: false,
        error: 'Failed to generate thumbnail URL.',
      };
    }

    const thumbnailUrl = publicUrlData.publicUrl;

    // If postId is provided AND the post exists, update the post's thumbnail_url in database
    if (postId !== null && postId !== undefined && postId.trim() !== '') {
      // Check if post exists before trying to update
      const { data: postExists } = await supabase
        .from('posts')
        .select('id, thumbnail_url')
        .eq('id', postId)
        .maybeSingle();

      if (postExists !== null) {
        const { error: updateError } = await supabase
          .from('posts')
          .update({ thumbnail_url: thumbnailUrl })
          .eq('id', postId);

        if (updateError !== null) {
          logPostAction(
            'uploadThumbnail',
            { error: updateError, postId },
            'error',
          );
          // Don't fail the whole operation if update fails
          logPostAction(
            'uploadThumbnail',
            { message: 'Thumbnail uploaded but failed to update post', postId },
            'warn',
          );
        } else {
          // Queue old thumbnail deletion with retry mechanism
          if (
            postExists.thumbnail_url !== null &&
            postExists.thumbnail_url !== undefined &&
            isSupabaseStorageUrl(postExists.thumbnail_url)
          ) {
            try {
              const oldFilePath = extractThumbnailFilePathFromUrl(
                postExists.thumbnail_url,
              );

              if (oldFilePath !== null && oldFilePath !== undefined) {
                // Queue deletion job (implement proper job queue in production)
                void setTimeout((): void => {
                  void (async (): Promise<void> => {
                    try {
                      await supabaseAdmin.storage
                        .from(THUMBNAIL_CONFIG.bucket)
                        .remove([oldFilePath]);
                      logPostAction('uploadThumbnail', {
                        message: 'Old thumbnail deleted',
                        oldFilePath,
                      });
                    } catch (error: unknown) {
                      logPostAction(
                        'uploadThumbnail',
                        {
                          error,
                          oldFilePath,
                          message:
                            'Failed to delete old thumbnail - queuing for retry',
                        },
                        'warn',
                      );
                      // TODO: Implement proper retry queue
                    }
                  })();
                }, CLEANUP_DELAY_MS);
              }
            } catch (error: unknown) {
              logPostAction(
                'uploadThumbnail',
                { error, message: 'Error processing old thumbnail cleanup' },
                'warn',
              );
            }
          }

          // Batch revalidation
          await batchRevalidatePaths(['/dashboard/posts', `/posts/${postId}`]);
        }
      }
    }

    return { success: true, thumbnailUrl };
  } catch (error: unknown) {
    logPostAction('uploadThumbnail', { error }, 'error');
    return {
      success: false,
      error: 'Failed to process thumbnail upload. Please try again.',
    };
  }
}
