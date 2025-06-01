'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ArrowLeft,
  Share,
  Download,
  AlertCircle,
  Loader2,
  Check,
} from 'lucide-react';
import {
  SECONDS_PER_MINUTE,
  SECONDS_PER_HOUR,
  PAD_LENGTH,
} from '@/lib/constants/video';
import MuxVideoPlayer from '@/components/app/video/MuxVideoPlayerClient';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import type { User } from '@supabase/supabase-js';

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

interface VideoPlayerPageClientProps {
  video: VideoAsset;
}

// Constants
const SHARE_STATUS_RESET_DELAY = 3000;

export default function VideoPlayerPageClient({
  video,
}: VideoPlayerPageClientProps) {
  const router = useRouter();
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied' | 'error'>(
    'idle',
  );
  const [isDownloading, setIsDownloading] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const supabase = createSupabaseBrowserClient();

  // Check if video is ready for playback
  const isVideoReady = video.status === 'ready' && video.mux_playback_id;

  // Get current user for analytics
  useEffect(() => {
    const getCurrentUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUser(user);
    };

    getCurrentUser();
  }, [supabase]);

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

  const handleBack = () => {
    // Check if there's a previous page in history
    if (window.history.length > 1) {
      router.back();
    } else {
      // Fallback to dashboard if no history
      router.push('/dashboard/video-management');
    }
  };

  const handleShare = async () => {
    try {
      const url = window.location.href;

      // Try modern clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
        setShareStatus('copied');
        console.warn('Video link copied to clipboard');
      } else {
        // Fallback for older browsers or non-secure contexts
        const textArea = document.createElement('textarea');
        textArea.value = url;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);

        if (successful) {
          setShareStatus('copied');
          console.warn('Video link copied to clipboard');
        } else {
          throw new Error('Copy command was unsuccessful');
        }
      }

      // Reset status after 3 seconds
      setTimeout(() => setShareStatus('idle'), SHARE_STATUS_RESET_DELAY);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      setShareStatus('error');
      alert(
        'Unable to copy link. Please copy the URL manually from your browser.',
      );
      setTimeout(() => setShareStatus('idle'), SHARE_STATUS_RESET_DELAY);
    }
  };

  const handleDownload = async () => {
    if (!video.mux_playback_id) {
      alert('Video is not ready for download.');
      return;
    }

    setIsDownloading(true);

    try {
      // Check if MP4 is enabled for this video
      if (video.mp4_support === 'capped-1080p') {
        // Use the known MP4 URL based on our upload settings
        const downloadUrl = `https://stream.mux.com/${video.mux_playback_id}/medium.mp4`;

        // Create download link
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `${video.title || 'video'}.mp4`;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        console.warn('Video download initiated from:', downloadUrl);
      } else {
        // No MP4 available - provide helpful information
        const helpMessage =
          `MP4 download is not available for this video.\n\n` +
          `This video was uploaded without MP4 support enabled.\n\n` +
          `Would you like to copy the HLS stream URL instead?\n` +
          `You can use it with video downloader tools like yt-dlp or ffmpeg.`;

        const shouldCopyHLS = confirm(helpMessage);

        if (shouldCopyHLS) {
          const hlsUrl = `https://stream.mux.com/${video.mux_playback_id}.m3u8`;
          try {
            await navigator.clipboard.writeText(hlsUrl);
            alert(
              `HLS stream URL copied to clipboard!\n\nYou can use this with video downloader tools like:\n• yt-dlp\n• ffmpeg\n• VLC Media Player`,
            );
          } catch (clipboardError) {
            console.error('Could not copy to clipboard:', clipboardError);
            alert(
              `Please copy this HLS URL manually:\n\n${hlsUrl}\n\nThis can be used with video downloader tools.`,
            );
          }
        }
      }
    } catch (error) {
      console.error('Download failed:', error);

      // Provide fallback options
      const hlsUrl = `https://stream.mux.com/${video.mux_playback_id}.m3u8`;
      alert(
        `Download failed. You can try:\n\n` +
          `1. Copy the HLS stream URL: ${hlsUrl}\n` +
          `2. Use video downloader tools (yt-dlp, ffmpeg, etc.)\n` +
          `3. Contact support if this issue persists\n\n` +
          `Note: MP4 downloads require static renditions to be enabled during upload.`,
      );
    } finally {
      setIsDownloading(false);
    }
  };

  // Add debugging to verify playback ID
  useEffect(() => {
    console.warn('Video data:', {
      id: video.id,
      status: video.status,
      mux_playback_id: video.mux_playback_id,
      mux_asset_id: video.mux_asset_id,
      isVideoReady,
    });
  }, [video, isVideoReady]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="ghost"
          onClick={handleBack}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleShare}>
            {shareStatus === 'copied' ? (
              <Check className="h-4 w-4 mr-2" />
            ) : (
              <Share className="h-4 w-4 mr-2" />
            )}
            {shareStatus === 'idle'
              ? 'Share'
              : shareStatus === 'copied'
                ? 'Copied!'
                : 'Error'}
          </Button>
          {isVideoReady && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              disabled={isDownloading}
            >
              {isDownloading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {isDownloading
                ? 'Downloading...'
                : !video.mp4_support || video.mp4_support === 'none'
                  ? 'Get Stream URL'
                  : 'Download'}
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
              <MuxVideoPlayer
                playbackId={video.mux_playback_id!}
                title={video.title || 'Untitled Video'}
                viewerId={currentUser?.id}
                viewerEmail={currentUser?.email}
                className="w-full h-full rounded-lg"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-white min-h-[400px]">
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
                    <div className="h-12 w-12 mx-auto mb-4 opacity-50 bg-gray-600 rounded flex items-center justify-center">
                      📹
                    </div>
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
            <CardContent className="space-y-4">
              {video.description && (
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Description
                  </label>
                  <p className="text-sm mt-1">{video.description}</p>
                </div>
              )}

              {/* User analytics info */}
              {currentUser && process.env.NODE_ENV === 'development' && (
                <div className="border-t pt-4">
                  <label className="text-sm font-medium text-gray-500">
                    Analytics Info
                  </label>
                  <div className="text-xs space-y-1 mt-1">
                    <div>
                      <span className="font-medium">Viewer ID:</span>{' '}
                      {currentUser.id}
                    </div>
                    <div>
                      <span className="font-medium">Email:</span>{' '}
                      {currentUser.email}
                    </div>
                    <div className="text-green-600 mt-2 p-2 bg-green-50 rounded text-xs">
                      <strong>✓ Mux Data:</strong> Analytics are being tracked
                      for this viewer
                    </div>
                  </div>
                </div>
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

              <div>
                <label className="text-sm font-medium text-gray-500">
                  MP4 Download Support
                </label>
                <p className="text-sm">
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      video.mp4_support === 'capped-1080p' ||
                      video.mp4_support === 'audio-only'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {video.mp4_support === 'capped-1080p'
                      ? 'Enabled (1080p)'
                      : video.mp4_support === 'audio-only'
                        ? 'Audio Only'
                        : video.mp4_support === 'none'
                          ? 'Disabled'
                          : 'Not Configured'}
                  </span>
                </p>
                {(!video.mp4_support || video.mp4_support === 'none') && (
                  <p className="text-xs text-gray-500 mt-1">
                    MP4 downloads are not available for this video. Only HLS
                    streaming is supported.
                  </p>
                )}
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

              {process.env.NODE_ENV === 'development' && (
                <div className="border-t pt-4">
                  <label className="text-sm font-medium text-gray-500">
                    Debug Info
                  </label>
                  <div className="text-xs space-y-1 mt-1">
                    <div>
                      <span className="font-medium">HLS URL (Primary):</span>{' '}
                      {video.mux_playback_id ? (
                        <a
                          href={`https://stream.mux.com/${video.mux_playback_id}.m3u8`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline break-all"
                        >
                          https://stream.mux.com/{video.mux_playback_id}.m3u8
                        </a>
                      ) : (
                        'N/A'
                      )}
                    </div>
                    <div>
                      <span className="font-medium">Player Status:</span>{' '}
                      <span className={`font-medium text-green-600`}>
                        Loaded
                      </span>
                      <span className="ml-2 text-blue-600">
                        (Using Mux Player)
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">
                        MP4 URLs (if enabled):
                      </span>{' '}
                      {video.mux_playback_id ? (
                        <div className="ml-2 space-y-1">
                          <div>
                            <span className="text-gray-600">Modern:</span>{' '}
                            <a
                              href={`https://stream.mux.com/${video.mux_playback_id}/highest.mp4`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline break-all"
                            >
                              https://stream.mux.com/{video.mux_playback_id}
                              /highest.mp4
                            </a>
                          </div>
                          <div>
                            <span className="text-gray-600">Legacy:</span>{' '}
                            <a
                              href={`https://stream.mux.com/${video.mux_playback_id}/high.mp4`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline break-all"
                            >
                              https://stream.mux.com/{video.mux_playback_id}
                              /high.mp4
                            </a>
                          </div>
                        </div>
                      ) : (
                        'N/A'
                      )}
                    </div>
                    <div>
                      <span className="font-medium">Thumbnail:</span>{' '}
                      {video.mux_playback_id ? (
                        <a
                          href={`https://image.mux.com/${video.mux_playback_id}/thumbnail.png`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline break-all"
                        >
                          https://image.mux.com/{video.mux_playback_id}
                          /thumbnail.png
                        </a>
                      ) : (
                        'N/A'
                      )}
                    </div>
                    <div className="text-blue-600 mt-2 p-2 bg-blue-50 rounded text-xs">
                      <strong>Mux Player Info:</strong> Using the official Mux
                      Player web component for video playback.
                    </div>
                    <div className="text-yellow-600 mt-2 p-2 bg-yellow-50 rounded text-xs">
                      <strong>Note:</strong> MP4 files require static_renditions
                      to be enabled during asset creation. If 404 errors occur,
                      the video may need MP4 support enabled or may still be
                      processing.
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
