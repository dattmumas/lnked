'use client';

import React, { useState, useRef, useEffect } from 'react';
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
  Check,
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
  mp4_support?: string | null; // 'none' | 'capped-1080p' | 'audio-only'
}

interface VideoPlayerPageClientProps {
  video: VideoAsset;
}

export default function VideoPlayerPageClient({
  video,
}: VideoPlayerPageClientProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied' | 'error'>(
    'idle',
  );
  const [isDownloading, setIsDownloading] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);

  // Check if video is ready for playback
  const isVideoReady = video.status === 'ready' && video.mux_playback_id;

  // Debug video data
  useEffect(() => {
    console.info('Video data:', {
      id: video.id,
      status: video.status,
      mux_playback_id: video.mux_playback_id,
      mux_asset_id: video.mux_asset_id,
      title: video.title,
    });
  }, [video]);

  // Initialize HLS.js for cross-browser compatibility
  useEffect(() => {
    if (!isVideoReady || !video.mux_playback_id || !videoRef.current) {
      return;
    }

    const initializeVideo = async () => {
      const videoElement = videoRef.current!;
      const hlsUrl = `https://stream.mux.com/${video.mux_playback_id}.m3u8`;

      try {
        // Import HLS.js dynamically for better bundle splitting
        const Hls = (await import('hls.js')).default;

        // Check if HLS is supported
        if (Hls.isSupported()) {
          // Browser doesn't support HLS natively, use HLS.js
          console.info('Using HLS.js for video playback');

          // Clean up existing HLS instance
          if (hlsRef.current) {
            hlsRef.current.destroy();
          }

          // Create new HLS instance with proper configuration
          hlsRef.current = new Hls({
            debug: process.env.NODE_ENV === 'development',
            enableWorker: true,
            lowLatencyMode: false,
            // Mux-optimized settings
            maxLoadingDelay: 4,
            maxBufferLength: 30,
            maxBufferSize: 60 * 1000 * 1000, // 60MB
          });

          // Load the HLS stream
          hlsRef.current.loadSource(hlsUrl);
          hlsRef.current.attachMedia(videoElement);

          // Handle HLS events
          hlsRef.current.on(Hls.Events.MANIFEST_PARSED, () => {
            console.info('HLS manifest parsed successfully');
            setIsVideoLoaded(true);
            setVideoError(null);
          });

          hlsRef.current.on(Hls.Events.ERROR, (event: string, data: any) => {
            console.error('HLS error:', data);
            if (data.fatal) {
              switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  setVideoError(
                    'Network error loading video. Please check your connection.',
                  );
                  console.info('Attempting HLS recovery for network error');
                  hlsRef.current.startLoad();
                  break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                  setVideoError(
                    'Media error. The video format may not be supported.',
                  );
                  console.info('Attempting HLS recovery for media error');
                  hlsRef.current.recoverMediaError();
                  break;
                default:
                  setVideoError(
                    'Fatal error loading video. Please try refreshing the page.',
                  );
                  break;
              }
            }
          });
        } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
          // Safari supports HLS natively
          console.info('Using native HLS support (Safari)');
          videoElement.src = hlsUrl;
          setIsVideoLoaded(true);
          setVideoError(null);
        } else {
          // Browser doesn't support HLS at all
          console.error('HLS not supported in this browser');
          setVideoError(
            'Your browser does not support video playback. Please try using a modern browser like Chrome, Firefox, Safari, or Edge.',
          );
        }
      } catch (error) {
        console.error('Error initializing video player:', error);
        setVideoError(
          'Failed to initialize video player. Please try refreshing the page.',
        );
      }
    };

    initializeVideo();

    // Cleanup function
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [isVideoReady, video.mux_playback_id]);

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
        console.info('Video link copied to clipboard');
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
          console.info('Video link copied to clipboard');
        } else {
          throw new Error('Copy command was unsuccessful');
        }
      }

      // Reset status after 3 seconds
      setTimeout(() => setShareStatus('idle'), 3000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      setShareStatus('error');
      alert(
        'Unable to copy link. Please copy the URL manually from your browser.',
      );
      setTimeout(() => setShareStatus('idle'), 3000);
    }
  };

  const handleDownload = async () => {
    if (!video.mux_playback_id) {
      alert('Video is not ready for download.');
      return;
    }

    setIsDownloading(true);

    try {
      // Try the new static renditions format first
      const possibleMp4Urls = [
        `https://stream.mux.com/${video.mux_playback_id}/highest.mp4`,
        `https://stream.mux.com/${video.mux_playback_id}/capped-1080p.mp4`,
        `https://stream.mux.com/${video.mux_playback_id}/high.mp4`, // Legacy format
      ];

      let downloadUrl = null;

      // Check which MP4 format is available
      for (const url of possibleMp4Urls) {
        try {
          const response = await fetch(url, { method: 'HEAD' });
          if (response.ok) {
            downloadUrl = url;
            console.info('Found available MP4 at:', url);
            break;
          }
        } catch (error) {
          console.info('MP4 not available at:', url);
        }
      }

      if (downloadUrl) {
        // Create download link
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `${video.title || 'video'}.mp4`;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        console.info('Video download initiated from:', downloadUrl);
      } else {
        // No MP4 available - provide helpful information
        const helpMessage =
          `MP4 download is not available for this video.\n\n` +
          `This happens because:\n` +
          `• MP4 files must be enabled when uploading (static_renditions)\n` +
          `• MP4 processing takes longer than streaming setup\n` +
          `• The video may still be processing\n\n` +
          `You can:\n` +
          `1. Use the HLS stream URL for video downloaders\n` +
          `2. Wait for MP4 processing to complete\n` +
          `3. Contact support to enable MP4 downloads\n\n` +
          `Would you like to copy the HLS stream URL instead?`;

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
          `3. Wait and try again if the video is still processing\n\n` +
          `Note: MP4 downloads require static renditions to be enabled during upload.`,
      );
    } finally {
      setIsDownloading(false);
    }
  };

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
              <>
                {/* Debug info for development */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white text-xs p-2 rounded z-10">
                    <div>Playback ID: {video.mux_playback_id}</div>
                    <div>Status: {video.status}</div>
                  </div>
                )}

                <video
                  ref={videoRef}
                  controls
                  className="w-full h-full"
                  playsInline
                  poster={
                    video.mux_playback_id
                      ? `https://image.mux.com/${video.mux_playback_id}/thumbnail.png?width=1920&height=1080&fit_mode=smartcrop`
                      : undefined
                  }
                  preload="metadata"
                  onError={(e) => {
                    console.error('Video element error:', e);
                    if (!hlsRef.current) {
                      setVideoError(
                        'Video failed to load. The video may still be processing or there may be a playback issue.',
                      );
                    }
                  }}
                  onLoadStart={() => {
                    console.info('Video loading started');
                  }}
                  onCanPlay={() => {
                    console.info('Video can start playing');
                    setVideoError(null);
                  }}
                  onLoadedData={() => {
                    console.info('Video data loaded');
                    setIsVideoLoaded(true);
                  }}
                >
                  {/* HLS.js will handle the source loading programmatically */}
                  {/* Fallback message for very old browsers */}
                  Your browser does not support modern video playback. Please
                  update your browser or try a different one.
                </video>

                {/* Error overlay */}
                {videoError && (
                  <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center text-white p-4">
                    <div className="text-center">
                      <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-2" />
                      <p className="text-sm">{videoError}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => window.location.reload()}
                      >
                        Retry
                      </Button>
                    </div>
                  </div>
                )}
              </>
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
                      <span
                        className={`font-medium ${isVideoLoaded ? 'text-green-600' : 'text-yellow-600'}`}
                      >
                        {isVideoLoaded ? 'Loaded' : 'Loading...'}
                      </span>
                      {hlsRef.current && (
                        <span className="ml-2 text-blue-600">
                          (Using HLS.js)
                        </span>
                      )}
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
                      <strong>HLS.js Info:</strong> Using cross-browser HLS
                      support for maximum compatibility. Safari uses native HLS,
                      other browsers use HLS.js polyfill.
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
