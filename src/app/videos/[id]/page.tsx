import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import VideoPlayerPageClient from '@/components/app/video/VideoPlayerPageClient';

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

  return (
    <div className="min-h-screen bg-background">
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        }
      >
        <VideoPlayerPageClient video={video} />
      </Suspense>
    </div>
  );
}
