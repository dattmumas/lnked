'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ArrowLeft,
  Share,
  Download,
  Play,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import {
  SECONDS_PER_MINUTE,
  SECONDS_PER_HOUR,
  STATUS_CHECK_INTERVAL,
  PAD_LENGTH,
} from '@/lib/constants/video';

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
}

interface VideoPlayerPageClientProps {
  video: VideoAsset;
}

export default function VideoPlayerPageClient({
  video,
}: VideoPlayerPageClientProps) {
  const router = useRouter();
  const [shareUrl, setShareUrl] = useState('');

  // Check if video is ready for playback
  const isVideoReady = video.status === 'ready' && video.mux_playback_id;

  // Helper functions
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / SECONDS_PER_HOUR);
    const minutes = Math.floor(
      (seconds % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE,
    );
    const remainingSeconds = Math.floor(seconds % SECONDS_PER_MINUTE);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(PAD_LENGTH, '0')}:${remainingSeconds.toString().padStart(PAD_LENGTH, '0')}`;
    }
    return `${minutes}:${remainingSeconds.toString().padStart(PAD_LENGTH, '0')}`;
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setShareUrl(url);
    setTimeout(() => setShareUrl(''), STATUS_CHECK_INTERVAL);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share className="h-4 w-4 mr-2" />
            {shareUrl ? 'Copied!' : 'Share'}
          </Button>
          {isVideoReady && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Download high quality MP4 rendition
                window.open(
                  `https://stream.mux.com/${video.mux_playback_id}/high.mp4`,
                  '_blank',
                );
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          )}
        </div>
      </div>

      {/* Video Player */}
      <Card className="mb-6">
        <CardContent className="p-0">
          <div
            className="relative bg-black rounded-lg overflow-hidden"
            style={{ aspectRatio: video.aspect_ratio || '16/9' }}
          >
            {isVideoReady ? (
              // Following MUX's documented playback patterns
              <video
                controls
                className="w-full h-full"
                playsInline
                poster={
                  video.mux_playback_id
                    ? `https://image.mux.com/${video.mux_playback_id}/thumbnail.png?width=1920&height=1080&fit_mode=smartcrop`
                    : undefined
                }
                preload="metadata"
              >
                {/* Primary HLS source with redundant streams for reliability */}
                <source
                  src={`https://stream.mux.com/${video.mux_playback_id}.m3u8?redundant_streams=true`}
                  type="application/x-mpegURL"
                />
                {/* MP4 fallback for browsers that don't support HLS */}
                <source
                  src={`https://stream.mux.com/${video.mux_playback_id}/high.mp4`}
                  type="video/mp4"
                />
                {/* Accessibility: Add caption track if available */}
                <track
                  kind="captions"
                  src=""
                  srcLang="en"
                  label="English"
                  default
                />
                Your browser does not support the video tag.
              </video>
            ) : (
              <div className="flex items-center justify-center h-full text-white">
                {video.status === 'preparing' ||
                video.status === 'processing' ? (
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                    <p className="text-lg font-medium">
                      Video is being processed...
                    </p>
                    <p className="text-sm text-gray-300 mt-2">
                      This usually takes a few minutes
                    </p>
                    <p className="text-xs text-gray-400 mt-4">
                      Status: {video.status}
                    </p>
                  </div>
                ) : video.status === 'errored' ? (
                  <div className="text-center">
                    <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                    <p className="text-lg font-medium text-red-400">
                      Video processing failed
                    </p>
                    <p className="text-sm text-gray-300 mt-2">
                      Please try uploading again
                    </p>
                  </div>
                ) : (
                  <div className="text-center">
                    <Play className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Video not ready for playback</p>
                    <p className="text-sm text-gray-400 mt-2">
                      Status: {video.status || 'Unknown'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Video Information */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{video.title || 'Untitled Video'}</CardTitle>
            </CardHeader>
            <CardContent>
              {video.description ? (
                <p className="text-gray-600 whitespace-pre-wrap">
                  {video.description}
                </p>
              ) : (
                <p className="text-gray-400 italic">No description provided</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Video Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Status
                </label>
                <p className="text-sm">
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      video.status === 'ready'
                        ? 'bg-green-100 text-green-800'
                        : video.status === 'preparing' ||
                            video.status === 'processing'
                          ? 'bg-yellow-100 text-yellow-800'
                          : video.status === 'errored'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {video.status === 'ready'
                      ? 'Ready'
                      : video.status === 'preparing'
                        ? 'Preparing'
                        : video.status === 'processing'
                          ? 'Processing'
                          : video.status === 'errored'
                            ? 'Error'
                            : video.status || 'Unknown'}
                  </span>
                </p>
              </div>

              {video.duration && (
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Duration
                  </label>
                  <p className="text-sm">{formatDuration(video.duration)}</p>
                </div>
              )}

              {video.aspect_ratio && (
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Aspect Ratio
                  </label>
                  <p className="text-sm">{video.aspect_ratio}</p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-500">
                  Created
                </label>
                <p className="text-sm">
                  {video.created_at
                    ? new Date(video.created_at).toLocaleDateString()
                    : 'Unknown'}
                </p>
              </div>

              {isVideoReady && video.mux_playback_id && (
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Playback ID
                  </label>
                  <p className="text-xs font-mono bg-gray-100 p-2 rounded break-all">
                    {video.mux_playback_id}
                  </p>
                </div>
              )}

              {video.mux_asset_id && (
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Asset ID
                  </label>
                  <p className="text-xs font-mono bg-gray-100 p-2 rounded break-all">
                    {video.mux_asset_id}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
