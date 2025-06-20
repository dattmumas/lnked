import { notFound } from 'next/navigation';
import React, { Suspense } from 'react';

import { RightSidebar } from '@/components/app/chains/RightSidebar';
import { CommentSection } from '@/components/app/comments';
import VideoDetailsServer from '@/components/app/video/VideoDetailsServer';
import VideoPlayerClient from '@/components/app/video/VideoPlayerClient';
import { CommentsSkeleton } from '@/components/ui/CommentsSkeleton';
import { VideoPlayerSkeleton } from '@/components/ui/VideoPlayerSkeleton';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// Type based on database schema
interface VideoAsset {
  id: string;
  title: string | null;
  description: string | null;
  status: string | null;
  duration: number | null;
  aspect_ratio: string | null;
  created_at: string | null;
  updated_at: string | null;
  mux_asset_id: string | null;
  mux_playback_id: string | null;
  created_by: string | null;
  comment_count: number;
  mp4_support?: string | null; // 'none' | 'capped-1080p' | 'audio-only'
}

interface VideoPlayerPageProps {
  params: Promise<{ id: string }>;
}

async function getVideoData(videoId: string): Promise<VideoAsset | undefined> {
  const supabase = createServerSupabaseClient();

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

  return video;
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
  const supabase = createServerSupabaseClient();
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
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      {/* Main content: video details + player + comments */}
      <main className="ml-16 w-[calc(100%-4rem)] lg:w-[calc(100%-4rem-28rem)] flex flex-col items-center py-8">
        {/* Video metadata - renders immediately (no Suspense) */}
        <VideoDetailsServer video={videoAsset as Record<string, unknown>} />

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

        {/* Comments section - now using universal comment system */}
        <Suspense fallback={<CommentsSkeleton />}>
          <CommentSection
            entityType="video"
            entityId={videoAsset.id}
            initialCommentsCount={videoAsset.comment_count ?? 0}
            className="w-full max-w-4xl mt-8"
          />
        </Suspense>
      </main>

      {/* Right sidebar: chains (desktop only) */}
      {user !== undefined &&
        user !== null &&
        profile !== undefined &&
        profile !== null && <RightSidebar user={user} profile={profile} />}
    </div>
  );
}
