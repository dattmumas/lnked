'use client';

import MuxPlayer from '@mux/mux-player-react';

export interface MuxVideoPlayerSimpleProps {
  playbackId: string;
  title?: string;
  className?: string;
  viewerId?: string;
  viewerEmail?: string;
}

export default function MuxVideoPlayerSimple({
  playbackId,
  title,
  className = '',
  viewerId,
  viewerEmail,
}: MuxVideoPlayerSimpleProps) {
  // Get Mux Data environment key from environment variable
  const muxDataEnvKey = process.env.NEXT_PUBLIC_MUX_DATA_ENV_KEY;

  return (
    <MuxPlayer
      playbackId={playbackId}
      metadata={{
        video_title: title,
        // Add viewer metadata if provided
        ...(viewerId && { viewer_user_id: viewerId }),
        ...(viewerEmail && { viewer_user_email: viewerEmail }),
      }}
      // Enable Mux Data analytics if environment key is configured
      envKey={muxDataEnvKey}
      className={className}
    />
  );
}
