import { NextRequest, NextResponse } from 'next/server';

import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * GET /api/videos/user/[userId]
 * Fetch videos for a specific user (for profile pages)
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { userId } = await context.params;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const sort = searchParams.get('sort') || 'created_at';
    const order = searchParams.get('order') || 'desc';

    // Get current user for privacy checks
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    const isOwner = currentUser?.id === userId;

    // Build query - only show published videos for non-owners
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
      .eq('created_by', userId);

    // Apply privacy filters - only owners can see all videos
    if (!isOwner) {
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

    if (fetchError) {
      console.error('Error fetching user videos:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch videos' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        videos: videos || [],
        total: count || 0,
        page,
        limit,
        isOwner,
      },
    });
  } catch (error) {
    console.error('User videos API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 