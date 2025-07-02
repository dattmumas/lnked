import { createServerSupabaseClient } from '@/lib/supabase/server';

import type { Database } from '@/lib/database.types';
import type { FeedItem } from '@/types/home/types';

type PostRow = Database['public']['Tables']['posts']['Row'];
type UserRow = Database['public']['Tables']['users']['Row'];
type TenantRow = Database['public']['Tables']['tenants']['Row'];

// Define a custom type for posts with joined data
interface FeedPost {
  id: string;
  title: string;
  content: string | null;
  author_id: string;
  tenant_id: string;
  collective_id: string | null;
  status: Database['public']['Enums']['post_status_type'];
  post_type: Database['public']['Enums']['post_type_enum'];
  is_public: boolean;
  like_count: number;
  dislike_count: number | null;
  view_count: number | null;
  published_at: string | null;
  created_at: string;
  thumbnail_url: string | null;
  author: Partial<UserRow> | null;
  tenant: Partial<TenantRow> | null;
  collective?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  video_assets?:
    | {
        id: string;
        mux_playback_id: string | null;
        status: string | null;
        duration: number | null;
        is_public: boolean | null;
      }
    | Array<{
        id: string;
        mux_playback_id: string | null;
        status: string | null;
        duration: number | null;
        is_public: boolean | null;
      }>
    | null;
}

export interface FeedLoaderOptions {
  limit?: number;
  offset?: number;
  includeCollectives?: boolean;
  includeFollowed?: boolean;
  status?: 'all' | 'published' | 'draft';
}

/**
 * Load user feed data server-side
 * This function fetches posts from:
 * 1. User's personal tenant
 * 2. User's collective tenants (if includeCollectives = true)
 * 3. Posts from users they follow (if includeFollowed = true)
 */
