import { NextRequest, NextResponse } from 'next/server';

import { notificationService } from '@/lib/notifications/service';
import { createServerSupabaseClient } from '@/lib/supabase/server';

import type { NotificationPreferencesUpdate } from '@/types/notifications';

interface PreferencesRequestBody {
  preferences?: unknown;
}

export async function GET(): Promise<NextResponse> {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    const preferences = await notificationService.getPreferences();
    return NextResponse.json({ preferences });
  } catch (error: unknown) {
    console.error('Error fetching notification preferences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notification preferences' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest): Promise<NextResponse> {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    const body: PreferencesRequestBody = await req.json() as PreferencesRequestBody;
    const { preferences } = body;

    if (preferences === null || preferences === undefined || !Array.isArray(preferences)) {
      return NextResponse.json(
        { error: 'preferences array is required' },
        { status: 400 }
      );
    }

    const result = await notificationService.updatePreferences(preferences as NotificationPreferencesUpdate[]);

    if (result.success === false) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error updating notification preferences:', error);
    return NextResponse.json(
      { error: 'Failed to update notification preferences' },
      { status: 500 }
    );
  }
} 