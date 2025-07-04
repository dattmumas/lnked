import { createServerSupabaseClient } from '@/lib/supabase/server';

import type { Database } from '@/lib/database.types';

// Type aliases for cleaner code
type CollectiveRow = Database['public']['Tables']['collectives']['Row'];
type PostRow = Database['public']['Tables']['posts']['Row'];
type UserRow = Database['public']['Tables']['users']['Row'];

export type CollectiveData = CollectiveRow & {
  member_count: number;
  post_count: number;
  owner?: Partial<UserRow> | null;
};

export type CollectivePost = PostRow & {
  author_profile?: {
    id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
};

export interface CollectiveMember {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  role: string;
  joined_at: string;
}

export interface CollectivePageData {
  collective: CollectiveData | null;
  featuredPosts: CollectivePost[];
  recentPosts: CollectivePost[];
  members: CollectiveMember[];
  stats: {
    totalPosts: number;
    totalMembers: number;
    totalViews: number;
    totalLikes: number;
  };
}

// Helper to safely extract a `count` property from Supabase aggregate result
type AggregateCount = { count: number | null };
const extractCount = (value: unknown): number => {
  if (
    typeof value === 'object' &&
    value !== null &&
    'count' in value &&
    typeof (value as AggregateCount).count === 'number'
  ) {
    return (value as AggregateCount).count ?? 0;
  }
  return 0;
};

/**
 * Load comprehensive collective data for a collective page
 */
export async function loadCollectiveData(
  slug: string,
): Promise<CollectivePageData> {
  const supabase = await createServerSupabaseClient();

  try {
    // First get the collective basic data (simplified query)
    const { data: collective, error: collectiveError } = await supabase
      .from('collectives')
      .select(
        `
        *,
        owner:users!owner_id(id, username, full_name, avatar_url)
      `,
      )
      .eq('slug', slug)
      .single();

    if (collectiveError || !collective) {
      console.error('Error fetching collective:', {
        error: collectiveError,
        slug,
        message: collectiveError?.message || 'No collective found',
        code: collectiveError?.code || 'UNKNOWN',
        details: collectiveError?.details || 'No details',
      });

      return {
        collective: null,
        featuredPosts: [],
        recentPosts: [],
        members: [],
        stats: {
          totalPosts: 0,
          totalMembers: 0,
          totalViews: 0,
          totalLikes: 0,
        },
      };
    }

    // Get counts separately for better error handling
    const [memberCountResult, postCountResult] = await Promise.all([
      supabase
        .from('collective_members')
        .select('*', { count: 'exact', head: true })
        .eq('collective_id', collective.id),

      supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('collective_id', collective.id)
        .eq('status', 'active'),
    ]);

    const memberCount = memberCountResult.count || 0;
    const postCount = postCountResult.count || 0;

    // Execute parallel queries for better performance
    const [featuredPostsResult, recentPostsResult, membersResult, statsResult] =
      await Promise.all([
        // Get featured posts
        supabase
          .from('featured_posts')
          .select('post_id, display_order')
          .eq('owner_id', collective.id)
          .eq('owner_type', 'collective')
          .order('display_order', { ascending: true })
          .limit(2),

        // Get recent posts
        supabase
          .from('posts')
          .select(
            `
          *,
          author_profile:users!author_id(
            id,
            username,
            full_name,
            avatar_url
          )
        `,
          )
          .eq('collective_id', collective.id)
          .eq('is_public', true)
          .eq('status', 'active')
          .not('published_at', 'is', null)
          .order('published_at', { ascending: false })
          .limit(10),

        // Get members
        supabase
          .from('collective_members')
          .select(
            `
          role,
          created_at,
          member:users!member_id(
            id,
            username,
            full_name,
            avatar_url,
            bio
          )
        `,
          )
          .eq('collective_id', collective.id)
          .order('created_at', { ascending: true })
          .limit(20),

        // Get aggregate stats
        supabase
          .from('posts')
          .select('view_count, like_count')
          .eq('collective_id', collective.id)
          .eq('status', 'active'),
      ]);

    // Process featured posts
    let featuredPosts: CollectivePost[] = [];
    if (featuredPostsResult.data && featuredPostsResult.data.length > 0) {
      const featuredIds = featuredPostsResult.data.map((fp) => fp.post_id);
      const { data: featuredPostsData } = await supabase
        .from('posts')
        .select(
          `
          *,
          author_profile:users!author_id(
            id,
            username,
            full_name,
            avatar_url
          )
        `,
        )
        .in('id', featuredIds);

      featuredPosts = featuredPostsData || [];
    }

    // Calculate stats
    let totalViews = 0;
    let totalLikes = 0;

    if (statsResult.data) {
      statsResult.data.forEach((post) => {
        totalViews += post.view_count || 0;
        totalLikes += post.like_count || 0;
      });
    }

    // Transform members data
    const members: CollectiveMember[] = (membersResult.data || [])
      .filter((m) => m.member)
      .map((m) => ({
        id: m.member.id,
        username: m.member.username,
        full_name: m.member.full_name,
        avatar_url: m.member.avatar_url,
        bio: m.member.bio,
        role: m.role,
        joined_at: m.created_at,
      }));

    // Transform collective data
    const collectiveData: CollectiveData = {
      ...collective,
      member_count: memberCount,
      post_count: postCount,
      owner: collective.owner,
    };

    return {
      collective: collectiveData,
      featuredPosts:
        featuredPosts.length > 0
          ? featuredPosts
          : recentPostsResult.data?.slice(0, 2) || [],
      recentPosts: recentPostsResult.data || [],
      members,
      stats: {
        totalPosts: collectiveData.post_count,
        totalMembers: collectiveData.member_count,
        totalViews,
        totalLikes,
      },
    };
  } catch (error) {
    console.error('Error loading collective data:', error);
    return {
      collective: null,
      featuredPosts: [],
      recentPosts: [],
      members: [],
      stats: {
        totalPosts: 0,
        totalMembers: 0,
        totalViews: 0,
        totalLikes: 0,
      },
    };
  }
}

/**
 * Load collective posts with pagination
 */
export async function loadCollectivePostsPaginated(
  collectiveId: string,
  options: {
    page?: number;
    limit?: number;
    category?: string;
    search?: string;
  } = {},
): Promise<{
  posts: CollectivePost[];
  totalCount: number;
  hasMore: boolean;
}> {
  const { page = 1, limit = 20, category, search } = options;

  const supabase = await createServerSupabaseClient();
  const offset = (page - 1) * limit;

  // Build the query
  let query = supabase
    .from('posts')
    .select(
      `
      *,
      author_profile:users!author_id(
        id,
        username,
        full_name,
        avatar_url
      )
    `,
      { count: 'exact' },
    )
    .eq('collective_id', collectiveId)
    .eq('is_public', true)
    .eq('status', 'active')
    .not('published_at', 'is', null);

  // Apply filters
  if (category) {
    query = query.eq('category', category);
  }

  if (search) {
    query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
  }

  // Apply pagination
  const {
    data: posts,
    error,
    count,
  } = await query
    .order('published_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching collective posts:', error);
    throw new Error('Failed to load posts');
  }

  return {
    posts: posts || [],
    totalCount: count || 0,
    hasMore: (count || 0) > offset + limit,
  };
}
