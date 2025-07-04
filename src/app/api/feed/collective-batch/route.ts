import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createServerSupabaseClient } from '@/lib/supabase/server';

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const BatchFeedRequestSchema = z.object({
  tenantIds: z.array(z.string().uuid()).min(1).max(50), // Limit to 50 tenants max
  limit: z.coerce.number().min(1).max(20).default(5), // Posts per tenant
  status: z.enum(['published', 'active']).default('published'),
});

// =============================================================================
// BATCH COLLECTIVE FEED ENDPOINT
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();

    // Validate request body
    const validationResult = BatchFeedRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: validationResult.error.message,
        },
        { status: 400 },
      );
    }

    const { tenantIds, limit, status } = validationResult.data;

    // Get authenticated user
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError !== null || user === null) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    // ---------------------------------------------------------------------
    // Determine the tenant IDs the user has access to (direct DB query)
    // ---------------------------------------------------------------------

    const { data: membershipRows, error: membershipError } = await supabase
      .from('tenant_members')
      .select('tenant_id')
      .eq('user_id', user.id);

    if (membershipError !== null) {
      console.error('Error fetching tenant memberships:', membershipError);
      return NextResponse.json(
        { error: 'Failed to verify tenant access' },
        { status: 500 },
      );
    }

    const userTenantIds = new Set(
      (membershipRows ?? []).map((m) => m.tenant_id),
    );

    // If the user belongs to no tenants, return an empty feed early
    if (userTenantIds.size === 0) {
      return NextResponse.json({
        posts: [],
        metadata: {
          totalPosts: 0,
          tenantCount: 0,
          postsPerTenant: {},
          requestedLimit: limit,
        },
      });
    }

    // Check if user has access to all requested tenants
    const unauthorizedTenants = tenantIds.filter(
      (id) => !userTenantIds.has(id),
    );
    if (unauthorizedTenants.length > 0) {
      return NextResponse.json(
        {
          error: 'Access denied to some tenants',
          unauthorizedTenants,
        },
        { status: 403 },
      );
    }

    // Single optimized query to fetch posts from all tenants
    let query = supabase
      .from('posts')
      .select(
        `
        id,
        title,
        subtitle,
        content,
        author_id,
        tenant_id,
        collective_id,
        is_public,
        status,
        post_type,
        view_count,
        like_count,
        created_at,
        updated_at,
        published_at,
        thumbnail_url,
        video_id,
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
        video_assets!posts_video_id_fkey(
          id,
          mux_playback_id,
          status,
          duration,
          is_public
        )
      `,
      )
      .in('tenant_id', tenantIds)
      .eq('is_public', true);

    // Apply status filter
    if (status === 'published') {
      query = query.eq('status', 'active');
    }

    // Order by published date and limit total results
    const { data: posts, error: postsError } = await query
      .order('published_at', { ascending: false })
      .limit(limit * tenantIds.length); // Total limit across all tenants

    if (postsError !== null) {
      console.error('Error fetching batch posts:', postsError);
      return NextResponse.json(
        {
          error: 'Failed to fetch posts',
          details: postsError.message ?? postsError,
        },
        { status: 500 },
      );
    }

    // Group posts by tenant and apply per-tenant limits
    type PostWithRelations = typeof posts extends (infer T)[] | null
      ? T
      : never;
    type TransformedPost = Omit<PostWithRelations, 'video_assets'> & {
      author: PostWithRelations['author'] extends (infer A)[]
        ? A
        : PostWithRelations['author'];
      tenant: PostWithRelations['tenant'] extends (infer T)[]
        ? T
        : PostWithRelations['tenant'];
      video: PostWithRelations['video_assets'];
      comment_count: number;
    };
    const groupedPosts: Record<string, TransformedPost[]> = {};

    // Initialize groups
    tenantIds.forEach((tenantId) => {
      groupedPosts[tenantId] = [];
    });

    // Distribute posts to tenant groups with per-tenant limits
    const postCounts: Record<string, number> = {};
    tenantIds.forEach((id) => {
      postCounts[id] = 0;
    });

    // Process posts with proper type checking
    const allPosts: TransformedPost[] = [];

    posts?.forEach((post) => {
      if (post === null || post === undefined || typeof post !== 'object') {
        return; // Skip invalid posts
      }

      const tenantId = post.tenant_id;
      const currentCount = postCounts[tenantId] ?? 0;
      if (currentCount < limit) {
        // Ensure array is initialized (avoid assignment in expression for ESLint compliance)
        if (groupedPosts[tenantId] == null) {
          groupedPosts[tenantId] = [];
        }
        const arr = groupedPosts[tenantId];

        // Extract video_assets and process it
        const { video_assets, ...postWithoutVideo } = post;

        const transformedPost: TransformedPost = {
          ...postWithoutVideo,
          // Flatten author and tenant data
          author: Array.isArray(post.author) ? post.author[0] : post.author,
          tenant: Array.isArray(post.tenant) ? post.tenant[0] : post.tenant,
          // Add video data as 'video' property
          video:
            Array.isArray(video_assets) && video_assets.length > 0
              ? video_assets[0]
              : null,
          // Add comment_count (defaulting to 0 for now)
          comment_count: 0,
        };

        arr.push(transformedPost);
        postCounts[tenantId] = currentCount + 1;
      }
    });

    // Flatten all posts for response
    Object.values(groupedPosts).forEach((posts) => {
      posts.forEach((post) => {
        if (post !== null && post !== undefined) {
          allPosts.push(post);
        }
      });
    });

    return NextResponse.json({
      posts: allPosts,
      metadata: {
        totalPosts: allPosts.length,
        tenantCount: tenantIds.length,
        postsPerTenant: groupedPosts,
        requestedLimit: limit,
      },
    });
  } catch (error) {
    console.error('Error in batch collective feed API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
