import { createServerSupabaseClient } from '@/lib/supabase/server';

import type { Database, Enums } from '@/lib/database.types';

type PostRow = Database['public']['Tables']['posts']['Row'];
type CollectiveRow = Database['public']['Tables']['collectives']['Row'];
type VideoAssetRow = Database['public']['Tables']['video_assets']['Row'];

export interface PostWithDetails extends PostRow {
  collective?: { id: string; name: string; slug: string } | null;
  post_reactions?: { count: number; type?: string }[] | null;
  likeCount?: number;
  isFeatured?: boolean;
  video?: { id: string; title: string | null } | null;
}

export interface PostsPageData {
  posts: PostWithDetails[];
  publishingCollectives: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
  stats: {
    totalPosts: number;
    publishedPosts: number;
    draftPosts: number;
    totalViews: number;
    totalLikes: number;
  };
}

/**
 * Load posts data for the posts listing page
 * Optimized to reduce number of queries and fetch all data in parallel
 */
export async function loadPostsData(userId: string): Promise<PostsPageData> {
  const supabase = await createServerSupabaseClient();

  // Execute all queries in parallel for better performance
  const [
    postsResult,
    videosResult,
    ownedCollectivesResult,
    memberCollectivesResult,
    featuredPostsResult,
  ] = await Promise.all([
    // Fetch all posts authored by the user with related data
    supabase
      .from('posts')
      .select(
        `
        *,
        collective:collectives!collective_id(id, name, slug),
        post_reactions:post_reactions!post_id(count)
      `,
      )
      .eq('author_id', userId)
      .neq('status', 'removed')
      .order('created_at', { ascending: false }),

    // Fetch videos created by the user
    supabase.from('video_assets').select('id, title').eq('created_by', userId),

    // Fetch collectives the user owns
    supabase
      .from('collectives')
      .select('id, name, slug')
      .eq('owner_id', userId)
      .order('name', { ascending: true }),

    // Fetch collectives where user can publish
    supabase
      .from('collective_members')
      .select('role, collective:collectives!inner(id, name, slug)')
      .eq('member_id', userId)
      .in('role', [
        'admin',
        'editor',
        'author',
      ] as Enums<'collective_member_role'>[])
      .order('collective(name)', { ascending: true }),

    // Fetch featured posts
    supabase
      .from('featured_posts')
      .select('post_id')
      .eq('owner_id', userId)
      .eq('owner_type', 'user'),
  ]);

  // Handle errors
  if (postsResult.error) {
    console.error('Error fetching posts:', postsResult.error);
    throw new Error('Failed to load posts');
  }

  const posts = postsResult.data || [];
  const videos = videosResult.data || [];
  const ownedCollectives = ownedCollectivesResult.data || [];
  const memberCollectives = memberCollectivesResult.data || [];
  const featuredPosts = featuredPostsResult.data || [];

  // Create featured posts set
  const featuredIds = new Set(featuredPosts.map((fp) => fp.post_id));

  // Create video mapping
  const videoMap = new Map<string, { id: string; title: string | null }>();
  videos.forEach(({ id, title }) => {
    // Match the title pattern used in getOrCreatePostForVideo
    const videoPostTitle = `Video: ${(title ?? '').trim() || id}`;
    videoMap.set(videoPostTitle, { id, title });
  });

  // Build publishing collectives list (deduplicated)
  const publishingCollectives: Array<{
    id: string;
    name: string;
    slug: string;
  }> = [];
  const addedCollectiveIds = new Set<string>();

  // Add owned collectives
  ownedCollectives.forEach((collective) => {
    if (!addedCollectiveIds.has(collective.id)) {
      publishingCollectives.push(collective);
      addedCollectiveIds.add(collective.id);
    }
  });

  // Add member collectives
  memberCollectives.forEach((membership) => {
    const collective = membership.collective as {
      id: string;
      name: string;
      slug: string;
    } | null;
    if (collective && !addedCollectiveIds.has(collective.id)) {
      publishingCollectives.push(collective);
      addedCollectiveIds.add(collective.id);
    }
  });

  // Transform posts with additional data
  const postsWithDetails: PostWithDetails[] = posts.map((post) => {
    const video = videoMap.get(post.title);
    return {
      ...post,
      likeCount: post.like_count || 0,
      isFeatured: featuredIds.has(post.id),
      video: video || null,
      post_reactions: post.post_reactions || [],
    };
  });

  // Calculate stats
  const stats = {
    totalPosts: posts.length,
    publishedPosts: posts.filter((p) => p.status === 'active' && p.published_at)
      .length,
    draftPosts: posts.filter((p) => p.status === 'draft' || !p.published_at)
      .length,
    totalViews: posts.reduce((sum, p) => sum + (p.view_count || 0), 0),
    totalLikes: posts.reduce((sum, p) => sum + (p.like_count || 0), 0),
  };

  return {
    posts: postsWithDetails,
    publishingCollectives,
    stats,
  };
}

/**
 * Load posts with pagination support
 */
export async function loadPostsPaginated(
  userId: string,
  options: {
    page?: number;
    limit?: number;
    status?: 'all' | 'published' | 'draft';
    collective_id?: string;
    search?: string;
  } = {},
): Promise<{
  posts: PostWithDetails[];
  totalCount: number;
  hasMore: boolean;
}> {
  const {
    page = 1,
    limit = 20,
    status = 'all',
    collective_id,
    search,
  } = options;

  const supabase = await createServerSupabaseClient();
  const offset = (page - 1) * limit;

  // Build the query
  let query = supabase
    .from('posts')
    .select(
      `
      *,
      collective:collectives!collective_id(id, name, slug),
      post_reactions:post_reactions!post_id(count)
    `,
      { count: 'exact' },
    )
    .eq('author_id', userId)
    .neq('status', 'removed');

  // Apply filters
  if (status === 'published') {
    query = query.eq('status', 'active').not('published_at', 'is', null);
  } else if (status === 'draft') {
    query = query.or('status.eq.draft,published_at.is.null');
  }

  if (collective_id) {
    query = query.eq('collective_id', collective_id);
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
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching paginated posts:', error);
    throw new Error('Failed to load posts');
  }

  return {
    posts: posts || [],
    totalCount: count || 0,
    hasMore: (count || 0) > offset + limit,
  };
}
