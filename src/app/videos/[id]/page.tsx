import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import VideoPlayerPageClient from '@/components/app/video/VideoPlayerPageClient';

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
  mux_asset_id: string;
  mux_playback_id: string | null;
  created_by: string | null;
  mp4_support?: string | null; // 'none' | 'capped-1080p' | 'audio-only'
}

interface VideoPlayerPageProps {
  params: Promise<{ id: string }>;
}

async function getVideoData(videoId: string) {
  const supabase = await createServerSupabaseClient();

  const { data: video, error } = await supabase
    .from('video_assets')
    .select('*')
    .eq('id', videoId)
    .single();

  if (error || !video) {
    return null;
  }

  return video;
}

export default async function VideoPlayerPage({
  params,
}: VideoPlayerPageProps) {
  const { id } = await params;
  const video = await getVideoData(id);

  if (!video) {
    notFound();
  }

  // Check if video has the required non-null fields
  if (!video.mux_asset_id) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background">
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        }
      >
        <VideoPlayerPageClient video={video as VideoAsset} />
      </Suspense>
    </div>
  );
}
