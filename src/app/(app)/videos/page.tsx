import { redirect } from 'next/navigation';
import React from 'react';

import VideoManagementDashboard from '@/components/app/video/manage/VideoManagementDashboard';
import {
  loadVideoData,
  loadProcessingVideos,
} from '@/lib/data-loaders/video-loader';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function VideosPage(): Promise<React.ReactElement> {
  const supabase = await createServerSupabaseClient();

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/sign-in?redirect=/videos');
  }

  // Load initial video data server-side
  const [videoData, processingVideos] = await Promise.all([
    loadVideoData(user.id, { page: 1, limit: 20 }),
    loadProcessingVideos(user.id),
  ]);

  return (
    <div className="min-h-screen bg-background">
      <VideoManagementDashboard
        initialData={videoData}
        initialProcessingVideos={processingVideos}
        userId={user.id}
      />
    </div>
  );
}
