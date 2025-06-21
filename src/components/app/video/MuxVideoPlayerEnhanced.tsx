'use client';

import MuxPlayer from '@mux/mux-player-react';
import { AlertCircle } from 'lucide-react';
import React, { useState, useEffect } from 'react';

export interface MuxVideoPlayerEnhancedProps {
  playbackId: string;
  title?: string;
  className?: string;
  viewerId?: string;
  viewerEmail?: string;
  isPrivate?: boolean;
  videoId?: string; // Used to fetch signed URL for private videos
}

interface SignedUrlResponse {
  signedUrl: string;
  error?: string;
}

export default function MuxVideoPlayerEnhanced({
  playbackId,
  title,
  className = '',
  viewerId,
  viewerEmail,
  isPrivate = false,
  videoId,
}: MuxVideoPlayerEnhancedProps): React.ReactElement {
  const [signedUrl, setSignedUrl] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(isPrivate);

  // Get Mux Data environment key from environment variable
  const muxDataEnvKey = process.env.NEXT_PUBLIC_MUX_DATA_ENV_KEY;

  // Fetch signed URL for private videos
  useEffect(() => {
    if (!isPrivate) {
      setIsLoading(false);
      return;
    }

    if (!videoId) {
      setError('Video ID is required for private videos');
      setIsLoading(false);
      return;
    }

    const fetchSignedUrl = async (): Promise<void> => {
      try {
        const response = await fetch(`/api/videos/${videoId}/signed-url`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to get signed URL: ${response.status}`);
        }

        const data = (await response.json()) as SignedUrlResponse;

        if (data.error !== undefined && data.error !== '') {
          throw new Error(data.error);
        }

        setSignedUrl(data.signedUrl);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load private video',
        );
      } finally {
        setIsLoading(false);
      }
    };

    void fetchSignedUrl();
  }, [isPrivate, videoId]);

  // Show loading state for private videos
  if (isLoading) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`}
      >
        <div className="text-center p-8">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Loading video...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error !== undefined && error !== '') {
    return (
      <div
        className={`flex items-center justify-center bg-red-50 border border-red-200 rounded-lg ${className}`}
      >
        <div className="text-center p-8">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-4" />
          <p className="text-red-700 font-medium mb-2">Unable to load video</p>
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <MuxPlayer
      playbackId={isPrivate ? undefined : playbackId}
      src={
        isPrivate && signedUrl !== undefined && signedUrl !== ''
          ? signedUrl
          : undefined
      }
      metadata={{
        video_title: title,
        // Add viewer metadata if provided
        ...(viewerId !== undefined &&
          viewerId !== null &&
          viewerId.length > 0 && { viewer_user_id: viewerId }),
        ...(viewerEmail !== undefined &&
          viewerEmail !== null &&
          viewerEmail.length > 0 && { viewer_user_email: viewerEmail }),
      }}
      // Enable Mux Data analytics if environment key is configured
      envKey={muxDataEnvKey}
      className={className}
      // Additional props for better UX
      streamType="on-demand"
      preload="metadata"
    />
  );
}
