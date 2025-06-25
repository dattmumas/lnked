'use server';

import { revalidatePath } from 'next/cache';

import { createServerSupabaseClient } from '@/lib/supabase/server';


interface FollowActionResult {
  success: boolean;
  error?: string;
}

export async function followUser(
  userIdToFollow: string,
): Promise<FollowActionResult> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError !== null || user === null) {
    return { success: false, error: 'User not authenticated.' };
  }

  if (user.id === userIdToFollow) {
    return { success: false, error: 'You cannot follow yourself.' };
  }

  // Validate that the target user exists
  const { data: targetUser, error: targetUserError } = await supabase
    .from('users')
    .select('id, username')
    .eq('id', userIdToFollow)
    .single();

  if (targetUserError !== null || targetUser === null) {
    return { success: false, error: 'User not found.' };
  }

  // Check if already following to prevent unnecessary database operations
  const { data: existingFollow, error: checkError } = await supabase
    .from('follows')
    .select('*')
    .eq('follower_id', user.id)
    .eq('following_id', userIdToFollow)
    .eq('following_type', 'user')
    .maybeSingle();

  if (checkError) {
    console.error('Error checking existing follow:', checkError.message);
    return {
      success: false,
      error: 'Failed to check follow status.',
    };
  }

  if (existingFollow) {
    return { success: true }; // Already following, treat as success
  }

  // Insert new follow relationship
  const { error: insertError } = await supabase.from('follows').insert({
    follower_id: user.id,
    following_id: userIdToFollow,
    following_type: 'user',
  });

  if (insertError) {
    console.error('Error following user:', insertError.message);
    if (insertError.code === '23505') {
      // Unique constraint violation - already following
      return { success: true }; // Treat as success since the relationship exists
    }
    return {
      success: false,
      error: `Failed to follow user: ${insertError.message}`,
    };
  }

  // Revalidate relevant paths to update follower counts and UI
  revalidatePath('/');
  revalidatePath(`/profile/${userIdToFollow}`);
  revalidatePath(`/users/${userIdToFollow}`);
  revalidatePath(`/users/${userIdToFollow}/followers`);
  
  // Also revalidate username-based paths if username exists
  if (targetUser.username !== null && targetUser.username !== undefined) {
    revalidatePath(`/profile/${targetUser.username}`);
    revalidatePath(`/profile/${targetUser.username}/followers`);
  }

  return { success: true };
}

export async function unfollowUser(
  userIdToUnfollow: string,
): Promise<FollowActionResult> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError !== null || user === null) {
    return { success: false, error: 'User not authenticated.' };
  }

  if (user.id === userIdToUnfollow) {
    return { success: false, error: 'You cannot unfollow yourself.' };
  }

  // Get target user info for path revalidation
  const { data: targetUser } = await supabase
    .from('users')
    .select('id, username')
    .eq('id', userIdToUnfollow)
    .single();

  // Check if currently following
  const { data: existingFollow, error: checkError } = await supabase
    .from('follows')
    .select('*')
    .eq('follower_id', user.id)
    .eq('following_id', userIdToUnfollow)
    .eq('following_type', 'user')
    .maybeSingle();

  if (checkError) {
    console.error('Error checking existing follow:', checkError.message);
    return {
      success: false,
      error: 'Failed to check follow status.',
    };
  }

  if (!existingFollow) {
    return { success: true }; // Not following, treat as success
  }

  // Delete the follow relationship
  const { error: deleteError } = await supabase.from('follows').delete().match({
    follower_id: user.id,
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

  // Revalidate relevant paths to update follower counts and UI
  revalidatePath('/');
  revalidatePath(`/profile/${userIdToUnfollow}`);
  revalidatePath(`/users/${userIdToUnfollow}`);
  revalidatePath(`/users/${userIdToUnfollow}/followers`);
  
  // Also revalidate username-based paths if username exists
  if (targetUser?.username !== null && targetUser?.username !== undefined) {
    revalidatePath(`/profile/${targetUser.username}`);
    revalidatePath(`/profile/${targetUser.username}/followers`);
  }

  return { success: true };
}

export async function followCollective(
  collectiveId: string,
): Promise<FollowActionResult> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError !== null || user === null) {
    return { success: false, error: 'User not authenticated.' };
  }

  const { data: collective, error: collectiveError } = await supabase
    .from('collectives')
    .select('owner_id, slug')
    .eq('id', collectiveId)
    .single();

  if (collectiveError !== null || collective === null) {
    return { success: false, error: 'Collective not found.' };
  }

  if (collective.owner_id === user.id) {
    return { success: false, error: 'You cannot follow your own collective.' };
  }

  const { error: insertError } = await supabase.from('follows').insert({
    follower_id: user.id,
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

  revalidatePath(`/collectives/${collective.slug}`);
  revalidatePath('/');

  return { success: true };
}

export async function unfollowCollective(
  collectiveId: string,
): Promise<FollowActionResult> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError !== null || user === null) {
    return { success: false, error: 'User not authenticated.' };
  }

  const { data: collective } = await supabase
    .from('collectives')
    .select('slug')
    .eq('id', collectiveId)
    .single();

  const { error: deleteError } = await supabase.from('follows').delete().match({
      follower_id: user.id,
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

  if (collective) {
    revalidatePath(`/collectives/${collective.slug}`);
  }
  revalidatePath('/');

  return { success: true };
}
