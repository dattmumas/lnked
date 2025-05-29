'use client';

import MuxPlayer from '@mux/mux-player-react';

export interface MuxVideoPlayerSimpleProps {
  playbackId: string;
  title?: string;
  className?: string;
}

export default function MuxVideoPlayerSimple({
  playbackId,
  title,
  className = '',
}: MuxVideoPlayerSimpleProps) {
  return (
    <MuxPlayer
      playbackId={playbackId}
      metadata={{
        video_title: title,
      }}
      className={className}
    />
  );
}
