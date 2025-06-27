'use client';

import { Play, Clock, Calendar } from 'lucide-react';
import Link from 'next/link';
import React, { useState, useEffect, useCallback } from 'react';

import VideoThumbnail from '@/components/app/posts/molecules/VideoThumbnail';
import { Button } from '@/components/ui/button';

// Constants for magic numbers
const DEFAULT_VIDEO_LIMIT = 12;
const SECONDS_PER_MINUTE = 60;
const SECONDS_REMAINDER_PADDING = 2;

interface VideoAsset {
  id: string;
  title: string | null;
  description: string | null;
  duration: number | null;
  mux_playback_id: string | null;
  created_at: string;
  updated_at: string;
  status: string;
}

interface VideosApiResponse {
  data: {
    videos: VideoAsset[];
    total: number;
  };
}

interface ProfileVideosSectionProps {
  userId: string;
  isOwner?: boolean;
  className?: string;
  limit?: number;
  showHeader?: boolean;
}

export function ProfileVideosSection({
  userId,
  isOwner = false,
  className = '',
  limit = DEFAULT_VIDEO_LIMIT,
  showHeader = true,
}: ProfileVideosSectionProps): React.ReactElement {
  const [videos, setVideos] = useState<VideoAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);
  const [total, setTotal] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleReload = useCallback((): void => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  const fetchVideos = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(undefined);

      const response = await fetch(
        `/api/videos/user/${userId}?limit=${limit}&sort=created_at&order=desc`,
      );

      if (!response.ok) {
        throw new Error('Failed to fetch videos');
      }

      const result = (await response.json()) as VideosApiResponse;
      setVideos(result.data?.videos ?? []);
      setTotal(result.data?.total ?? 0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load videos');
    } finally {
      setIsLoading(false);
    }
  }, [userId, limit]);

  useEffect((): void => {
    void fetchVideos();
  }, [fetchVideos, refreshKey]);

  if (isLoading) {
    return (
      <section className={`${showHeader ? 'space-y-6' : ''} ${className}`}>
        {showHeader && (
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-foreground flex items-center gap-2">
              <Play className="h-6 w-6" />
              Videos
            </h2>
          </div>
        )}
        <VideoGridSkeleton />
      </section>
    );
  }

  if (error !== undefined && error !== null && error.length > 0) {
    return (
      <section className={`${showHeader ? 'space-y-6' : ''} ${className}`}>
        {showHeader && (
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-foreground flex items-center gap-2">
              <Play className="h-6 w-6" />
              Videos
            </h2>
          </div>
        )}
        <div className="text-center py-12 space-y-4">
          <div className="text-6xl">⚠️</div>
          <div>
            <h3 className="text-lg font-medium text-foreground">
              Error Loading Videos
            </h3>
            <p className="text-muted-foreground mt-2">{error}</p>
            <Button onClick={handleReload} className="mt-4" variant="outline">
              Try Again
            </Button>
          </div>
        </div>
      </section>
    );
  }

  if (videos.length === 0) {
    return (
      <section className={`${showHeader ? 'space-y-6' : ''} ${className}`}>
        {showHeader && (
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-foreground flex items-center gap-2">
              <Play className="h-6 w-6" />
              Videos
            </h2>
          </div>
        )}
        <div className="text-center py-12 space-y-4">
          <div className="text-6xl">🎥</div>
          <div>
            <h3 className="text-lg font-medium text-foreground">
              {isOwner ? 'No videos yet' : 'No videos shared'}
            </h3>
            <p className="text-muted-foreground mt-2">
              {isOwner
                ? 'Upload your first video to get started.'
                : 'This user has not shared any videos yet.'}
            </p>
            {isOwner && (
              <Button asChild className="mt-4">
                <Link href="/videos/upload">Upload Video</Link>
              </Button>
            )}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={`${showHeader ? 'space-y-6' : ''} ${className}`}>
      {showHeader && (
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <Play className="h-6 w-6" />
            Videos
            <span className="text-lg text-muted-foreground">({total})</span>
          </h2>
          {total > limit && (
            <Button variant="outline" size="sm" asChild>
              <Link href={isOwner ? '/dashboard' : `/profile/${userId}/videos`}>
                View All
              </Link>
            </Button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {videos.map((video) => (
          <VideoCard key={video.id} video={video} />
        ))}
      </div>
    </section>
  );
}

function VideoCard({ video }: { video: VideoAsset }): React.ReactElement {
  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / SECONDS_PER_MINUTE);
    const remainingSeconds = seconds % SECONDS_PER_MINUTE;
    return `${minutes}:${remainingSeconds.toString().padStart(SECONDS_REMAINDER_PADDING, '0')}`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <Link
      href={`/videos/${video.id}`}
      className="group block bg-card rounded-lg border overflow-hidden transition-all hover:shadow-md hover:-translate-y-1"
    >
      <div className="relative aspect-video bg-muted">
        <VideoThumbnail
          {...(video.mux_playback_id
            ? { playbackId: video.mux_playback_id }
            : {})}
          {...(video.duration && video.duration > 0
            ? { duration: video.duration }
            : {})}
          isProcessing={video.status === 'preparing'}
          className="w-full h-full"
        />
      </div>

      <div className="p-3 space-y-2">
        <h3 className="font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">
          {video.title !== undefined &&
          video.title !== null &&
          video.title.length > 0
            ? video.title
            : 'Untitled Video'}
        </h3>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formatDate(video.created_at)}
          </div>
          {video.duration !== undefined &&
            video.duration !== null &&
            video.duration > 0 && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDuration(video.duration)}
              </div>
            )}
        </div>

        {video.description !== undefined &&
          video.description !== null &&
          video.description.length > 0 && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {video.description}
            </p>
          )}
      </div>
    </Link>
  );
}

function VideoGridSkeleton(): React.ReactElement {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="bg-card rounded-lg border overflow-hidden animate-pulse"
        >
          <div className="aspect-video bg-muted" />
          <div className="p-3 space-y-2">
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-3 bg-muted rounded w-3/4" />
            <div className="flex justify-between">
              <div className="h-3 bg-muted rounded w-16" />
              <div className="h-3 bg-muted rounded w-12" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
