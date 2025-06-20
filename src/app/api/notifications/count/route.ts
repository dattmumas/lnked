import { NextResponse } from 'next/server';

import { createNotificationService } from '@/lib/notifications/service';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(): Promise<Response> {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const notificationService = createNotificationService();
    const count = await notificationService.getUnreadCount();

    return NextResponse.json({ count });
  } catch (error: unknown) {
    console.error('Error fetching notification count:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 