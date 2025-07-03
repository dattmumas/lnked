'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

import VideoThumbnail from '@/components/app/posts/molecules/VideoThumbnail';
import { Avatar, AvatarImage } from '@/components/ui/avatar';
import { useUser } from '@/hooks/useUser';
import { useVideoStatusRealtime } from '@/hooks/video/useVideoStatusRealtime';

import type { VideoAsset } from '@/lib/data-access/schemas/video.schema';

interface VideoPostCardProps {
  post: {
    id: string;
    title: string;
    created_at: string;
    post_type: 'video';
  };
  video: Pick<
    VideoAsset,
    'mux_playback_id' | 'status' | 'is_public' | 'duration'
  >;
  author: { full_name: string | null; avatar_url: string | null };
}

export default function VideoPostCard({
  post,
  video,
  author,
}: VideoPostCardProps) {
  console.log(
    `🎬 [VideoPostCard] RENDER - Post ID: ${post.id}, Title: ${post.title}`,
  );
  console.log(`🎬 [VideoPostCard] Initial video data:`, {
    mux_playback_id: video.mux_playback_id,
    status: video.status,
    is_public: video.is_public,
    duration: video.duration,
  });

  const { user } = useUser();
  const [currentVideoData, setCurrentVideoData] = useState(video);

  // Log when component mounts/unmounts
  useEffect(() => {
    console.log(`🎬 [VideoPostCard] MOUNTED - Post: ${post.id}`);
    return () => {
      console.log(`🎬 [VideoPostCard] UNMOUNTED - Post: ${post.id}`);
    };
  }, [post.id]);

  // Log when video data changes
  useEffect(() => {
    console.log(
      `🎬 [VideoPostCard] Video data updated for ${post.id}:`,
      currentVideoData,
    );
  }, [currentVideoData, post.id]);

  // Log when props change
  useEffect(() => {
    console.log(`🎬 [VideoPostCard] Props changed for ${post.id}:`, { video });
    setCurrentVideoData(video);
  }, [video, post.id]);

  // Set up realtime video status updates
  useVideoStatusRealtime({
    userId: user?.id || '',
    enabled: Boolean(user?.id),
    onStatusUpdate: (update) => {
      console.log(
        `🎬 [VideoPostCard] REALTIME UPDATE received for post ${post.id}:`,
        {
          updateId: update.id,
          updateStatus: update.status,
          updatePlaybackId: update.mux_playback_id,
          currentVideoStatus: currentVideoData.status,
          currentPlaybackId: currentVideoData.mux_playback_id,
        },
      );

      // TODO: We need to match this update to our specific video
      // For now, let's see what updates we're getting
      console.log(`🎬 [VideoPostCard] All available update data:`, update);

      // Apply update for now (we'll fix matching later)
      setCurrentVideoData((prev) => {
        const newData = {
          ...prev,
          status: update.status,
          mux_playback_id: update.mux_playback_id || prev.mux_playback_id,
          duration: update.duration || prev.duration,
        };
        console.log(`🎬 [VideoPostCard] UPDATING video data for ${post.id}:`, {
          from: prev,
          to: newData,
        });
        return newData;
      });
    },
  });

  // If a Mux playbackId exists we can assume the asset is playable. Treat only
  // assets *without* a playbackId as still processing, regardless of status
  // string – this avoids edge-cases where the status column lags behind.
  const isProcessing = !currentVideoData.mux_playback_id;
  const isPrivate = currentVideoData.is_public === false;

  console.log(`🎬 [VideoPostCard] COMPUTED STATE for ${post.id}:`, {
    isProcessing,
    isPrivate,
    hasPlaybackId: Boolean(currentVideoData.mux_playback_id),
    status: currentVideoData.status,
  });

  return (
    <article className="border rounded-lg bg-card overflow-hidden">
      <Link href={`/videos/${currentVideoData.mux_playback_id || ''}`}>
        <VideoThumbnail
          playbackId={currentVideoData.mux_playback_id ?? ''}
          isProcessing={isProcessing}
        />
      </Link>

      <div className="p-4 space-y-2">
        <header className="flex items-center gap-2 text-sm text-muted-foreground">
          <Avatar className="h-6 w-6">
            <AvatarImage src={author.avatar_url ?? undefined} />
          </Avatar>
          <span>{author.full_name ?? 'Unknown'}</span>
          <span className="mx-1">•</span>
          <time dateTime={post.created_at}>
            {new Date(post.created_at).toLocaleDateString()}
          </time>
        </header>

        <h3 className="text-base font-semibold leading-snug line-clamp-2">
          {post.title}
        </h3>

        {/* Enhanced debug info */}
        <div className="text-xs text-muted-foreground bg-gray-100 p-2 rounded">
          <div>
            Status: <strong>{currentVideoData.status || 'unknown'}</strong>
          </div>
          <div>
            PlaybackId:{' '}
            <strong>{currentVideoData.mux_playback_id ? 'Yes' : 'No'}</strong>
          </div>
          <div>
            Is Processing: <strong>{isProcessing ? 'Yes' : 'No'}</strong>
          </div>
          <div>
            User ID: <strong>{user?.id || 'None'}</strong>
          </div>
        </div>
      </div>
    </article>
  );
}