export async function loadUserFeed(
  userId: string,
  tenantId: string,
  options: FeedLoaderOptions = {},
): Promise<FeedItem[]> {
  const {
    limit = 20,
    offset = 0,
    includeCollectives = true,
    includeFollowed = true,
    status = 'published',
  } = options;

  const supabase = await createServerSupabaseClient();

  try {
    // Build the query
    let query = supabase
      .from('posts')
      .select(
        `
        *,
        author:users!author_id(
          id,
          username,
          full_name,
          avatar_url
        ),
        tenant:tenants!tenant_id(
          id,
          name,
          slug,
          type
        ),
        collective:collectives!collective_id(
          id,
          name,
          slug
        ),
        video_assets!posts_video_id_fkey(
          id,
          mux_playback_id,
          status,
          duration,
          is_public
        )
      `,
      )
      .eq('tenant_id', tenantId)
      .order('published_at', { ascending: false, nullsFirst: false })
      .range(offset, offset + limit - 1);

    // Apply status filter
    if (status === 'published') {
      query = query.eq('status', 'active').not('published_at', 'is', null);
    } else if (status === 'draft') {
      query = query.eq('status', 'draft');
    }

    const { data: posts, error } = await query;

    if (error) {
      console.error('Error fetching feed posts:', error);
      return [];
    }

    // If including collectives, fetch additional posts from user's collective tenants
    let collectivePosts: FeedPost[] = [];
    if (includeCollectives) {
      // Get user's collective memberships
      const { data: memberships } = await supabase
        .from('collective_members')
        .select('collective_id')
        .eq('member_id', userId);

      if (memberships && memberships.length > 0) {
        const collectiveIds = memberships.map((m) => m.collective_id);

        // Fetch recent posts from collectives
        const { data: collPosts } = await supabase
          .from('posts')
          .select(
            `
            *,
            author:users!author_id(
              id,
              username,
              full_name,
              avatar_url
            ),
            tenant:tenants!tenant_id(
              id,
              name,
              slug,
              type
            ),
            collective:collectives!collective_id(
              id,
              name,
              slug
            ),
            video_assets!posts_video_id_fkey(
              id,
              mux_playback_id,
              status,
              duration,
              is_public
            )
          `,
          )
          .in('collective_id', collectiveIds)
          .eq('status', 'active')
          .not('published_at', 'is', null)
          .order('published_at', { ascending: false })
          .limit(10);

        if (collPosts) {
          collectivePosts = collPosts as unknown as FeedPost[];
        }
      }
    }

    // If including followed users, fetch posts from users they follow
    let followedPosts: FeedPost[] = [];
    if (includeFollowed) {
      // Get list of users that current user follows
      const { data: follows } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId)
        .eq('following_type', 'user');

      if (follows && follows.length > 0) {
        const followedUserIds = follows.map((f) => f.following_id);

        // Fetch recent posts from followed users
        // Posts from followed users should come from their personal tenants
        const { data: followPosts } = await supabase
          .from('posts')
          .select(
            `
            *,
            author:users!author_id(
              id,
              username,
              full_name,
              avatar_url
            ),
            tenant:tenants!tenant_id(
              id,
              name,
              slug,
              type
            ),
            collective:collectives!collective_id(
              id,
              name,
              slug
            ),
            video_assets!posts_video_id_fkey(
              id,
              mux_playback_id,
              status,
              duration,
              is_public
            )
          `,
          )
          .in('author_id', followedUserIds)
          .eq('status', 'active')
          .not('published_at', 'is', null)
          .eq('is_public', true) // Only show public posts from followed users
          .order('published_at', { ascending: false })
          .limit(15); // Get more followed posts as they're often most interesting

        if (followPosts) {
          followedPosts = followPosts;
        }
      }
    }

    // Combine and sort all posts
    const allPosts = [...(posts || []), ...collectivePosts, ...followedPosts];
    allPosts.sort((a, b) => {
      const dateA = new Date(a.published_at || a.created_at);
      const dateB = new Date(b.published_at || b.created_at);
      return dateB.getTime() - dateA.getTime();
    });

    // Transform to FeedItem format
    return allPosts.slice(0, limit).map((post): FeedItem => {
      const authorName =
        post.author?.full_name || post.author?.username || 'Unknown';
      const authorUsername = post.author?.username || 'unknown';
      const avatarUrl = post.author?.avatar_url ?? undefined;

      // Handle video_assets - Supabase returns single object when using foreign key join
      const videoAsset = Array.isArray(post.video_assets)
        ? post.video_assets[0]
        : post.video_assets;

      const feedItem: FeedItem = {
        id: post.id,
        type: post.post_type === 'video' ? 'video' : 'post',
        title: post.title,
        content: post.content || '',
        author: {
          name: authorName,
          username: authorUsername,
          ...(avatarUrl !== undefined ? { avatar_url: avatarUrl } : {}),
        },
        published_at: post.published_at || post.created_at,
        stats: {
          likes: post.like_count || 0,
          dislikes: post.dislike_count || 0,
          comments: 0, // TODO: Add comment count
          views: post.view_count || 0,
        },
        thumbnail_url: post.thumbnail_url ?? null,
        // Add video metadata for video posts
        ...(post.post_type === 'video' && videoAsset
          ? {
              ...(videoAsset.duration !== null &&
              videoAsset.duration !== undefined
                ? { duration: videoAsset.duration.toString() }
                : {}),
              metadata: {
                ...(videoAsset.mux_playback_id
                  ? { playbackId: videoAsset.mux_playback_id }
                  : {}),
                status: videoAsset.status || 'preparing',
                videoAssetId: videoAsset.id,
              },
            }
          : {}),
      };

      // Add collective if present
      if (post.collective) {
        feedItem.collective = {
          name: post.collective.name,
          slug: post.collective.slug,
        };
      }

      // Add tenant if present
      if (
        post.tenant &&
        post.tenant.id &&
        post.tenant.name &&
        post.tenant.type
      ) {
        feedItem.tenant = {
          id: post.tenant.id,
          name: post.tenant.name,
          type: post.tenant.type,
        };
      }

      return feedItem;
    });
  } catch (error) {
    console.error('Error in loadUserFeed:', error);
    return [];
  }
}

/**
 * Load user's tenant information
 */
export async function loadUserTenants(userId: string) {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.rpc('get_user_tenants', {
    target_user_id: userId,
  });

  if (error) {
    console.error('Error fetching user tenants:', error);
    return [];
  }

  return data || [];
}

/**
 * Get user's personal tenant ID
 */
export async function getUserPersonalTenant(
  userId: string,
): Promise<string | null> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.rpc('get_user_personal_tenant', {
    target_user_id: userId,
  });

  if (error) {
    console.error('Error fetching personal tenant:', error);
    return null;
  }

  return data;
}
