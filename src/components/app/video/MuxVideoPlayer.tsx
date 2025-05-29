'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  Captions,
  Download,
  Share,
  AlertCircle,
} from 'lucide-react';
import {
  PLAYBACK_RATES,
  SECONDS_PER_MINUTE,
  PAD_LENGTH,
} from '@/lib/constants/video';

// Analytics event types
export interface VideoAnalyticsEvent {
  type:
    | 'play'
    | 'pause'
    | 'seek'
    | 'buffer'
    | 'error'
    | 'complete'
    | 'quality_change'
    | 'fullscreen'
    | 'mute'
    | 'unmute';
  timestamp: number;
  currentTime: number;
  duration: number;
  playbackRate: number;
  volume: number;
  quality?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface MuxVideoPlayerProps {
  playbackId: string;
  streamType?: 'on-demand' | 'live';
  title?: string;
  poster?: string;
  viewerUserId?: string;
  videoId?: string;
  startTime?: number;
  autoplay?: boolean | 'muted';
  muted?: boolean;
  loop?: boolean;
  controls?: boolean;
  responsive?: boolean;
  aspectRatio?: string;
  width?: number | string;
  height?: number | string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  enableAnalytics?: boolean;
  enableDownload?: boolean;
  enableShare?: boolean;
  enableCaptions?: boolean;
  enableQualitySelection?: boolean;
  playbackRates?: readonly number[];
  thumbnailTime?: number;
  customDomain?: string;
  envKey?: string;
  debug?: boolean;
  className?: string;
  onAnalyticsEvent?: (_event: VideoAnalyticsEvent) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onError?: (_error: string) => void;
  onTimeUpdate?: (_currentTime: number, _duration: number) => void;
  onVolumeChange?: (_volume: number, _muted: boolean) => void;
  onFullscreenChange?: (_isFullscreen: boolean) => void;
}

export default function MuxVideoPlayer({
  playbackId,
  streamType = 'on-demand',
  title,
  poster,
  viewerUserId,
  videoId,
  startTime = 0,
  autoplay = false,
  muted = false,
  loop = false,
  controls = true,
  responsive = true,
  aspectRatio = '16:9',
  width,
  height,
  primaryColor = '#000000',
  secondaryColor = '#ffffff',
  accentColor = '#007bff',
  enableAnalytics = true,
  enableDownload = false,
  enableShare = false,
  enableCaptions = true,
  enableQualitySelection = true,
  playbackRates = PLAYBACK_RATES,
  thumbnailTime,
  customDomain,
  envKey,
  debug = false,
  className = '',
  onAnalyticsEvent,
  onPlay,
  onPause,
  onEnded,
  onError,
  onTimeUpdate,
  onVolumeChange,
  onFullscreenChange,
}: MuxVideoPlayerProps) {
  const playerRef = useRef<HTMLElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(muted);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [quality] = useState<string>('auto');
  const [playbackRate] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [captionsEnabled, setCaptionsEnabled] = useState(false);

  // Analytics tracking
  const trackEvent = useCallback(
    (
      type: VideoAnalyticsEvent['type'],
      additionalData?: Partial<VideoAnalyticsEvent>,
    ) => {
      if (!enableAnalytics) return;

      const event: VideoAnalyticsEvent = {
        type,
        timestamp: Date.now(),
        currentTime,
        duration,
        playbackRate,
        volume: isMuted ? 0 : volume,
        quality,
        ...additionalData,
      };

      onAnalyticsEvent?.(event);

      // Send to analytics API
      if (viewerUserId && videoId) {
        fetch('/api/videos/analytics', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            video_asset_id: videoId,
            metric_type: type,
            viewer_id: viewerUserId,
            playback_position: currentTime,
            playback_duration: duration,
            quality,
            metadata: {
              playback_rate: playbackRate,
              volume: isMuted ? 0 : volume,
              ...additionalData?.metadata,
            },
          }),
        }).catch(console.error);
      }
    },
    [
      enableAnalytics,
      currentTime,
      duration,
      playbackRate,
      volume,
      isMuted,
      quality,
      onAnalyticsEvent,
      viewerUserId,
      videoId,
    ],
  );

  // Load MUX Player script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@mux/mux-player@latest';
    script.type = 'module';
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  // Event handlers
  const handlePlay = useCallback(() => {
    setIsPlaying(true);
    trackEvent('play');
    onPlay?.();
  }, [trackEvent, onPlay]);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
    trackEvent('pause');
    onPause?.();
  }, [trackEvent, onPause]);

  const handleTimeUpdate = useCallback(
    (event: Event) => {
      const target = event.target as HTMLVideoElement;
      const newCurrentTime = target.currentTime;
      const newDuration = target.duration;

      setCurrentTime(newCurrentTime);
      setDuration(newDuration);
      onTimeUpdate?.(newCurrentTime, newDuration);
    },
    [onTimeUpdate],
  );

  const handleVolumeChange = useCallback(
    (event: Event) => {
      const target = event.target as HTMLVideoElement;
      const newVolume = target.volume;
      const newMuted = target.muted;

      setVolume(newVolume);
      setIsMuted(newMuted);

      trackEvent(newMuted ? 'mute' : 'unmute', { volume: newVolume });
      onVolumeChange?.(newVolume, newMuted);
    },
    [trackEvent, onVolumeChange],
  );

  const handleSeeking = useCallback(() => {
    trackEvent('seek', { metadata: { seekTo: currentTime } });
  }, [trackEvent, currentTime]);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    trackEvent('complete');
    onEnded?.();
  }, [trackEvent, onEnded]);

  const handleError = useCallback(
    (event: Event) => {
      const target = event.target as HTMLVideoElement;
      const errorMessage = target.error?.message || 'Video playback error';

      setError(errorMessage);
      trackEvent('error', { error: errorMessage });
      onError?.(errorMessage);
    },
    [trackEvent, onError],
  );

  const handleLoadedMetadata = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleFullscreenChange = useCallback(() => {
    const isNowFullscreen = Boolean(document.fullscreenElement);
    setIsFullscreen(isNowFullscreen);
    trackEvent('fullscreen', { metadata: { fullscreen: isNowFullscreen } });
    onFullscreenChange?.(isNowFullscreen);
  }, [trackEvent, onFullscreenChange]);

  // Control functions
  const togglePlay = useCallback(() => {
    if (playerRef.current) {
      const video = playerRef.current as HTMLVideoElement;
      if (isPlaying) {
        video.pause();
      } else {
        video.play();
      }
    }
  }, [isPlaying]);

  const toggleMute = useCallback(() => {
    if (playerRef.current) {
      const video = playerRef.current as HTMLVideoElement;
      video.muted = !isMuted;
    }
  }, [isMuted]);

  const toggleFullscreen = useCallback(() => {
    if (playerRef.current) {
      if (isFullscreen) {
        document.exitFullscreen();
      } else {
        playerRef.current.requestFullscreen();
      }
    }
  }, [isFullscreen]);

  const toggleCaptions = useCallback(() => {
    setCaptionsEnabled(!captionsEnabled);
    // MUX Player will handle caption toggling
  }, [captionsEnabled]);

  const handleShare = useCallback(() => {
    if (navigator.share) {
      navigator.share({
        title: title || 'Video',
        url: window.location.href,
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
    }
  }, [title]);

  const handleDownload = useCallback(() => {
    // This would typically require a signed download URL from your API
    console.error('Download requested for video:', playbackId);
  }, [playbackId]);

  // Format time for display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / SECONDS_PER_MINUTE);
    const secs = Math.floor(seconds % SECONDS_PER_MINUTE);
    return `${mins}:${secs.toString().padStart(PAD_LENGTH, '0')}`;
  };

  if (error) {
    return (
      <Card className={`w-full ${className}`}>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Failed to load video: {error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`relative w-full ${className}`}>
      <div
        className="relative group"
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
      >
        {React.createElement('mux-player', {
          ref: playerRef,
          'playback-id': playbackId,
          'stream-type': streamType,
          'metadata-video-title': title,
          'metadata-viewer-user-id': viewerUserId,
          'metadata-video-id': videoId,
          'start-time': startTime,
          autoplay,
          muted,
          loop,
          controls,
          responsive,
          'aspect-ratio': aspectRatio,
          width,
          height,
          'primary-color': primaryColor,
          'secondary-color': secondaryColor,
          'accent-color': accentColor,
          'playback-rates': playbackRates.join(','),
          'thumbnail-time': thumbnailTime,
          'custom-domain': customDomain,
          'env-key': envKey,
          debug,
          poster,
          title,
          'prefer-mse': true,
          'prefer-cmcd': 'query',
          'default-show-remaining-time': true,
          'default-hidden-captions': !enableCaptions,
          'forward-seek-offset': 10,
          'backward-seek-offset': 10,
          onPlay: handlePlay,
          onPause: handlePause,
          onTimeUpdate: handleTimeUpdate,
          onVolumeChange: handleVolumeChange,
          onSeeking: handleSeeking,
          onEnded: handleEnded,
          onError: handleError,
          onLoadedMetadata: handleLoadedMetadata,
          onFullscreenChange: handleFullscreenChange,
          className: 'w-full h-full',
        })}

        {/* Custom Controls Overlay */}
        {showControls && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
            <div className="flex items-center justify-between text-white">
              {/* Left Controls */}
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={togglePlay}
                  className="text-white hover:bg-white/20"
                >
                  {isPlaying ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={toggleMute}
                  className="text-white hover:bg-white/20"
                >
                  {isMuted ? (
                    <VolumeX className="h-4 w-4" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </Button>

                <div className="text-sm">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </div>
              </div>

              {/* Center - Title */}
              {title && (
                <div className="flex-1 text-center">
                  <div className="text-sm font-medium truncate">{title}</div>
                </div>
              )}

              {/* Right Controls */}
              <div className="flex items-center space-x-2">
                {enableCaptions && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={toggleCaptions}
                    className={`text-white hover:bg-white/20 ${
                      captionsEnabled ? 'bg-white/20' : ''
                    }`}
                  >
                    <Captions className="h-4 w-4" />
                  </Button>
                )}

                {enableQualitySelection && (
                  <div className="relative">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-white hover:bg-white/20"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {enableShare && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleShare}
                    className="text-white hover:bg-white/20"
                  >
                    <Share className="h-4 w-4" />
                  </Button>
                )}

                {enableDownload && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleDownload}
                    className="text-white hover:bg-white/20"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={toggleFullscreen}
                  className="text-white hover:bg-white/20"
                >
                  {isFullscreen ? (
                    <Minimize className="h-4 w-4" />
                  ) : (
                    <Maximize className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        )}

        {/* Stream Type Badge */}
        {streamType === 'live' && (
          <div className="absolute top-4 left-4">
            <Badge variant="destructive" className="bg-red-600">
              LIVE
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
}
