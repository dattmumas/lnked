'use client';

import React, { useState, useEffect } from 'react';

import MuxVideoPlayer from '@/components/app/video/MuxVideoPlayerClient';
import supabase from '@/lib/supabase/browser';

import type { User } from '@supabase/supabase-js';

interface VideoAsset {
  id: string;
  title: string | undefined;
  mux_playback_id: string | undefined;
  is_public?: boolean;
  playback_policy?: string;
}

interface VideoPlayerClientProps {
  video: VideoAsset;
}

export default function VideoPlayerClient({
  video,
}: VideoPlayerClientProps): React.ReactElement {
  const [currentUser, setCurrentUser] = useState<User | undefined>(undefined);

  useEffect(() => {
    const getCurrentUser = async (): Promise<void> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUser(user ?? undefined);
    };
    void getCurrentUser();
  }, []);

  return (
    <div className="w-full max-w-6xl aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center">
      {video.mux_playback_id !== undefined &&
      video.mux_playback_id.length > 0 ? (
        <MuxVideoPlayer
          playbackId={video.mux_playback_id}
          title={
            video.title !== undefined && video.title.length > 0
              ? video.title
              : 'Untitled Video'
          }
          viewerId={currentUser?.id}
          viewerEmail={currentUser?.email}
          className="w-full h-full rounded-lg"
          isPrivate={
            video.is_public === false || video.playback_policy === 'signed'
          }
          videoId={video.id}
        />
      ) : (
        <div className="flex items-center justify-center w-full h-full text-white min-h-[400px]">
          <span className="text-lg font-medium">Video not available</span>
        </div>
      )}
    </div>
  );
}
