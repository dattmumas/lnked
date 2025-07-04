// Tenant Posts API Route
// Provides tenant-scoped post feeds with proper access control

import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  createTenantErrorResponse,
  createTenantSuccessResponse,
} from '@/lib/api/tenant-helpers';
import { createServerSupabaseClient } from '@/lib/supabase/server';

type PostWithAuthor = {
  id: string;
  title: string;
  subtitle: string | null;
  content: string | null;
  author_id: string;
  tenant_id: string;
  collective_id: string | null;
  is_public: boolean;
  status: string;
  post_type: 'text' | 'video';
  view_count: number | null;
  like_count: number | null;
  created_at: string;
  updated_at: string | null;
  published_at: string | null;
  seo_title: string | null;
  meta_description: string | null;
  thumbnail_url: string | null;
  video_id: string | null;
  author:
    | {
        id: string;
        username: string | null;
        full_name: string | null;
        avatar_url: string | null;
      }[]
    | null;
  video_assets:
    | {
        id: string;
        mux_playback_id: string | null;
        status: string | null;
        duration: number | null;
        is_public: boolean | null;
      }[]
    | null;
};

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const PostsQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(50).default(20),
  offset: z.coerce.number().min(0).default(0),
  sort: z
    .enum(['created_at', 'updated_at', 'like_count', 'view_count'])
    .default('created_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
  status: z.enum(['all', 'published', 'draft']).default('published'),
  author_id: z.string().uuid().optional(),
});

