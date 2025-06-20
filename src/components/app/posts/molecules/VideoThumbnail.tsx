'use client';

import { Play, Loader2 } from 'lucide-react';
import Image from 'next/image';
import React, { useState, useCallback } from 'react';

import { cn } from '@/lib/utils';

// Constants for magic numbers
const SECONDS_PER_MINUTE = 60;
const PADDING_START = 2;

interface VideoThumbnailProps {
  thumbnailUrl?: string | null;
  duration?: number; // Duration in seconds
  playbackId?: string;
  isProcessing?: boolean;
  className?: string;
  onClick?: () => void;
  aspectRatio?: 'video' | 'square' | 'wide';
}

export default function VideoThumbnail({
  thumbnailUrl,
  duration,
  playbackId,
  isProcessing = false,
  className,
  onClick,
  aspectRatio = 'video',
}: VideoThumbnailProps): React.ReactElement {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  // Format duration from seconds to MM:SS
  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / SECONDS_PER_MINUTE);
    const remainingSeconds = seconds % SECONDS_PER_MINUTE;
    return `${minutes}:${remainingSeconds.toString().padStart(PADDING_START, '0')}`;
  };

  const handleImageLoad = useCallback((): void => {
    setImageLoading(false);
  }, []);

  const handleImageError = useCallback((): void => {
    setImageError(true);
    setImageLoading(false);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent): void => {
      if ((e.key === 'Enter' || e.key === ' ') && onClick) {
        e.preventDefault();
        onClick();
      }
    },
    [onClick],
  );

  // Generate Mux thumbnail URL if no thumbnail provided but playbackId exists
  const getThumbnailUrl = (): string => {
    if (
      thumbnailUrl !== undefined &&
      thumbnailUrl !== null &&
      thumbnailUrl.length > 0 &&
      !imageError
    ) {
      return thumbnailUrl;
    }

    if (
      playbackId !== undefined &&
      playbackId !== null &&
      playbackId.length > 0
    ) {
      // Use Mux thumbnail service
      return `https://image.mux.com/${playbackId}/thumbnail.jpg?width=640&height=360&fit_mode=smartcrop`;
    }

    // Fallback placeholder
    return '';
  };

  const aspectRatioClasses = {
    video: 'aspect-video', // 16:9
    square: 'aspect-square', // 1:1
    wide: 'aspect-[21/9]', // Ultra-wide
  };

  const thumbnailSrc = getThumbnailUrl();

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg bg-muted group cursor-pointer',
        aspectRatioClasses[aspectRatio],
        className,
      )}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label="Play video"
    >
      {/* Thumbnail Image */}
      {thumbnailSrc !== undefined &&
      thumbnailSrc !== null &&
      thumbnailSrc.length > 0 ? (
        <Image
          src={thumbnailSrc}
          alt="Video thumbnail"
          width={640}
          height={360}
          className={cn(
            'w-full h-full object-cover transition-transform duration-200 group-hover:scale-105',
            imageLoading && 'opacity-0',
          )}
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-muted to-muted/60 flex items-center justify-center">
          <Play className="h-12 w-12 text-muted-foreground/40" />
        </div>
      )}

      {/* Loading State */}
      {(imageLoading || isProcessing) && (
        <div className="absolute inset-0 bg-muted/80 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {isProcessing ? 'Processing...' : 'Loading...'}
            </span>
          </div>
        </div>
      )}

      {/* Play Button Overlay */}
      {!isProcessing && !imageLoading && (
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
          <div className="bg-white/90 backdrop-blur-sm rounded-full p-3 transform scale-90 group-hover:scale-100 transition-transform duration-200">
            <Play className="h-6 w-6 text-black fill-black ml-0.5" />
          </div>
        </div>
      )}

      {/* Duration Badge */}
      {duration !== undefined &&
        duration !== null &&
        duration > 0 &&
        !isProcessing && (
          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
            {formatDuration(duration)}
          </div>
        )}

      {/* Processing Badge */}
      {isProcessing && (
        <div className="absolute top-2 left-2 bg-yellow-500/90 text-yellow-900 text-xs px-2 py-1 rounded backdrop-blur-sm font-medium">
          Processing
        </div>
      )}
    </div>
  );
}
