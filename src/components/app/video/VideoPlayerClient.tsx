'use client';

import React, { useState, useEffect } from 'react';
import MuxVideoPlayer from '@/components/app/video/MuxVideoPlayerClient';
import type { User } from '@supabase/supabase-js';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

interface VideoAsset {
  id: string;
  title: string | null;
  mux_playback_id: string | null;
}

interface VideoPlayerClientProps {
  video: VideoAsset;
}

export default function VideoPlayerClient({ video }: VideoPlayerClientProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    const getCurrentUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    getCurrentUser();
  }, [supabase]);

  return (
    <div className="w-full max-w-6xl aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center">
      {video.mux_playback_id ? (
        <MuxVideoPlayer
          playbackId={video.mux_playback_id}
          title={video.title || 'Untitled Video'}
          viewerId={currentUser?.id}
          viewerEmail={currentUser?.email}
          className="w-full h-full rounded-lg"
        />
      ) : (
        <div className="flex items-center justify-center w-full h-full text-white min-h-[400px]">
          <span className="text-lg font-medium">Video not available</span>
        </div>
      )}
    </div>
  );
}
