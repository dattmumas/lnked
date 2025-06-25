import { redirect } from 'next/navigation';
import React from 'react';

import VideoManagementDashboard from '@/components/app/video/manage/VideoManagementDashboard';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function VideosPage(): Promise<React.ReactElement> {
  const supabase = await createServerSupabaseClient();

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/sign-in');
  }

  return (
    <div className="min-h-screen bg-background">
      <VideoManagementDashboard />
    </div>
  );
}
