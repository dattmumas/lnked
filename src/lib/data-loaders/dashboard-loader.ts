import { createServerSupabaseClient } from '@/lib/supabase/server';

import type { Database } from '@/lib/database.types';

type UserRow = Database['public']['Tables']['users']['Row'];
type PostRow = Database['public']['Tables']['posts']['Row'];
type CollectiveRow = Database['public']['Tables']['collectives']['Row'];

export interface DashboardStats {
  subscriber_count: number;
  follower_count: number;
  total_views: number;
  total_likes: number;
  published_this_month: number;
  total_posts: number;
  collective_count: number;
  monthly_revenue: number;
  pending_payout: number;
}

export interface DashboardPost {
  id: string;
  title: string;
  published_at: string | null;
  created_at: string;
  is_public: boolean;
  collective_id: string | null;
  view_count: number | null;
  like_count: number;
}

export interface DashboardCollective {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  member_count?: number;
  post_count?: number;
}

export interface DashboardProfile {
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

export interface DashboardData {
  profile: DashboardProfile | null;
  stats: DashboardStats;
  recent_posts: DashboardPost[];
  owned_collectives: DashboardCollective[];
  recent_activity?: Array<{
    type: 'post' | 'follow' | 'like';
    timestamp: string;
    details: string;
  }>;
}

/**
 * Load comprehensive dashboard data for a user
 * Optimized to use RPC functions where available, with fallback to individual queries
 */
export async function loadDashboardData(
  userId: string,
): Promise<DashboardData> {
  const supabase = await createServerSupabaseClient();

  try {
    // Try to use optimized RPC functions first
    const [statsResult, contentResult] = await Promise.all([
      supabase
        .rpc('get_user_dashboard_stats', { user_id_param: userId })
        .single(),
      supabase
        .rpc('get_user_dashboard_content', {
          user_id_param: userId,
          posts_limit: 5,
        })
        .single(),
    ]);

    if (!statsResult.error && !contentResult.error) {
      // Parse the results from RPC functions
      const stats =
        (statsResult.data as unknown as DashboardStats) || getDefaultStats();
      const content = (contentResult.data as unknown as {
        profile: DashboardProfile | null;
        recent_posts: DashboardPost[];
        owned_collectives: DashboardCollective[];
      }) || { profile: null, recent_posts: [], owned_collectives: [] };

      return {
        profile: content.profile,
        stats: {
          ...stats,
          monthly_revenue: 0, // TODO: Implement when payment system is ready
          pending_payout: 0, // TODO: Implement when payout system is ready
        },
        recent_posts: content.recent_posts || [],
        owned_collectives: content.owned_collectives || [],
      };
    }
  } catch (error) {
    console.error(
      'RPC functions not available, falling back to individual queries:',
      error,
    );
  }

  // Fallback to individual queries if RPC fails
  return loadDashboardDataFallback(userId);
}

/**
 * Fallback function using individual queries
 */
async function loadDashboardDataFallback(
  userId: string,
): Promise<DashboardData> {
  const supabase = await createServerSupabaseClient();

  // Execute all queries in parallel for better performance
  const [
    profileResult,
    followerCountResult,
    subscriberCountResult,
    postsResult,
    collectivesResult,
    totalPostsResult,
    monthlyPostsResult,
    postStatsResult,
  ] = await Promise.all([
    // User profile
    supabase
      .from('users')
      .select('username, full_name, avatar_url')
      .eq('id', userId)
      .single(),

    // Follower count
    supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', userId)
      .eq('following_type', 'user'),

    // Subscriber count
    supabase
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('target_entity_type', 'user')
      .eq('target_entity_id', userId)
      .eq('status', 'active'),

    // Recent personal posts
    supabase
      .from('posts')
      .select(
        `
        id,
        title,
        published_at,
        created_at,
        is_public,
        collective_id,
        view_count,
        like_count
      `,
      )
      .eq('author_id', userId)
      .is('collective_id', null)
      .order('created_at', { ascending: false })
      .limit(5),

    // Owned collectives with counts
    supabase
      .from('collectives')
      .select(
        `
        id,
        name,
        slug,
        description,
        collective_members!inner(count),
        posts(count)
      `,
      )
      .eq('owner_id', userId)
      .order('name', { ascending: true }),

    // Total posts count
    supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('author_id', userId),

    // Posts published this month
    supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('author_id', userId)
      .eq('status', 'active')
      .gte('published_at', getStartOfMonth()),

    // Aggregate post stats (views and likes)
    supabase
      .from('posts')
      .select('view_count, like_count')
      .eq('author_id', userId)
      .eq('status', 'active'),
  ]);

  // Calculate aggregate stats
  let totalViews = 0;
  let totalLikes = 0;

  if (postStatsResult.data) {
    postStatsResult.data.forEach((post) => {
      totalViews += post.view_count || 0;
      totalLikes += post.like_count || 0;
    });
  }

  // Transform collectives data
  const collectivesWithCounts =
    collectivesResult.data?.map((collective) => ({
      id: collective.id,
      name: collective.name,
      slug: collective.slug,
      description: collective.description,
      member_count: Array.isArray(collective.collective_members)
        ? collective.collective_members.length
        : 0,
      post_count: Array.isArray(collective.posts) ? collective.posts.length : 0,
    })) || [];

  return {
    profile: profileResult.data || null,
    stats: {
      subscriber_count: subscriberCountResult.count || 0,
      follower_count: followerCountResult.count || 0,
      total_views: totalViews,
      total_likes: totalLikes,
      published_this_month: monthlyPostsResult.count || 0,
      total_posts: totalPostsResult.count || 0,
      collective_count: collectivesResult.data?.length || 0,
      monthly_revenue: 0, // TODO: Implement when payment system is ready
      pending_payout: 0, // TODO: Implement when payout system is ready
    },
    recent_posts: postsResult.data || [],
    owned_collectives: collectivesWithCounts,
  };
}

/**
 * Load user activity feed for dashboard
 */
export async function loadDashboardActivity(
  userId: string,
  limit: number = 10,
): Promise<Array<{ type: string; timestamp: string; details: string }>> {
  const supabase = await createServerSupabaseClient();

  // This would be implemented when activity tracking is available
  // For now, return empty array
  return [];
}

/**
 * Helper functions
 */
function getDefaultStats(): DashboardStats {
  return {
    subscriber_count: 0,
    follower_count: 0,
    total_views: 0,
    total_likes: 0,
    published_this_month: 0,
    total_posts: 0,
    collective_count: 0,
    monthly_revenue: 0,
    pending_payout: 0,
  };
}

function getStartOfMonth(): string {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  return startOfMonth.toISOString();
}
