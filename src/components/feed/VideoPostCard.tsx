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
  const { user } = useUser();
  const [currentVideoData, setCurrentVideoData] = useState(video);

  // Update video data when props change
  useEffect(() => {
    setCurrentVideoData(video);
  }, [video]);

  // Set up realtime video status updates
  useVideoStatusRealtime({
    userId: user?.id || '',
    enabled: Boolean(user?.id),
    onStatusUpdate: (update) => {
      // Apply update for now (we'll fix matching later)
      setCurrentVideoData((prev) => ({
        ...prev,
        status: update.status,
        mux_playback_id: update.mux_playback_id || prev.mux_playback_id,
        duration: update.duration || prev.duration,
      }));
    },
  });

  // If a Mux playbackId exists we can assume the asset is playable. Treat only
  // assets *without* a playbackId as still processing, regardless of status
  // string – this avoids edge-cases where the status column lags behind.
  const isProcessing = !currentVideoData.mux_playback_id;

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
      </div>
    </article>
  );
}
