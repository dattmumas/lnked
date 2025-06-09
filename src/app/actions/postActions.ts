'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { TablesInsert, TablesUpdate, Enums } from '@/lib/database.types';
import {
  CreatePostServerSchema,
  UpdatePostServerSchema,
  type CreatePostServerValues,
  type UpdatePostServerValues,
} from '@/lib/schemas/postSchemas';
import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { 
  THUMBNAIL_CONFIG, 
  generateThumbnailFilename, 
  extractThumbnailFilePathFromUrl, 
  isSupabaseStorageUrl 
} from '@/lib/utils/thumbnail';

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

const generateSlug = (title: string): string =>
  title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 75);

// Helper to instantiate Supabase client in Server Actions

export async function createPost(
  formData: CreatePostFormValues,
): Promise<CreatePostResult> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: 'You must be logged in to create a post.' };
  }

  const validatedFields = CreatePostServerSchema.safeParse(formData);

  if (!validatedFields.success) {
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
  let collectiveSlug: string | null = null;

  // Handle legacy single collective or new multi-collective
  const collectivesToValidate = collectiveId ? [collectiveId] : selected_collectives;
  const collectiveValidationResults: Array<{ id: string; slug: string; canPost: boolean }> = [];

  // Validate permissions for all selected collectives
  if (collectivesToValidate.length > 0) {
    for (const cId of collectivesToValidate) {
      const { data: collectiveData, error: collectiveCheckError } = await supabase
        .from('collectives')
        .select('id, owner_id, slug')
        .eq('id', cId)
        .single<{ id: string; owner_id: string; slug: string }>();
      
      if (collectiveCheckError || !collectiveData) {
        return {
          error: `Collective not found: ${cId}`,
          fieldErrors: { selected_collectives: [`Invalid collective: ${cId}`] },
        };
      }

      const isOwner = collectiveData.owner_id === user.id;
      let isMember = false;
      
      if (!isOwner) {
        const { data: membership, error: memberCheckError } = await supabase
          .from('collective_members')
          .select('role')
          .eq('collective_id', cId)
          .eq('user_id', user.id)
          .maybeSingle<{ role: string }>();
          
        if (memberCheckError) {
          return { error: 'Error checking collective membership.' };
        }
        
        isMember = membership != null && ['admin', 'editor', 'author'].includes(membership.role);
      }

      if (!isOwner && !isMember) {
        return {
          error: `You do not have permission to post to collective: ${collectiveData.slug}`,
          fieldErrors: { selected_collectives: [`Permission denied for collective: ${collectiveData.slug}`] },
        };
      }

      collectiveValidationResults.push({
        id: cId,
        slug: collectiveData.slug,
        canPost: true
      });
    }

    // For backward compatibility, set collectiveSlug to the first collective's slug
    if (collectiveValidationResults.length > 0) {
      collectiveSlug = collectiveValidationResults[0].slug;
    }
  }

  const postSlug = generateSlug(title);

  let db_status: 'draft' | 'active' = 'draft';
  if (is_public) {
    if (published_at && new Date(published_at) > new Date()) {
      db_status = 'draft';
    } else {
      db_status = 'active';
    }
  }

  const postToInsert: TablesInsert<'posts'> = {
    author_id: user.id,
    title,
    subtitle: subtitle || null,
    content,
    is_public,
    collective_id: collectiveId || null,
    published_at,
    status: db_status,
    view_count: 0,
    like_count: 0,
    author: author || null,
    seo_title: seo_title || null,
    meta_description: meta_description || null,
  };

  const { data: newPost, error: insertError } = await supabase
    .from('posts')
    .insert(postToInsert)
    .select('id')
    .single<{ id: string }>();

  if (insertError) {
    console.error('Error inserting post:', insertError);
    return { error: `Failed to create post: ${insertError.message}` };
  }

  if (!newPost) {
    return { error: 'Failed to create post for an unknown reason.' };
  }

  // Create post-collective associations for multi-collective support
  if (selected_collectives.length > 0) {
    const postCollectiveInserts = selected_collectives.map(collectiveId => ({
      post_id: newPost.id,
      collective_id: collectiveId,
      shared_by: user.id,
      status: db_status === 'active' ? 'published' as const : 'draft' as const,
      shared_at: new Date().toISOString(),
      display_order: 0,
      metadata: {}
    }));

    const { error: associationError } = await supabase
      .from('post_collectives')
      .insert(postCollectiveInserts);

    if (associationError) {
      console.error('Error creating post-collective associations:', associationError);
      // Don't fail the entire operation, but log the error
      console.warn('Post created successfully but collective associations failed');
    }
  }

  revalidatePath('/dashboard');
  
  // Revalidate paths for all associated collectives
  if (collectiveValidationResults.length > 0) {
    for (const collective of collectiveValidationResults) {
      revalidatePath(`/collectives/${collective.slug}`);
      revalidatePath(`/collectives/${collective.slug}/${postSlug}`);
    }
  }
  
  revalidatePath(`/posts/${postSlug}`);

  return {
    data: {
      postId: newPost.id,
      postSlug,
      collectiveSlug,
    },
  };
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
  if (authError || !user) {
    return { error: 'You must be logged in to update a post.' };
  }

  // Ensure ExistingPostData includes status and is_public
  type ExistingPostData = {
    id: string;
    author_id: string;
    collective_id: string | null;
    published_at: string | null;
    is_public: boolean;
    status: Enums<'post_status_type'>;
    collective: { slug: string; owner_id: string } | null;
  };
  const { data: existingPost, error: fetchError } = await supabase
    .from('posts')
    .select(
      'id, author_id, collective_id, published_at, is_public, status, collective:collectives!collective_id(slug, owner_id)',
    )
    .eq('id', postId)
    .single<ExistingPostData>();

  if (fetchError || !existingPost) {
    console.error('Error fetching post for update:', {
      postId,
      fetchError,
      existingPost: Boolean(existingPost),
    });
    return { error: 'Post not found or error fetching post data.' };
  }

  const isAuthor = existingPost.author_id === user.id;
  let isCollectiveOwnerOrMember = false;
  if (existingPost.collective_id && existingPost.collective) {
    if (existingPost.collective.owner_id === user.id) {
      isCollectiveOwnerOrMember = true;
    } else {
      type MembershipRole = { role: Enums<'collective_member_role'> };
      const { data: membership, error: memberCheckError } = await supabase
        .from('collective_members')
        .select('role')
        .eq('collective_id', existingPost.collective_id as string)
        .eq('user_id', user.id as string)
        .in('role', ['admin', 'editor'])
        .maybeSingle<MembershipRole>();
      if (memberCheckError)
        return { error: 'Error checking collective membership for edit.' };
      const canEditAsCollectiveMember =
        membership && ['admin', 'editor', 'author'].includes(membership.role);
      if (canEditAsCollectiveMember) {
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
  if (subtitle !== undefined) updateData.subtitle = subtitle || null;
  if (content !== undefined) updateData.content = content;
  if (is_public !== undefined) updateData.is_public = is_public;
  if (published_at !== undefined) {
    updateData.published_at = published_at;
  }
  if (author !== undefined) updateData.author = author || null;
  if (seo_title !== undefined) updateData.seo_title = seo_title || null;
  if (meta_description !== undefined)
    updateData.meta_description = meta_description || null;

  if (is_public !== undefined || published_at !== undefined) {
    let db_status: Enums<'post_status_type'> = existingPost.status;
    const final_is_public =
      is_public === undefined ? existingPost.is_public : is_public;
    const final_published_at =
      published_at === undefined ? existingPost.published_at : published_at;

    if (final_is_public) {
      if (final_published_at && new Date(final_published_at) > new Date()) {
        db_status = 'draft';
      } else {
        db_status = 'active';
      }
    } else {
      db_status = 'draft';
    }
    updateData.status = db_status;
  }

  const postSlug = title ? generateSlug(title) : undefined;

  if (
    Object.keys(updateData).length === 0 &&
    title === undefined &&
    content === undefined &&
    is_public === undefined &&
    published_at === undefined
  ) {
    return { error: 'No changes to update.' };
  }

  type UpdatedPostId = { id: string };
  const { data: updatedPost, error: updateError } = await supabase
    .from('posts')
    .update(updateData)
    .eq('id', postId)
    .select('id')
    .single<UpdatedPostId>();

  if (updateError) {
    console.error('Error updating post:', updateError);
    return { error: `Failed to update post: ${updateError.message}` };
  }

  if (!updatedPost) {
    return { error: 'Failed to update post for an unknown reason.' };
  }

  revalidatePath('/dashboard');
  if (existingPost.collective?.slug) {
    revalidatePath(`/collectives/${existingPost.collective.slug}`);
    revalidatePath(
      `/collectives/${existingPost.collective.slug}/${
        postSlug || existingPost.id
      }`,
    );
  }
  revalidatePath(`/posts/${postSlug || postId}`);

  return {
    data: {
      postId: updatedPost.id,
      postSlug: postSlug || 'slug-not-changed',
      collectiveSlug: existingPost.collective?.slug,
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
  if (authError || !user) {
    return { success: false, error: 'You must be logged in to delete a post.' };
  }

  const { data: existingPost, error: fetchErr } = await supabase
    .from('posts')
    .select('collective:collectives!collective_id(slug)')
    .eq('id', postId)
    .single<{ collective: { slug: string } | null }>();
  if (fetchErr) {
    return { success: false, error: 'Post not found.' };
  }

  const { error: deleteErr } = await supabase
    .from('posts')
    .delete()
    .eq('id', postId);
  if (deleteErr) {
    return { success: false, error: deleteErr.message };
  }

  revalidatePath('/dashboard');
  let redirectPath = '/dashboard';
  if (existingPost.collective) {
    revalidatePath(`/collectives/${existingPost.collective.slug}`);
    redirectPath = `/collectives/${existingPost.collective.slug}`;
  }
  return { success: true, redirectPath };
}

export async function incrementPostViewCount(
  postId: string,
): Promise<{ success: boolean; error?: string }> {
  if (!postId) {
    return { success: false, error: 'Post ID is required.' };
  }
  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.rpc('increment_view_count', {
      post_id_to_increment: postId,
    });
    if (error) {
      console.error('RPC error:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (e: unknown) {
    console.error('Unexpected error incrementing view count:', e);
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

  if (authError || !user) {
    return { success: false, error: 'User not authenticated.' };
  }

  const { data: postOwner, error: postError } = await supabase
    .from('posts')
    .select('author_id')
    .eq('id', postId)
    .single<{ author_id: string }>();

  if (postError || !postOwner || postOwner.author_id !== user.id) {
    return { success: false, error: 'Post not found or not owned by user.' };
  }

  if (feature) {
    const { error: insertError } = await supabase
      .from('featured_posts')
      .insert({ owner_id: user.id, owner_type: 'user', post_id: postId });

    if (insertError && insertError.code !== '23505') {
      return { success: false, error: insertError.message };
    }
  } else {
    const { error: deleteError } = await supabase
      .from('featured_posts')
      .delete()
      .match({ owner_id: user.id, owner_type: 'user', post_id: postId });

    if (deleteError) {
      return { success: false, error: deleteError.message };
    }
  }

  return { success: true };
}

// Thumbnail upload function for posts
export async function uploadThumbnail(
  formData: FormData,
  postId?: string
): Promise<{ success: boolean; thumbnailUrl?: string; error?: string }> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      error: 'You must be logged in to upload a thumbnail.',
    };
  }

  const file = formData.get('thumbnail') as File;
  if (!file) {
    return {
      success: false,
      error: 'No file provided.',
    };
  }

  try {
    // If postId is provided, check if user has permission to edit the post
    if (postId) {
      const { data: post, error: postError } = await supabase
        .from('posts')
        .select('author_id, collective_id, collective:collectives!collective_id(owner_id)')
        .eq('id', postId)
        .single();

      if (postError || !post) {
        return {
          success: false,
          error: 'Post not found or access denied.',
        };
      }

      const isAuthor = post.author_id === user.id;
      let hasPermission = isAuthor;

      // Check collective permissions if post belongs to a collective
      if (!isAuthor && post.collective_id && post.collective) {
        const isCollectiveOwner = post.collective.owner_id === user.id;
        if (isCollectiveOwner) {
          hasPermission = true;
        } else {
          // Check if user is a collective member with edit permissions
          const { data: membership } = await supabase
            .from('collective_members')
            .select('role')
            .eq('collective_id', post.collective_id)
            .eq('user_id', user.id)
            .single();

          if (membership && ['admin', 'editor'].includes(membership.role)) {
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

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      return {
        success: false,
        error: 'File must be an image (JPEG, PNG, WebP).',
      };
    }

    if (file.size > THUMBNAIL_CONFIG.maxSize) {
      return {
        success: false,
        error: 'Image size must be less than 15MB.',
      };
    }

    // Generate file path using utility function
    const filePath = generateThumbnailFilename(user.id, postId, file.type);

    // Upload thumbnail to Supabase storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from(THUMBNAIL_CONFIG.bucket)
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false, // Don't overwrite, create new file
        cacheControl: THUMBNAIL_CONFIG.cacheControl,
      });

    if (uploadError) {
      console.error('Error uploading thumbnail to Supabase storage:', uploadError);
      return {
        success: false,
        error: `Failed to upload thumbnail: ${uploadError.message}`,
      };
    }

    // Get the public URL for the new thumbnail
    const { data: publicUrlData } = supabaseAdmin.storage
      .from(THUMBNAIL_CONFIG.bucket)
      .getPublicUrl(filePath);

    if (!publicUrlData.publicUrl) {
      return {
        success: false,
        error: 'Failed to generate thumbnail URL.',
      };
    }

    const thumbnailUrl = publicUrlData.publicUrl;

    // If postId is provided, update the post's thumbnail_url in database
    if (postId) {
      // Get current post data to check for existing thumbnail
      const { data: currentPost } = await supabase
        .from('posts')
        .select('thumbnail_url')
        .eq('id', postId)
        .single();

      const { error: updateError } = await supabase
        .from('posts')
        .update({ thumbnail_url: thumbnailUrl })
        .eq('id', postId);

      if (updateError) {
        console.error('Error updating post thumbnail URL:', updateError);
        return {
          success: false,
          error: 'Failed to update thumbnail URL in database.',
        };
      }

      // Clean up old thumbnail if it exists and was stored in our bucket
      if (currentPost?.thumbnail_url && isSupabaseStorageUrl(currentPost.thumbnail_url)) {
        try {
          const oldFilePath = extractThumbnailFilePathFromUrl(currentPost.thumbnail_url);
          
          if (oldFilePath) {
            // Delete old thumbnail (don't await to avoid blocking the response)
            supabaseAdmin.storage
              .from(THUMBNAIL_CONFIG.bucket)
              .remove([oldFilePath])
              .catch(error => {
                console.warn('Could not delete old thumbnail:', error.message);
              });
          }
        } catch (error) {
          // Log warning but don't fail the operation
          console.warn('Error cleaning up old thumbnail:', error);
        }
      }

      // Revalidate relevant paths
      revalidatePath('/dashboard/posts');
      revalidatePath(`/posts/${postId}`);
    }

    return { success: true, thumbnailUrl };

  } catch (error) {
    console.error('Error processing thumbnail upload:', error);
    return {
      success: false,
      error: 'Failed to process thumbnail upload. Please try again.',
    };
  }
}
