// Tenant Posts API Route
// Provides tenant-scoped post feeds with proper access control

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  withTenantAccess,
  createTenantErrorResponse,
  createTenantSuccessResponse,
} from '@/lib/api/tenant-helpers';

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
  view_count: number | null;
  like_count: number | null;
  created_at: string;
  updated_at: string | null;
  published_at: string | null;
  seo_title: string | null;
  meta_description: string | null;
  thumbnail_url: string | null;
  author:
    | {
        id: string;
        username: string | null;
        full_name: string | null;
        avatar_url: string | null;
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

    // Execute with tenant access validation
    const result = await withTenantAccess(
      tenantId,
      'member', // Minimum role required to view posts
      async (supabase, userRole) => {
        // Build query
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
            seo_title,
            meta_description,
            thumbnail_url,
            author:users!author_id(
              id,
              username,
              full_name,
              avatar_url
            )
          `,
          )
          .eq('tenant_id', tenantId);

        // Apply status filter based on user role
        switch (status) {
          case 'published': {
            query = query
              .eq('status', 'active')
              .not('published_at', 'is', null);

            break;
          }
          case 'draft': {
            // Only editors+ can see drafts
            if (!['editor', 'admin', 'owner'].includes(userRole)) {
              throw new Error('Insufficient permissions to view drafts');
            }
            query = query.eq('status', 'draft');

            break;
          }
          case 'all': {
            // Only admins+ can see all posts
            if (!['admin', 'owner'].includes(userRole)) {
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

        // Attach tenant metadata manually to each post result
        const postsWithTenant = postsArray.map((p) => ({
          ...p,
          author: Array.isArray(p.author)
            ? (p.author[0] ?? null)
            : (p.author ?? null),
          tenant: safeTenant,
        }));

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

        return {
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
        };
      },
    );

    if (result.error !== null && result.error !== undefined) {
      return createTenantErrorResponse(result.error, result.status);
    }

    return createTenantSuccessResponse(result.data);
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

    // Execute with tenant access validation
    const result = await withTenantAccess(
      tenantId,
      'editor', // Minimum role required to create posts
      async (supabase, userRole) => {
        // Get current user
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();
        if (authError !== null || user === null) {
          throw new Error('Authentication required');
        }

        // Create the post
        const { data: newPost, error: insertError } = await supabase
          .from('posts')
          .insert({
            ...postData,
            author_id: user.id,
            tenant_id: tenantId,
            collective_id: tenantId, // For backward compatibility
          })
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

        return {
          post: newPost,
          message: 'Post created successfully',
        };
      },
    );

    if (result.error !== null && result.error !== undefined) {
      return createTenantErrorResponse(result.error, result.status);
    }

    return createTenantSuccessResponse(result.data, 201);
  } catch (error) {
    console.error('Error creating post in tenant:', error);
    return createTenantErrorResponse('Internal server error', 500);
  }
}
