'use client';

import { User } from '@supabase/supabase-js';
import { useEffect, useState, useCallback, useRef } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, Upload, Loader2, Clock, Eye, RefreshCw } from 'lucide-react';
import Link from 'next/link';

// Constants for refresh logic
const REFRESH_INTERVAL_MS = 5000; // 5 seconds

interface VideoAsset {
  id: string;
  title: string | null;
  description: string | null;
  status: string;
  duration: number | null;
  created_at: string | null;
  mux_asset_id: string | null;
  mux_playback_id: string | null;
  mux_upload_id: string | null;
  aspect_ratio: string | null;
}

interface VideosPageClientProps {
  user: User;
}

export default function VideosPageClient({ user }: VideosPageClientProps) {
  const [videos, setVideos] = useState<VideoAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createSupabaseBrowserClient();

  // Fetch all videos
  const fetchVideos = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('video_assets')
        .select(
          'id, title, description, status, duration, created_at, mux_asset_id, mux_playback_id, mux_upload_id, aspect_ratio',
        )
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setVideos(data || []);
      return data || [];
    } catch (err) {
      console.error('Error fetching videos:', err);
      setError(err instanceof Error ? err.message : 'Failed to load videos');
      return [];
    } finally {
      setLoading(false);
    }
  }, [user.id, supabase]);

  // Store videos in a ref for the refresh function to access
  const videosRef = useRef<VideoAsset[]>([]);
  useEffect(() => {
    videosRef.current = videos;
  }, [videos]);

  // Refresh processing videos
  const refreshProcessingVideos = useCallback(async () => {
    const processingVideos = videosRef.current.filter(
      (video) => video.status === 'preparing' || video.status === 'processing',
    );

    if (processingVideos.length === 0) {
      return;
    }

    console.log(`Refreshing ${processingVideos.length} processing videos...`);

    // Refresh each processing video
    const refreshPromises = processingVideos.map(async (video) => {
      try {
        const response = await fetch(`/api/videos/${video.id}/refresh`, {
          method: 'POST',
        });

        if (response.ok) {
          const result = await response.json();
          console.log(`Video ${video.id} refresh response:`, result);
          return result.video;
        } else {
          console.error(
            `Failed to refresh video ${video.id}: HTTP ${response.status}`,
          );
        }
        return null;
      } catch (error) {
        console.error(`Failed to refresh video ${video.id}:`, error);
        return null;
      }
    });

    const refreshedVideos = await Promise.all(refreshPromises);

    // Update the videos state with refreshed data
    setVideos((prevVideos) => {
      return prevVideos.map((video) => {
        const refreshedVideo = refreshedVideos.find(
          (refreshed) => refreshed && refreshed.id === video.id,
        );
        if (refreshedVideo && refreshedVideo.status !== video.status) {
          console.log(
            `Video ${video.id} status updated: ${video.status} -> ${refreshedVideo.status}`,
          );
        }
        return refreshedVideo || video;
      });
    });
  }, []);

  // Initial fetch
  useEffect(() => {
    const initializeVideos = async () => {
      const fetchedVideos = await fetchVideos();
      // Immediately check for processing videos after initial fetch
      const hasProcessingVideos = fetchedVideos.some(
        (v) => v.status === 'preparing' || v.status === 'processing',
      );
      if (hasProcessingVideos) {
        console.log(
          'Found processing videos on load, refreshing immediately...',
        );
        setTimeout(() => refreshProcessingVideos(), 1000); // Small delay to ensure state is set
      }
    };
    initializeVideos();
  }, [fetchVideos, refreshProcessingVideos]);

  // Set up automatic refresh interval
  useEffect(() => {
    const intervalId = setInterval(() => {
      refreshProcessingVideos();
    }, REFRESH_INTERVAL_MS);

    // Cleanup interval on unmount
    return () => clearInterval(intervalId);
  }, [refreshProcessingVideos]);

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'Unknown';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'preparing':
      case 'processing':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'errored':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-500">Loading videos...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="text-center py-12">
          <p className="text-red-500 mb-4">Error loading videos: {error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            My Videos
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage and view your uploaded videos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => fetchVideos()}
            title="Refresh videos"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button asChild>
            <Link href="/videos/upload" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Upload Video
            </Link>
          </Button>
        </div>
      </div>

      {/* Videos Grid */}
      {videos.length === 0 ? (
        <div className="text-center py-12">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Play className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No videos yet
            </h3>
            <p className="text-gray-500 mb-6">
              Upload your first video to get started
            </p>
            <Button asChild>
              <Link href="/videos/upload" className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Upload Video
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((video) => (
            <Card
              key={video.id}
              className="overflow-hidden hover:shadow-lg transition-shadow duration-200"
            >
              {/* Video Thumbnail - Always show MUX thumbnail, it handles all states */}
              <div className="relative aspect-video bg-gray-100 dark:bg-gray-800">
                {video.mux_playback_id ? (
                  <>
                    {/* MUX automatically shows a loading state while processing */}
                    <img
                      src={`https://image.mux.com/${video.mux_playback_id}/thumbnail.jpg?width=640&height=360&fit_mode=smartcrop&time=1`}
                      alt={video.title || 'Video thumbnail'}
                      className="absolute inset-0 w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        // If thumbnail fails, MUX is still processing
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <div className="absolute inset-0 bg-black/20 transition-opacity hover:opacity-0">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Play className="w-12 h-12 text-white opacity-80 drop-shadow-lg" />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">
                        Waiting for playback ID...
                      </p>
                    </div>
                  </div>
                )}
                {video.duration && (
                  <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDuration(video.duration)}
                  </div>
                )}
              </div>

              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg line-clamp-2">
                    {video.title || 'Untitled Video'}
                  </CardTitle>
                  <Badge className={getStatusColor(video.status)}>
                    {video.status}
                  </Badge>
                </div>
                {video.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                    {video.description}
                  </p>
                )}
              </CardHeader>

              <CardContent className="pt-0">
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>
                    {video.created_at
                      ? formatDate(video.created_at)
                      : 'Unknown date'}
                  </span>
                  {video.aspect_ratio && (
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {video.aspect_ratio}
                    </span>
                  )}
                </div>

                <div className="mt-4 flex gap-2">
                  {video.mux_playback_id ? (
                    <Button asChild size="sm" className="flex-1">
                      <Link href={`/videos/${video.id}`}>
                        <Play className="w-4 h-4 mr-2" />
                        Watch
                      </Link>
                    </Button>
                  ) : (
                    <Button size="sm" disabled className="flex-1">
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing
                    </Button>
                  )}
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/dashboard/video-management`}>Manage</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
