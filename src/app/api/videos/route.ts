import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

import type { Database } from '@/lib/database.types';

/**
 * GET /api/videos
 * Fetch videos for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) {
      return NextResponse.json(
        { error: 'Supabase environment variables are missing' },
        { status: 500 }
      );
    }
    // Use async cookie helpers to avoid capturing stale cookies
    const supabase = createServerClient<Database>(url, anonKey, {
      cookies: {
        get: async (name) => {
          const store = await cookies();
          return store.get(name)?.value;
        },
        // These GET routes don't mutate cookies; graceful no‑ops keep types happy
        set: async () => {},
        remove: async () => {},
      },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status');
    const sort = searchParams.get('sort') || 'created_at';
    const order = searchParams.get('order') || 'desc';

    // Build query
    let query = supabase
      .from('video_assets')
      .select('*', { count: 'exact' })
      .eq('created_by', user.id);

    // Apply filters
    if (search) {
      query = query.ilike('title', `%${search}%`);
    }

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    // Apply sorting
    query = query.order(sort, { ascending: order === 'asc' });

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: videos, error: fetchError, count } = await query;

    if (fetchError) {
      console.error('Error fetching videos:', fetchError);
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
      },
    });
  } catch (error) {
    console.error('Videos API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 