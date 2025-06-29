'use server';

import { revalidatePath } from 'next/cache';

import { createServerSupabaseClient } from '@/lib/supabase/server';

interface FollowActionResult {
  success: boolean;
  error?: string;
}

async function getAuth(): Promise<
  | {
      success: true;
      userId: string;
      supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>;
    }
  | { success: false; error: string }
> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error !== null || user === null) {
    return { success: false, error: 'User not authenticated.' };
  }

  return { success: true, userId: user.id, supabase };
}

export async function followUser(
  userIdToFollow: string,
): Promise<FollowActionResult> {
  const authResult = await getAuth();

  if (!authResult.success) {
    return authResult;
  }

  const { userId, supabase } = authResult;

  if (userId === userIdToFollow) {
    return { success: false, error: 'You cannot follow yourself.' };
  }

  // Check current status
  const { data: status, error: statusErr } = await supabase.rpc(
    'get_follow_status',
    {
      p_follower: userId,
      p_target: userIdToFollow,
      p_target_type: 'user',
    },
  );

  if (statusErr !== null && statusErr !== undefined) {
    return { success: false, error: statusErr.message };
  }

  if (status === true) {
    return { success: true }; // already following
  }

  const { error: toggleErr } = await supabase.rpc('follow_toggle', {
    p_follower: userId,
    p_target: userIdToFollow,
    p_target_type: 'user',
  });

  if (toggleErr !== null && toggleErr !== undefined) {
    return { success: false, error: toggleErr.message };
  }

  // Revalidate homepage & profile paths
  revalidatePath('/');
  revalidatePath(`/profile/${userIdToFollow}`);

  return { success: true };
}

export async function unfollowUser(
  userIdToUnfollow: string,
): Promise<FollowActionResult> {
  const authResult = await getAuth();

  if (!authResult.success) {
    return authResult;
  }

  const { userId, supabase } = authResult;

  if (userId === userIdToUnfollow) {
    return { success: false, error: 'You cannot unfollow yourself.' };
  }

  const { data: status, error: statusErr } = await supabase.rpc(
    'get_follow_status',
    {
      p_follower: userId,
      p_target: userIdToUnfollow,
      p_target_type: 'user',
    },
  );

  if (statusErr !== null && statusErr !== undefined) {
    return { success: false, error: statusErr.message };
  }

  if (status === false) {
    return { success: true }; // already not following
  }

  const { error: toggleErr } = await supabase.rpc('follow_toggle', {
    p_follower: userId,
    p_target: userIdToUnfollow,
    p_target_type: 'user',
  });

  if (toggleErr !== null && toggleErr !== undefined) {
    return { success: false, error: toggleErr.message };
  }

  revalidatePath('/');
  revalidatePath(`/profile/${userIdToUnfollow}`);

  return { success: true };
}

export async function followCollective(
  collectiveId: string,
): Promise<FollowActionResult> {
  const authResult = await getAuth();

  if (!authResult.success) return authResult;
  const { userId, supabase } = authResult;

  const { data: collective, error: collectiveError } = await supabase
    .from('collectives')
    .select('owner_id, slug')
    .eq('id', collectiveId)
    .single();

  if (collectiveError !== null || collective === null) {
    return { success: false, error: 'Collective not found.' };
  }

  if (collective.owner_id === userId) {
    return { success: false, error: 'You cannot follow your own collective.' };
  }

  const { data: status } = await supabase.rpc('get_follow_status', {
    p_follower: userId,
    p_target: collectiveId,
    p_target_type: 'collective',
  });

  if (status === true) return { success: true };

  const { error: toggleErr } = await supabase.rpc('follow_toggle', {
    p_follower: userId,
    p_target: collectiveId,
    p_target_type: 'collective',
  });

  if (toggleErr !== null && toggleErr !== undefined) {
    return { success: false, error: toggleErr.message };
  }

  revalidatePath('/');
  if (collective?.slug) revalidatePath(`/collectives/${collective.slug}`);

  return { success: true };
}

export async function unfollowCollective(
  collectiveId: string,
): Promise<FollowActionResult> {
  const authResult = await getAuth();

  if (!authResult.success) return authResult;
  const { userId, supabase } = authResult;

  const { data: collective } = await supabase
    .from('collectives')
    .select('slug')
    .eq('id', collectiveId)
    .single();

  const { data: status } = await supabase.rpc('get_follow_status', {
    p_follower: userId,
    p_target: collectiveId,
    p_target_type: 'collective',
  });

  if (status === false) return { success: true };

  const { error: toggleErr } = await supabase.rpc('follow_toggle', {
    p_follower: userId,
    p_target: collectiveId,
    p_target_type: 'collective',
  });

  if (toggleErr !== null && toggleErr !== undefined) {
    return { success: false, error: toggleErr.message };
  }

  revalidatePath('/');
  if (collective?.slug) revalidatePath(`/collectives/${collective.slug}`);

  return { success: true };
}
