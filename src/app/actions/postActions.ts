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

  const { title, content, is_public, collectiveId, published_at } =
    validatedFields.data;
  let collectiveSlug: string | null = null;

  if (collectiveId) {
    const { data: collectiveData, error: collectiveCheckError } = await supabase
      .from('collectives')
      .select('id, owner_id, slug')
      .eq('id', collectiveId as string)
      .single<{ id: string; owner_id: string; slug: string }>();
    if (collectiveCheckError || !collectiveData) {
      return {
        error: 'Collective not found or error fetching it.',
        fieldErrors: { collectiveId: ['Invalid collective.'] },
      };
    }
    collectiveSlug = collectiveData.slug;
    const isOwner = collectiveData.owner_id === user.id;
    let isMember = false;
    if (!isOwner) {
      const { data: membership, error: memberCheckError } = await supabase
        .from('collective_members')
        .select('role')
        .eq('collective_id', collectiveId as string)
        .eq('user_id', user.id as string)
        .maybeSingle<{ role: string }>();
      if (memberCheckError) {
        return { error: 'Error checking collective membership.' };
      }
      isMember =
        !!membership && ['admin', 'editor', 'author'].includes(membership.role);
    }

    if (!isOwner && !isMember) {
      return {
        error: 'You do not have permission to post to this collective.',
        fieldErrors: { collectiveId: ['Permission denied.'] },
      };
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
    content,
    is_public,
    collective_id: collectiveId || null,
    published_at: published_at,
    status: db_status,
    view_count: 0,
    like_count: 0,
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

  revalidatePath('/dashboard');
  if (collectiveSlug) {
    revalidatePath(`/collectives/${collectiveSlug}`);
    revalidatePath(`/collectives/${collectiveSlug}/${postSlug}`);
    if (collectiveId)
      revalidatePath(`/dashboard/[collectiveId]/new-post`, 'page');
  } else {
    revalidatePath(`/newsletters/${user.id}`);
  }
  revalidatePath(`/posts/${newPost.id}`);

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
      if (membership) {
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

  const { title, content, is_public, published_at, collectiveId } =
    validatedFields.data;

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
  if (content !== undefined) updateData.content = content;
  if (is_public !== undefined) updateData.is_public = is_public;
  if (published_at !== undefined) {
    updateData.published_at = published_at;
  }

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
  } else if (existingPost.author_id) {
    revalidatePath(`/newsletters/${existingPost.author_id}`);
  }
  revalidatePath(`/posts/${postId}`);

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
