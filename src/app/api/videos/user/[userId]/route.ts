import { NextRequest, NextResponse } from 'next/server';

import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * GET /api/videos/user/[userId]
 * Fetch videos for a specific user (for profile pages)
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
): Promise<NextResponse> {
  try {
    const supabase = await createServerSupabaseClient();
    const { userId } = await context.params;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');
    const sortParam = searchParams.get('sort');
    const orderParam = searchParams.get('order');
    
    const page = parseInt(
      pageParam !== null && pageParam !== undefined && pageParam.trim().length > 0 
        ? pageParam 
        : '1'
    );
    const limit = parseInt(
      limitParam !== null && limitParam !== undefined && limitParam.trim().length > 0 
        ? limitParam 
        : '20'
    );
    const sort = 
      sortParam !== null && sortParam !== undefined && sortParam.trim().length > 0 
        ? sortParam 
        : 'created_at';
    const order = 
      orderParam !== null && orderParam !== undefined && orderParam.trim().length > 0 
        ? orderParam 
        : 'desc';

    // Get current user for privacy checks
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    const isOwner = currentUser?.id === userId;

    // Build query - only show active (non-deleted) videos
    let query = supabase
      .from('video_assets')
      .select(`
        id,
        title,
        description,
        duration,
        mux_playback_id,
        created_at,
        updated_at,
        status
      `, { count: 'exact' })
      .eq('created_by', userId)
      .is('deleted_at', null); // Only active (non-deleted) videos

    // Apply privacy filters - only owners can see all videos
    if (isOwner !== true) {
      query = query
        .eq('is_public', true)
        .in('status', ['ready', 'preparing']); // Hide errored videos from public
    }

    // Apply sorting
    query = query.order(sort, { ascending: order === 'asc' });

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: videos, error: fetchError, count } = await query;

    if (fetchError !== null) {
      console.error('Error fetching user videos:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch videos' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        videos: videos !== null && videos !== undefined ? videos : [],
        total: count !== null && count !== undefined && count >= 0 ? count : 0,
        page,
        limit,
        isOwner,
      },
    });
  } catch (error: unknown) {
    console.error('User videos API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 