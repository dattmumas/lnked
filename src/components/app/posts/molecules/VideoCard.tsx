'use client';

import MuxPlayer from '@mux/mux-player-react';
import { useRouter } from 'next/navigation';
import React, { useCallback, useState, useRef } from 'react';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

import PostCardFooter from './PostCardFooter';
import PostCardHeader from './PostCardHeader';
import VideoThumbnail from './VideoThumbnail';

// Constants
const MAX_DESCRIPTION_LENGTH = 150;

interface Author {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

interface Collective {
  id: string;
  name: string;
  slug: string;
}

interface PostInteractions {
  isLiked: boolean;
  isDisliked: boolean;
  isBookmarked: boolean;
  likeCount: number;
  dislikeCount: number;
  commentCount: number;
  viewCount?: number;
}

type VideoMetadata = {
  videoAssetId?: string;
  duration?: number;
  playbackId?: string;
  status?: 'preparing' | 'ready' | 'errored';
  aspectRatio?: string;
  [key: string]: unknown;
};

interface VideoPost {
  id: string;
  title: string;
  content?: string | null; // Description for video posts
  thumbnail_url?: string | null;
  slug?: string | null;
  created_at: string;
  metadata?: VideoMetadata | null;
  author: Author;
  collective?: Collective | null;
}

interface VideoCardProps {
  post: VideoPost;
  interactions: PostInteractions;
  onToggleLike?: () => void;
  onToggleDislike?: () => void;
  onToggleBookmark?: () => void;
  onFollow?: () => void;
  isFollowing?: boolean;
  currentUserId?: string;
  showFollowButton?: boolean;
  className?: string;
  index?: number;
}

export default function VideoCard({
  post,
  interactions,
  onToggleLike,
  onToggleDislike,
  onToggleBookmark,
  onFollow,
  isFollowing = false,
  currentUserId,
  showFollowButton = false,
  className,
  index,
}: VideoCardProps): React.ReactElement {
  const router = useRouter();

  // Redirect to /videos/[id] using the video asset ID from metadata
  const videoAssetId = post.metadata?.videoAssetId;
  const postUrl = videoAssetId
    ? `/videos/${videoAssetId}`
    : `/posts/${post.id}`;

  const isProcessing = post.metadata?.status === 'preparing';
  const hasError = post.metadata?.status === 'errored';
  const isReady = post.metadata?.status === 'ready';

  // Extract description from content (for video posts, content is usually the description)
  const description =
    post.content !== undefined &&
    post.content !== null &&
    post.content.length > 0
      ? post.content.length > MAX_DESCRIPTION_LENGTH
        ? `${post.content.substring(0, MAX_DESCRIPTION_LENGTH)}...`
        : post.content
      : undefined;

  // If no playbackId, fallback to detail page navigation
  // For now, allow playing if we have a playbackId and it's not errored
  const canPlayInline =
    post.metadata?.playbackId !== undefined &&
    post.metadata?.playbackId !== null &&
    post.metadata.playbackId.length > 0 &&
    !hasError;

  // --- In-feed video playback state ---
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const handlePlayClick = useCallback(
    (e: React.MouseEvent): void => {
      e.stopPropagation();
      setIsPlaying(true);
      setVideoError(null);
    },
    [canPlayInline, post.metadata?.playbackId],
  );

  const handleVideoEnded = useCallback((): void => {
    setIsPlaying(false);
  }, []);

  const handleVideoPause = useCallback((): void => {
    // Only restore thumbnail if paused by user (not by switching tabs, etc.)
    setIsPlaying(false);
  }, []);

  const handleVideoError = useCallback(
    (e: React.SyntheticEvent<HTMLVideoElement>): void => {
      const { currentTarget } = e;
      const { error } = currentTarget;

      let errorMessage = 'Video playback failed';
      if (error) {
        switch (error.code) {
          case 1:
            errorMessage = 'Video loading aborted';
            break;
          case 2:
            errorMessage = 'Network error while loading video';
            break;
          case 3:
            errorMessage = 'Video format not supported';
            break;
          case 4:
            errorMessage = 'Video source not supported';
            break;
        }
      }
      setVideoError(errorMessage);
      setIsPlaying(false);
    },
    [post.id, post.metadata?.playbackId],
  );

  const handleVideoLoadStart = useCallback((): void => {
    // Video loading started
  }, [post.id, post.metadata?.playbackId]);

  const handleCanPlay = useCallback((): void => {
    // Video can play
  }, [post.id, post.metadata?.playbackId]);

  const handleNavigateToPost = useCallback((): void => {
    void router.push(postUrl);
  }, [router, postUrl]);

  return (
    <Card
      className={cn(
        'overflow-hidden rounded-xl border bg-card shadow-sm transition-all duration-300 ease-in-out hover:shadow-md',
        className,
      )}
    >
      <div className="p-6">
        <PostCardHeader
          author={post.author}
          timestamp={post.created_at}
          {...(post.collective ? { collective: post.collective } : {})}
          showFollowButton={showFollowButton}
          {...(currentUserId ? { currentUserId } : {})}
          {...(onFollow ? { onFollow } : {})}
          isFollowing={isFollowing}
        />

        {/* Video Player or Thumbnail */}
        {isPlaying && canPlayInline === true ? (
          <div className="mt-4 relative">
            <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
              <MuxPlayer
                playbackId={post.metadata?.playbackId || ''}
                {...(post.thumbnail_url !== undefined &&
                post.thumbnail_url !== null &&
                post.thumbnail_url.length > 0
                  ? { poster: post.thumbnail_url }
                  : {})}
                autoPlay
                muted
                className="w-full h-full object-cover"
                onEnded={handleVideoEnded}
                onPause={handleVideoPause}
                onError={() => {
                  setVideoError('Video playback failed');
                  setIsPlaying(false);
                }}
                onLoadStart={handleVideoLoadStart}
                onCanPlay={handleCanPlay}
                streamType="on-demand"
                preload="metadata"
              />
              {videoError && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-lg">
                  <div className="text-white text-center p-4">
                    <p className="text-red-400 mb-2">{videoError}</p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsPlaying(false);
                        setVideoError(null);
                      }}
                      className="text-sm underline hover:no-underline"
                    >
                      Back to thumbnail
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="mt-4 block w-full"
            onClick={
              canPlayInline === true ? handlePlayClick : handleNavigateToPost
            }
            aria-label="Play video"
          >
            <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted group">
              <VideoThumbnail
                {...(post.thumbnail_url
                  ? { thumbnailUrl: post.thumbnail_url }
                  : {})}
                {...(post.metadata?.duration !== undefined &&
                post.metadata?.duration !== null
                  ? { duration: post.metadata.duration }
                  : {})}
                {...(post.metadata?.playbackId
                  ? { playbackId: post.metadata.playbackId }
                  : {})}
                isProcessing={isProcessing}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                priority={index === 0}
              />
            </div>
          </button>
        )}

        <div className="mt-4">
          <a href={postUrl} className="group block">
            <h2 className="text-xl font-bold leading-snug tracking-tight group-hover:text-primary transition-colors">
              {post.title}
            </h2>

            {description && (
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground line-clamp-3">
                {description}
              </p>
            )}

            {/* Video Status Indicators */}
            {isProcessing && (
              <p className="mt-2 text-sm text-yellow-600 font-medium">
                Video is processing...
              </p>
            )}

            {hasError && (
              <p className="mt-2 text-sm text-destructive font-medium">
                Video processing failed
              </p>
            )}
          </a>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <a
            href={postUrl}
            className="text-sm font-semibold text-primary hover:underline"
          >
            Watch video →
          </a>
        </div>
      </div>

      <PostCardFooter
        postId={post.id}
        postSlug={post.slug ?? null}
        postTitle={post.title}
        interactions={interactions}
        {...(onToggleLike ? { onToggleLike } : {})}
        {...(onToggleDislike ? { onToggleDislike } : {})}
        {...(onToggleBookmark ? { onToggleBookmark } : {})}
        showViewCount
      />
    </Card>
  );
}
