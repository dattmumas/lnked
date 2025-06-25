'use server';

import { revalidatePath } from 'next/cache';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { authenticateUser, checkExistingFollow, revalidateFollowPaths } from '@/lib/utils/follow-helpers';

interface FollowActionResult {
  success: boolean;
  error?: string;
}

interface EntityInfo {
  id: string;
  username?: string | null;
  slug?: string | null;
  type: 'user' | 'collective';
}

export async function followUser(
  userIdToFollow: string,
): Promise<FollowActionResult> {
  const authResult = await authenticateUser();
  if (!authResult.success) {
    return authResult;
  }

  if (authResult.user.id === userIdToFollow) {
    return { success: false, error: 'You cannot follow yourself.' };
  }

  // Validate that the target user exists
  const { data: targetUser, error: targetUserError } = await authResult.supabase
    .from('users')
    .select('id, username')
    .eq('id', userIdToFollow)
    .single();

  if (targetUserError !== null || targetUser === null) {
    return { success: false, error: 'User not found.' };
  }

  // Check if already following
  const followCheck = await checkExistingFollow(authResult.supabase, authResult.user.id, userIdToFollow, 'user');
  if (!followCheck.success) {
    return followCheck;
  }

  if (followCheck.existingFollow) {
    return { success: true }; // Already following, treat as success
  }

  // Insert new follow relationship
  const { error: insertError } = await authResult.supabase.from('follows').insert({
    follower_id: authResult.user.id,
    following_id: userIdToFollow,
    following_type: 'user',
  });

  if (insertError) {
    console.error('Error following user:', insertError.message);
    if (insertError.code === '23505') {
      return { success: true }; // Unique constraint violation - already following
    }
    return {
      success: false,
      error: `Failed to follow user: ${insertError.message}`,
    };
  }

  // Revalidate paths
  revalidateFollowPaths({
    id: userIdToFollow,
    username: targetUser.username,
    type: 'user'
  });

  return { success: true };
}

export async function unfollowUser(
  userIdToUnfollow: string,
): Promise<FollowActionResult> {
  const authResult = await authenticateUser();
  if (!authResult.success) {
    return authResult;
  }

  if (authResult.user.id === userIdToUnfollow) {
    return { success: false, error: 'You cannot unfollow yourself.' };
  }

  // Get target user info for path revalidation
  const { data: targetUser } = await authResult.supabase
    .from('users')
    .select('id, username')
    .eq('id', userIdToUnfollow)
    .single();

  // Check if currently following
  const followCheck = await checkExistingFollow(authResult.supabase, authResult.user.id, userIdToUnfollow, 'user');
  if (!followCheck.success) {
    return followCheck;
  }

  if (!followCheck.existingFollow) {
    return { success: true }; // Not following, treat as success
  }

  // Delete the follow relationship
  const { error: deleteError } = await authResult.supabase.from('follows').delete().match({
    follower_id: authResult.user.id,
    following_id: userIdToUnfollow,
    following_type: 'user',
  });

  if (deleteError) {
    console.error('Error unfollowing user:', deleteError.message);
    return {
      success: false,
      error: `Failed to unfollow user: ${deleteError.message}`,
    };
  }

  // Revalidate paths
  revalidateFollowPaths({
    id: userIdToUnfollow,
    username: targetUser?.username,
    type: 'user'
  });

  return { success: true };
}

export async function followCollective(
  collectiveId: string,
): Promise<FollowActionResult> {
  const authResult = await authenticateUser();
  if (!authResult.success) {
    return authResult;
  }

  const { data: collective, error: collectiveError } = await authResult.supabase
    .from('collectives')
    .select('owner_id, slug')
    .eq('id', collectiveId)
    .single();

  if (collectiveError !== null || collective === null) {
    return { success: false, error: 'Collective not found.' };
  }

  if (collective.owner_id === authResult.user.id) {
    return { success: false, error: 'You cannot follow your own collective.' };
  }

  // Check if already following
  const followCheck = await checkExistingFollow(authResult.supabase, authResult.user.id, collectiveId, 'collective');
  if (!followCheck.success) {
    return followCheck;
  }

  if (followCheck.existingFollow) {
    return { success: false, error: 'You are already following this collective.' };
  }

  const { error: insertError } = await authResult.supabase.from('follows').insert({
    follower_id: authResult.user.id,
    following_id: collectiveId,
    following_type: 'collective',
  });

  if (insertError) {
    console.error('Error following collective:', insertError.message);
    if (insertError.code === '23505') {
      return {
        success: false,
        error: 'You are already following this collective.',
      };
    }
    return {
      success: false,
      error: `Failed to follow collective: ${insertError.message}`,
    };
  }

  // Revalidate paths
  revalidateFollowPaths({
    id: collectiveId,
    slug: collective.slug,
    type: 'collective'
  });

  return { success: true };
}

export async function unfollowCollective(
  collectiveId: string,
): Promise<FollowActionResult> {
  const authResult = await authenticateUser();
  if (!authResult.success) {
    return authResult;
  }

  const { data: collective } = await authResult.supabase
    .from('collectives')
    .select('slug')
    .eq('id', collectiveId)
    .single();

  const { error: deleteError } = await authResult.supabase.from('follows').delete().match({
    follower_id: authResult.user.id,
    following_id: collectiveId,
    following_type: 'collective',
  });

  if (deleteError) {
    console.error('Error unfollowing collective:', deleteError.message);
    return {
      success: false,
      error: `Failed to unfollow collective: ${deleteError.message}`,
    };
  }

  // Revalidate paths
  revalidateFollowPaths({
    id: collectiveId,
    slug: collective?.slug,
    type: 'collective'
  });

  return { success: true };
}
