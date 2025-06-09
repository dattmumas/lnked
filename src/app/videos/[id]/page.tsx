import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import VideoDetailsServer from '@/components/app/video/VideoDetailsServer';
import VideoPlayerClient from '@/components/app/video/VideoPlayerClient';
import CommentsHybrid from '@/components/app/posts/organisms/CommentsHybrid';
import { VideoPlayerSkeleton } from '@/components/ui/VideoPlayerSkeleton';
import { CommentsSkeleton } from '@/components/ui/CommentsSkeleton';
import { RightSidebar } from '@/components/app/chains/RightSidebar';

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

  // Fetch user and profile for RightSidebar
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  let profile = null;
  if (user) {
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
      <main className="flex-1 flex flex-col items-center py-8">
        {/* Video metadata - renders immediately (no Suspense) */}
        <VideoDetailsServer video={video as VideoAsset} />

        {/* Video player - independent Suspense boundary */}
        <Suspense fallback={<VideoPlayerSkeleton />}>
          <VideoPlayerClient
            video={{
              id: video.id,
              title: video.title,
              mux_playback_id: video.mux_playback_id,
            }}
          />
        </Suspense>

        {/* Comments section - parallel Suspense boundary */}
        <Suspense fallback={<CommentsSkeleton />}>
          <CommentsHybrid postId={`video-${video.id}`} />
        </Suspense>
      </main>

      {/* Right sidebar: chains (desktop only) */}
      {user && profile && <RightSidebar user={user} profile={profile} />}
    </div>
  );
}
