import { NextRequest, NextResponse } from 'next/server';

import { createServerSupabaseClient } from '@/lib/supabase/server';


// Constants for HTTP status codes
const HTTP_OK = 200;
const HTTP_BAD_REQUEST = 400;
const HTTP_UNAUTHORIZED = 401;
const HTTP_INTERNAL_SERVER_ERROR = 500;
const DEFAULT_LIMIT = 20;
const MIN_QUERY_LENGTH = 2;

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createServerSupabaseClient();

    // Get the current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError !== null || user === null) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: HTTP_UNAUTHORIZED }
      );
    }

    // Get search params
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim() || '';
    const limit = parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT), 10);

    if (query.length < MIN_QUERY_LENGTH) {
      return NextResponse.json(
        { error: 'Query must be at least 2 characters long' },
        { status: HTTP_BAD_REQUEST }
      );
    }

    // Search for users by username, full_name, or bio
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, username, full_name, bio, avatar_url')
      .or(`username.ilike.%${query}%,full_name.ilike.%${query}%,bio.ilike.%${query}%`)
      .neq('id', user.id) // Exclude current user from results
      .not('username', 'is', null)
      .order('username', { ascending: true })
      .limit(limit);

    if (usersError !== null) {
      console.error('Error searching users:', usersError);
      return NextResponse.json(
        { error: 'Failed to search users' },
        { status: HTTP_INTERNAL_SERVER_ERROR }
      );
    }

    return NextResponse.json(
      { 
        users: usersData || [],
        query,
        count: (usersData || []).length
      },
      { status: HTTP_OK }
    );
  } catch (error: unknown) {
    console.error('Error in GET /api/search/users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: HTTP_INTERNAL_SERVER_ERROR }
    );
  }
}

export const runtime = 'nodejs'; 