import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { VideoAssetListSchema } from '@/lib/data-access/schemas/video.schema';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// Constants for scalability
const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;
const MAX_SEARCH_LENGTH = 120;
const CACHE_MAX_AGE = 30; // seconds

// Whitelisted sortable columns to prevent injection and ensure index usage
const ORDERABLE_COLUMNS = {
  created_at: 'created_at',
  title: 'title', 
  duration: 'duration',
  updated_at: 'updated_at',
} as const;



// Request parameter validation schema
const VideoListParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
  search: z.string().max(MAX_SEARCH_LENGTH).optional(),
  status: z.enum(['ready', 'processing', 'failed', 'preparing', 'all']).optional(),
  sort: z.enum(['created_at', 'title', 'duration', 'updated_at']).default('created_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
  cursor: z.string().optional(), // For future keyset pagination
});

type VideoListParams = z.infer<typeof VideoListParamsSchema>;

// Minimal fields for list view (performance optimization)
const LIST_VIEW_FIELDS = `
  id,
  title,
  status,
  duration,
  created_at,
  updated_at,
  is_public,
  mux_playback_id
` as const;

/**
 * GET /api/videos
 * Fetch videos for authenticated user with optimized scalability
 * Supports search, filtering, sorting, and pagination
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Create Supabase client with proper auth context for edge runtime
    const supabase = createServerSupabaseClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError !== null || user === null) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Validate query parameters with Zod for robust input handling
    let params: VideoListParams;
    try {
      const searchParamsObj = Object.fromEntries(new URL(request.url).searchParams);
      params = VideoListParamsSchema.parse(searchParamsObj);
    } catch (error: unknown) {
      console.error('Invalid query parameters:', { 
        error: error instanceof z.ZodError ? error.errors : 'Unknown validation error',
        user_id: user.id 
      });
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error instanceof z.ZodError ? error.errors : undefined },
        { status: 400 }
      );
    }

    const { page, limit, search, status, sort, order } = params;

    // Build optimized query with minimal field projection - only active videos
    let query = supabase
      .from('video_assets')
      .select(LIST_VIEW_FIELDS) // No count for performance - use keyset pagination in future
      .eq('created_by', user.id)
      .is('deleted_at', null); // Only active (non-deleted) videos

    // Apply search filter (requires trigram index: CREATE INDEX video_assets_title_trgm ON video_assets USING gin (title gin_trgm_ops))
    if (search !== undefined && search.trim().length > 0) {
      query = query.ilike('title', `%${search.trim()}%`);
    }

    // Apply status filter (requires composite index: CREATE INDEX video_assets_by_user_status ON video_assets(created_by, status))
    if (status !== undefined && status !== 'all') {
      query = query.eq('status', status);
    }

    // Apply whitelisted sorting to ensure index usage
    const safeSort = ORDERABLE_COLUMNS[sort] ?? ORDERABLE_COLUMNS.created_at;
    const safeOrder = order === 'asc' ? 'asc' : 'desc';
    query = query.order(safeSort, { ascending: safeOrder === 'asc' });

    // Apply clamped pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: videos, error: fetchError } = await query;

    if (fetchError !== null) {
      console.error('Database error:', { 
        code: fetchError.code, 
        user_id: user.id,
        operation: 'fetch_videos'
      });
      return NextResponse.json(
        { error: 'Failed to fetch videos' },
        { status: 500 }
      );
    }

    // Calculate hasMore for efficient pagination (no expensive COUNT)
    const hasMore = videos !== null && videos.length === limit;
    const nextPage = hasMore ? page + 1 : undefined;

    // Prepare cache headers for performance
    const cacheHeaders = {
      'Cache-Control': `private, max-age=${CACHE_MAX_AGE}`,
      Vary: 'Authorization',
    };

    // Generate ETag for conditional requests (future optimization)
    const lastUpdated = videos !== null && videos !== undefined && videos.length > 0 
      ? Math.max(...videos.map(v => {
          const timestamp = v.updated_at ?? v.created_at ?? new Date().toISOString();
          return new Date(timestamp).getTime();
        }))
      : Date.now();
    const etag = `"${user.id}-${lastUpdated}-${JSON.stringify(params)}"`;

    // Transform null values to undefined for frontend compatibility
    const transformedVideos = videos !== null && videos !== undefined
      ? videos.map(video => VideoAssetListSchema.parse(video))
      : [];

    return NextResponse.json({
      success: true,
      data: {
        videos: transformedVideos,
        pagination: {
          page,
          limit,
          hasMore,
          nextPage,
          // Note: total count removed for performance - use keyset pagination for large datasets
        },
        filters: {
          search: search !== undefined && search.trim().length > 0 ? search.trim() : undefined,
          status: status !== 'all' ? status : undefined,
          sort: safeSort,
          order: safeOrder,
        },
      },
    }, {
      status: 200,
      headers: {
        ...cacheHeaders,
        ETag: etag,
      },
    });
  } catch (error: unknown) {
    console.error('Videos API error:', { 
      message: error instanceof Error ? error.message : 'Unknown error',
      operation: 'get_videos'
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 