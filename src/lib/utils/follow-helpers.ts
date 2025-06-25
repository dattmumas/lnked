import { revalidatePath } from 'next/cache';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { User } from '@supabase/supabase-js';

interface EntityInfo {
  id: string;
  username?: string | null;
  slug?: string | null;
  type: 'user' | 'collective';
}

type AuthResult =
  | {
      success: true;
      user: User;
      supabase: SupabaseClient;
    }
  | {
      success: false;
      error: string;
    };

type FollowCheckResult =
  | {
      success: true;
      existingFollow: any;
    }
  | {
      success: false;
      error: string;
    };

// Common helper for authentication check
export async function authenticateUser(): Promise<AuthResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError !== null || user === null) {
    return { success: false, error: 'User not authenticated.' };
  }

  return { success: true, user, supabase };
}

// Common helper for checking existing follow relationship
export async function checkExistingFollow(
  supabase: SupabaseClient,
  followerId: string,
  followingId: string,
  followingType: 'user' | 'collective'
): Promise<FollowCheckResult> {
  const { data: existingFollow, error: checkError } = await supabase
    .from('follows')
    .select('*')
    .eq('follower_id', followerId)
    .eq('following_id', followingId)
    .eq('following_type', followingType)
    .maybeSingle();

  if (checkError) {
    console.error('Error checking existing follow:', checkError.message);
    return { success: false, error: 'Failed to check follow status.' };
  }

  return { success: true, existingFollow };
}

// Common helper for path revalidation
export function revalidateFollowPaths(entityInfo: EntityInfo): void {
  revalidatePath('/');
  
  if (entityInfo.type === 'user') {
    revalidatePath(`/profile/${entityInfo.id}`);
    revalidatePath(`/users/${entityInfo.id}`);
    revalidatePath(`/users/${entityInfo.id}/followers`);
    
    if (entityInfo.username !== null && entityInfo.username !== undefined) {
      revalidatePath(`/profile/${entityInfo.username}`);
      revalidatePath(`/profile/${entityInfo.username}/followers`);
    }
  } else if (entityInfo.type === 'collective') {
    if (entityInfo.slug !== null && entityInfo.slug !== undefined) {
      revalidatePath(`/collectives/${entityInfo.slug}`);
    }
  }
}