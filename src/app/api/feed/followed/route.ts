// Followed Users Feed API Route
// Provides posts from users that the current user follows

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createServerSupabaseClient } from '@/lib/supabase/server';

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const FollowedFeedQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(50).default(15),
  offset: z.coerce.number().min(0).default(0),
});

// =============================================================================
// GET FOLLOWED USERS' POSTS
// =============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(request.url);

    // Validate query parameters
    const queryParams = {
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
    };

    // Remove null values to let Zod use defaults
    const cleanedParams = Object.fromEntries(
      Object.entries(queryParams).filter(([_, value]) => value !== null),
    );

    const queryResult = FollowedFeedQuerySchema.safeParse(cleanedParams);
    if (!queryResult.success) {
      return NextResponse.json(
        { error: `Invalid query parameters: ${queryResult.error.message}` },
        { status: 400 },
      );
    }

    const { limit, offset } = queryResult.data;

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    // Get list of users that current user follows
    const { data: follows, error: followsError } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id)
      .eq('following_type', 'user');

    if (followsError) {
      return NextResponse.json(
        { error: 'Failed to fetch follows' },
        { status: 500 },
      );
    }

    // If user doesn't follow anyone, return empty array
    if (!follows || follows.length === 0) {
      return NextResponse.json({
        data: {
          posts: [],
          pagination: {
            limit,
            offset,
            total: 0,
            hasMore: false,
          },
        },
      });
    }

    const followedUserIds = follows.map((f) => f.following_id);

    // Fetch posts from followed users
    const { data: posts, error: postsError } = await supabase
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
        )
      `,
      )
      .in('author_id', followedUserIds)
      .eq('status', 'active')
      .not('published_at', 'is', null)
      .eq('is_public', true) // Only show public posts from followed users
      .order('published_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (postsError) {
      return NextResponse.json(
        { error: 'Failed to fetch posts from followed users' },
        { status: 500 },
      );
    }

    // Get total count for pagination
    const { count, error: countError } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .in('author_id', followedUserIds)
      .eq('status', 'active')
      .not('published_at', 'is', null)
      .eq('is_public', true);

    if (countError) {
      console.warn('Failed to get followed posts count:', countError);
    }

    // Format posts with proper author data (handle array format)
    const formattedPosts = (posts || []).map((post) => ({
      ...post,
      author: Array.isArray(post.author) ? post.author[0] : post.author,
      tenant: Array.isArray(post.tenant) ? post.tenant[0] : post.tenant,
    }));

    return NextResponse.json({
      data: {
        posts: formattedPosts,
        pagination: {
          limit,
          offset,
          total: count || 0,
          hasMore: (count || 0) > offset + limit,
        },
      },
    });
  } catch (error) {
    console.error('Error in followed feed API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
