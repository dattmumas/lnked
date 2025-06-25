import { NextRequest, NextResponse } from 'next/server';

import { createServerSupabaseClient } from '@/lib/supabase/server';


// Constants for HTTP status codes
const HTTP_OK = 200;
const HTTP_UNAUTHORIZED = 401;
const HTTP_INTERNAL_SERVER_ERROR = 500;

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

    // Count unread notifications
    const { count, error: countError } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false);

    if (countError !== null) {
      console.error('Error counting notifications:', countError);
      return NextResponse.json(
        { error: 'Failed to count notifications' },
        { status: HTTP_INTERNAL_SERVER_ERROR }
      );
    }

    return NextResponse.json(
      { 
        unreadCount: count || 0
      },
      { status: HTTP_OK }
    );
  } catch (error: unknown) {
    console.error('Error in GET /api/notifications/count:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: HTTP_INTERNAL_SERVER_ERROR }
    );
  }
} 