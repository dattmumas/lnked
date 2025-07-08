import { notFound } from 'next/navigation';
import React, { Suspense } from 'react';

import VideoDetailsServer from '@/components/app/video/VideoDetailsServer';
import VideoPlayerClient from '@/components/app/video/VideoPlayerClient';
import { VideoPlayerSkeleton } from '@/components/ui/VideoPlayerSkeleton';
import {
  VideoAssetSchema,
  VideoAsset,
} from '@/lib/data-access/schemas/video.schema';
import { createServerSupabaseClient } from '@/lib/supabase/server';

interface VideoPlayerPageProps {
  params: Promise<{ id: string }>;
}

async function getVideoData(videoId: string): Promise<VideoAsset | undefined> {
  const supabase = await createServerSupabaseClient();

  const { data: video, error } = await supabase
    .from('video_assets')
    .select('*')
    .eq('id', videoId)
    .single();

  if (
    (error !== undefined && error !== null) ||
    video === undefined ||
    video === null
  ) {
    return undefined;
  }

  // Transform null values to undefined for frontend compatibility
  return VideoAssetSchema.parse(video);
}

export default async function VideoPlayerPage({
  params,
}: VideoPlayerPageProps): Promise<React.ReactElement> {
  const { id } = await params;
  const video = await getVideoData(id);

  if (video === undefined || video === null) {
    notFound();
  }

  // Check if video has the required non-null fields
  if (
    video.mux_asset_id === undefined ||
    video.mux_asset_id === null ||
    video.mux_asset_id.length === 0
  ) {
    notFound();
  }

  // Use the video data directly (includes comment_count)
  const videoAsset = video;

  // Fetch user and profile for RightSidebar
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let profile = undefined;
  if (user !== undefined && user !== null) {
    const { data } = await supabase
      .from('users')
      .select('id, username, full_name, avatar_url, bio')
      .eq('id', user.id)
      .single();
    profile = data;
  }

  return (
    // Main content area – relies on parent layout grid. Full width on all screens.
    <main className="flex flex-col items-center w-full py-8 bg-background min-h-screen">
      {/* Video metadata - renders immediately (no Suspense) */}
      <VideoDetailsServer video={videoAsset} />

      {/* Video player - independent Suspense boundary */}
      <Suspense fallback={<VideoPlayerSkeleton />}>
        <VideoPlayerClient
          video={{
            id: videoAsset.id,
            title: videoAsset.title ?? undefined,
            mux_playback_id: videoAsset.mux_playback_id ?? undefined,
          }}
        />
      </Suspense>
    </main>
  );
}