// =============================================================================
// GET TENANT POSTS
// =============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
): Promise<NextResponse> {
  try {
    const { tenantId } = await params;
    // API call received
    const { searchParams } = new URL(request.url);

    // Validate query parameters
    const queryParams = {
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
      sort: searchParams.get('sort'),
      order: searchParams.get('order'),
      status: searchParams.get('status'),
      author_id: searchParams.get('author_id'),
    };

    // Remove null values to let Zod use defaults
    const cleanedParams = Object.fromEntries(
      Object.entries(queryParams).filter(([_, value]) => value !== null),
    );

    const queryResult = PostsQuerySchema.safeParse(cleanedParams);

    if (!queryResult.success) {
      return createTenantErrorResponse(
        `Invalid query parameters: ${queryResult.error.message}`,
        400,
      );
    }

    const { limit, offset, sort, order, status, author_id } = queryResult.data;

    // Get the supabase client and user first
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return createTenantErrorResponse('Authentication required', 401);
    }

    // Check tenant access using the cached function with user ID
    const { data: hasAccess, error: accessError } = await supabase.rpc(
      'user_has_tenant_access',
      {
        target_tenant_id: tenantId,
        required_role: 'member',
      },
    );

    if (accessError || !hasAccess) {
      return createTenantErrorResponse('Access denied', 403);
    }

    // Get user's role in the tenant
    const { data: memberData, error: memberError } = await supabase
      .from('tenant_members')
      .select('role')
      .eq('tenant_id', tenantId)
      .eq('user_id', user.id)
      .single();

    if (memberError || !memberData) {
      return createTenantErrorResponse('Failed to get user role', 403);
    }

    const userRole = memberData.role;

    // Build query
    let query = supabase
      .from('posts')
      .select(
        `
            id,
            title,
            subtitle,
            author_id,
            tenant_id,
            collective_id,
            is_public,
            status,
            post_type,
            view_count,
            like_count,
            created_at,
            published_at,
            thumbnail_url,
            video_id,
            author:users!author_id(
              id,
              username,
              full_name,
              avatar_url
            ),
            video_id
          `,
      )
      .eq('tenant_id', tenantId);

    // Apply status filter based on user role
    switch (status) {
      case 'published': {
        query = query.eq('status', 'active').not('published_at', 'is', null);

        break;
      }
      case 'draft': {
        // Only editors+ can see drafts
        if (!['editor', 'admin', 'owner'].includes(userRole || '')) {
          throw new Error('Insufficient permissions to view drafts');
        }
        query = query.eq('status', 'draft');

        break;
      }
      case 'all': {
        // Only admins+ can see all posts
        if (!['admin', 'owner'].includes(userRole || '')) {
          throw new Error('Insufficient permissions to view all posts');
        }

        break;
      }
      // No default
    }

    // Apply author filter if specified
    if (author_id !== null && author_id !== undefined) {
      query = query.eq('author_id', author_id);
    }

    // Apply sorting and pagination
    query = query
      .order(sort, { ascending: order === 'asc' })
      .range(offset, offset + limit - 1);

    const { data: posts, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch posts: ${error.message}`);
    }

    // Fetch tenant context once (security definer function bypasses RLS)
    const { data: tenantContext, error: tenantContextError } =
      await supabase.rpc('get_tenant_context', {
        target_tenant_id: tenantId,
      });

    if (tenantContextError !== null) {
      console.warn('Failed to fetch tenant context:', tenantContextError);
    }

    const safeTenant = tenantContext || {
      id: tenantId,
      name: 'Unknown',
      slug: 'unknown',
      type: 'collective',
    };

    // Ensure posts is a proper array to satisfy TypeScript
    const postsArray = (Array.isArray(posts)
      ? posts
      : []) as unknown as PostWithAuthor[];

    // Fetch video data for video posts
    const videoPostIds = postsArray
      .filter((p) => p.post_type === 'video' && p.video_id)
      .map((p) => p.video_id)
      .filter((id): id is string => id !== null);

    const videoDataMap = new Map();
    if (videoPostIds.length > 0) {
      // Fetching video data
      const { data: videoAssets } = await supabase
        .from('video_assets')
        .select('id, mux_playback_id, status, duration, is_public')
        .in('id', videoPostIds);

      if (videoAssets) {
        videoAssets.forEach((asset) => {
          videoDataMap.set(asset.id, asset);
        });
        // Video assets fetched successfully
      }
    }

    // Attach tenant metadata manually to each post result
    const postsWithTenant = postsArray.map((p) => {
      const video =
        p.post_type === 'video' && p.video_id
          ? videoDataMap.get(p.video_id) || null
          : null;

      // Processing post data

      return {
        ...p,
        author: Array.isArray(p.author)
          ? (p.author[0] ?? null)
          : (p.author ?? null),
        video,
        tenant: safeTenant,
        // Add comment_count (defaulting to 0 for now)
        comment_count: 0,
      };
    });

    // Get total count for pagination
    let countQuery = supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    if (status === 'published') {
      countQuery = countQuery
        .eq('status', 'active')
        .not('published_at', 'is', null);
    } else if (status === 'draft') {
      countQuery = countQuery.eq('status', 'draft');
    }

    if (author_id !== null && author_id !== undefined) {
      countQuery = countQuery.eq('author_id', author_id);
    }

    const { count, error: countError } = await countQuery;

    if (countError !== null) {
      console.warn('Failed to get post count:', countError);
    }

    // Validate tenant exists and get its slug
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('slug')
      .eq('id', tenantId)
      .maybeSingle();

    if (tenantError !== null || tenant === null) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const tenantSlug = tenant.slug;
    if (tenantSlug === null || tenantSlug === undefined) {
      return NextResponse.json(
        { error: 'Invalid tenant configuration' },
        { status: 500 },
      );
    }

    // Use the validated tenant slug for revalidation
    revalidatePath(`/tenants/${tenantSlug}`);
    revalidatePath(`/tenants/${tenantSlug}/posts`);

    return createTenantSuccessResponse({
      posts: postsWithTenant,
      pagination: {
        limit,
        offset,
        total: count || 0,
        hasMore: (count || 0) > offset + limit,
      },
      meta: {
        tenant_id: tenantId,
        user_role: userRole,
        status_filter: status,
      },
    });
  } catch (error) {
    console.error('Error in tenant posts API:', error);
    return createTenantErrorResponse('Internal server error', 500);
  }
}

// =============================================================================
// CREATE POST IN TENANT
// =============================================================================

const CreatePostSchema = z.object({
  title: z.string().min(1).max(200),
  subtitle: z.string().max(300).optional(),
  content: z.string().min(1),
  slug: z.string().min(3).max(100),
  is_public: z.boolean().default(true),
  status: z.enum(['draft', 'active']).default('draft'),
  seo_title: z.string().max(60).optional(),
  meta_description: z.string().max(160).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
): Promise<NextResponse> {
  try {
    const { tenantId } = await params;
    const body = await request.json();

    // Validate request body
    const validationResult = CreatePostSchema.safeParse(body);
    if (!validationResult.success) {
      return createTenantErrorResponse(
        `Invalid request data: ${validationResult.error.message}`,
        400,
      );
    }

    const postData = validationResult.data;

    // Get the supabase client and user first
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return createTenantErrorResponse('Authentication required', 401);
    }

    // Check tenant access using the cached function with user ID
    const { data: hasAccess, error: accessError } = await supabase.rpc(
      'user_has_tenant_access',
      {
        target_tenant_id: tenantId,
        required_role: 'editor',
      },
    );

    if (accessError || !hasAccess) {
      return createTenantErrorResponse('Access denied', 403);
    }

    // Get user's role in the tenant
    const { data: memberData, error: memberError } = await supabase
      .from('tenant_members')
      .select('role')
      .eq('tenant_id', tenantId)
      .eq('user_id', user.id)
      .single();

    if (memberError || !memberData) {
      return createTenantErrorResponse('Failed to get user role', 403);
    }

    const userRole = memberData.role;

    // Create the post
    const postInsertData = {
      title: postData.title,
      content: postData.content,
      slug: postData.slug,
      is_public: postData.is_public,
      status: postData.status,
      author_id: user.id,
      tenant_id: tenantId,
      collective_id: tenantId, // For backward compatibility
      subtitle: postData.subtitle || null,
      seo_title: postData.seo_title || null,
      meta_description: postData.meta_description || null,
    };

    const { data: newPost, error: insertError } = await supabase
      .from('posts')
      .insert(postInsertData)
      .select(
        `
            id,
            title,
            subtitle,
            status,
            created_at,
            author:users!author_id(username, full_name)
          `,
      )
      .single();

    if (insertError !== null) {
      throw new Error(`Failed to create post: ${insertError.message}`);
    }

    return createTenantSuccessResponse(
      {
        post: newPost,
        message: 'Post created successfully',
      },
      201,
    );
  } catch (error) {
    console.error('Error creating post in tenant:', error);
    return createTenantErrorResponse('Internal server error', 500);
  }
}
