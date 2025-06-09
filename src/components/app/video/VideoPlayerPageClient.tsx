'use client';

import React, { useState, useEffect } from 'react';
import MuxVideoPlayer from '@/components/app/video/MuxVideoPlayerClient';
import CommentsSection from '@/components/app/posts/organisms/CommentsSection';
import type { User } from '@supabase/supabase-js';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

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
    <div className="min-h-screen bg-background flex flex-col items-center py-8">
      {/* Centered, YouTube-style player */}
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
      {/* Comments Section below the player */}
      <div className="w-full max-w-4xl mt-8">
        <CommentsSection
          postId={`video-${video.id}`}
          currentUserId={currentUser?.id || null}
        />
      </div>
    </div>
  );
}
