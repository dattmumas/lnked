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

    // Verify user has access to all requested tenants
    const { data: userTenants, error: tenantsError } =
      await supabase.rpc('get_user_tenants');

    if (tenantsError !== null) {
      return NextResponse.json(
        { error: 'Failed to verify tenant access' },
        { status: 403 },
      );
    }

    const userTenantIds = new Set(
      userTenants?.map((t: { tenant_id: string }) => t.tenant_id) || [],
    );

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
        view_count,
        like_count,
        created_at,
        updated_at,
        published_at,
        thumbnail_url,
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
        { error: 'Failed to fetch posts' },
        { status: 500 },
      );
    }

    // Group posts by tenant and apply per-tenant limits
    const groupedPosts: Record<string, typeof posts> = {};

    // Initialize groups
    tenantIds.forEach((tenantId) => {
      groupedPosts[tenantId] = [];
    });

    // Distribute posts to tenant groups with per-tenant limits
    const postCounts: Record<string, number> = {};
    tenantIds.forEach((id) => {
      postCounts[id] = 0;
    });

    posts?.forEach((post) => {
      const tenantId = post.tenant_id;
      const currentCount = postCounts[tenantId] ?? 0;
      if (currentCount < limit) {
        // Ensure array init
        const arr = groupedPosts[tenantId] ?? (groupedPosts[tenantId] = []);
        arr.push({
          ...post,
          // Flatten author and tenant data
          author: Array.isArray(post.author) ? post.author[0] : post.author,
          tenant: Array.isArray(post.tenant) ? post.tenant[0] : post.tenant,
        });
        postCounts[tenantId] = currentCount + 1;
      }
    });

    // Flatten all posts for response
    const allPosts = Object.values(groupedPosts).flat();

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
