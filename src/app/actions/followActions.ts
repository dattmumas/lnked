'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

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

  if (authError || !user) {
    return { success: false, error: 'User not authenticated.' };
  }

  if (user.id === userIdToFollow) {
    return { success: false, error: 'You cannot follow yourself.' };
  }

  const { error: insertError } = await supabase.from('follows').insert({
    follower_id: user.id,
    following_id: userIdToFollow,
    following_type: 'user',
  });

  if (insertError) {
    console.error('Error following user:', insertError.message);
    if (insertError.code === '23505') {
      // Unique constraint violation
      return { success: false, error: 'You are already following this user.' };
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

  if (authError || !user) {
    return { success: false, error: 'User not authenticated.' };
  }

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

  if (authError || !user) {
    return { success: false, error: 'User not authenticated.' };
  }

  const { data: collective, error: collectiveError } = await supabase
    .from('collectives')
    .select('owner_id, slug')
    .eq('id', collectiveId)
    .single();

  if (collectiveError || !collective) {
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

  if (authError || !user) {
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
