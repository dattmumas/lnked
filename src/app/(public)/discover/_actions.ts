'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import {
  followCollective as followCollectiveAction,
  unfollowCollective as unfollowCollectiveAction,
} from '@/app/actions/followActions';
import { createServerSupabaseClient } from '@/lib/supabase/server';

import type { Database } from '@/lib/database.types';

// Constants
const DEFAULT_COLLECTIVES_LIMIT = 10;

// Type aliases for cleaner code
type CollectiveRow = Database['public']['Tables']['collectives']['Row'];

interface CollectiveWithFollowStatus extends CollectiveRow {
  is_following: boolean;
  follower_count: number;
}

interface DiscoverResult {
  collectives: CollectiveWithFollowStatus[];
  hasMore: boolean;
}

// Define Zod schema for input validation
const FeedbackSchema = z.object({
  collectiveId: z.string().uuid(),
  feedbackType: z.enum([
    'recommended_interested',
    'recommended_not_interested',
  ]),
});

interface ActionResult {
  success: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>; // For Zod field errors
}

/**
 * Logs user feedback for a recommended collective.
 * @param prevState - The previous state of the form.
 * @param formData - The form data submitted.
 */
export async function logRecommendationFeedback(
  prevState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, error: 'User not authenticated' };
  }

  const rawData = {
    collectiveId: formData.get('collectiveId'),
    feedbackType: formData.get('feedbackType'),
  };

  const validation = FeedbackSchema.safeParse(rawData);

  if (!validation.success) {
    return {
      success: false,
      error: 'Invalid input.',
      fieldErrors: validation.error.flatten().fieldErrors,
    };
  }

  const { collectiveId, feedbackType } = validation.data;

  try {
    const { error: insertError } = await supabase.from('interactions').insert({
      user_id: user.id,
      entity_id: collectiveId,
      entity_type: 'collective', // From your ENUM
      interaction_type: feedbackType, // From your ENUM
    });

    if (insertError) {
      console.error('Error inserting interaction:', insertError);
      // Check for unique constraint violation (user already interacted)
      if (insertError.code === '23505') {
        // PostgreSQL unique violation code
        return { success: true, message: 'Feedback already recorded.' };
      }
      return {
        success: false,
        error: 'Failed to record feedback.',
        message: insertError.message,
      };
    }

    // Optionally revalidate the path if the UI should change based on this feedback immediately
    // For simple feedback logging, this might not be strictly necessary
    revalidatePath('/discover');

    return { success: true, message: 'Feedback recorded successfully.' };
  } catch (e: unknown) {
    console.error('Unexpected error recording feedback:', e);
    const errorMessage =
      e instanceof Error ? e.message : 'An unexpected error occurred.';
    return { success: false, error: errorMessage };
  }
}

export async function getCollectives(
  limit: number = DEFAULT_COLLECTIVES_LIMIT,
  offset: number = 0,
  searchTerm?: string,
): Promise<DiscoverResult> {
  const supabase = await createServerSupabaseClient();

  // Get current user to check follow status
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let query = supabase
    .from('collectives')
    .select(
      `
      *,
      follower_count:follows(count)
    `,
    )
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit);

  // Add search filter if provided
  if (searchTerm !== undefined && searchTerm.trim() !== '') {
    query = query.or(
      `name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`,
    );
  }

  const { data: collectives, error } = await query;

  if (error !== null) {
    console.error('Error fetching collectives:', error);
    return { collectives: [], hasMore: false };
  }

  // Check follow status for each collective if user is authenticated
  let collectivesWithFollowStatus: CollectiveWithFollowStatus[] = [];

  if (user !== null && collectives !== null) {
    const collectiveIds = collectives.map((c: CollectiveRow) => c.id);

    const { data: follows } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id)
      .in('following_id', collectiveIds);

    const followingIds = new Set(follows?.map((f) => f.following_id) || []);

    collectivesWithFollowStatus = collectives.map(
      (
        collective: CollectiveRow & { follower_count: { count: number }[] },
      ) => ({
        ...collective,
        is_following: followingIds.has(collective.id),
        follower_count: collective.follower_count?.[0]?.count || 0,
      }),
    );
  } else {
    collectivesWithFollowStatus = (collectives || []).map(
      (
        collective: CollectiveRow & { follower_count: { count: number }[] },
      ) => ({
        ...collective,
        is_following: false,
        follower_count: collective.follower_count?.[0]?.count || 0,
      }),
    );
  }

  return {
    collectives: collectivesWithFollowStatus,
    hasMore: collectives?.length === limit + 1,
  };
}

// Server action wrappers for follow/unfollow functions
export async function followCollective(
  collectiveId: string,
): Promise<{ success: boolean; error?: string }> {
  return await followCollectiveAction(collectiveId);
}

export async function unfollowCollective(
  collectiveId: string,
): Promise<{ success: boolean; error?: string }> {
  return await unfollowCollectiveAction(collectiveId);
}
