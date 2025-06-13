'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import PostCardHeader from './PostCardHeader';
import PostCardFooter from './PostCardFooter';
import VideoThumbnail from './VideoThumbnail';
import { cn } from '@/lib/utils';
import { useState, useRef } from 'react';

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
}: VideoCardProps) {
  const router = useRouter();
  const postUrl = post.slug ? `/posts/${post.slug}` : `/posts/${post.id}`;

  const isProcessing = post.metadata?.status === 'preparing';
  const hasError = post.metadata?.status === 'errored';

  // Extract description from content (for video posts, content is usually the description)
  const description =
    post.content && post.content.length > 0
      ? post.content.length > 150
        ? `${post.content.substring(0, 150)}...`
        : post.content
      : undefined;

  // --- In-feed video playback state ---
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPlaying(true);
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
  };

  const handleVideoPause = () => {
    // Only restore thumbnail if paused by user (not by switching tabs, etc.)
    setIsPlaying(false);
  };

  // If no playbackId, fallback to detail page navigation
  const canPlayInline = post.metadata?.playbackId && !isProcessing && !hasError;

  return (
    <Card
      className={cn(
        'overflow-hidden border border-border drop-shadow-sm hover:shadow-lg transition-all duration-200 hover:ring-2 hover:ring-primary/20 hover:scale-[1.02]',
        className,
      )}
    >
      <CardContent className="p-6">
        <PostCardHeader
          author={post.author}
          timestamp={post.created_at}
          collective={post.collective}
          showFollowButton={showFollowButton}
          currentUserId={currentUserId}
          onFollow={onFollow}
          isFollowing={isFollowing}
        />

        {/* Video Player or Thumbnail */}
        <div className="mb-4 relative">
          {isPlaying && canPlayInline ? (
            <video
              ref={videoRef}
              src={`https://stream.mux.com/${post.metadata?.playbackId}.m3u8`}
              poster={post.thumbnail_url || undefined}
              controls
              autoPlay
              playsInline
              className="w-full rounded-lg bg-black aspect-video"
              onEnded={handleVideoEnded}
              onPause={handleVideoPause}
            >
              <track kind="captions" srcLang="en" label="English captions" />
            </video>
          ) : (
            <button
              type="button"
              className="group w-full aspect-video relative focus:outline-none"
              onClick={
                canPlayInline ? handlePlayClick : () => router.push(postUrl)
              }
              aria-label="Play video"
            >
              <VideoThumbnail
                thumbnailUrl={post.thumbnail_url}
                duration={post.metadata?.duration}
                playbackId={post.metadata?.playbackId}
                isProcessing={isProcessing}
                className="w-full"
              />
              {/* Play overlay */}
              {canPlayInline && !isProcessing && !hasError && (
                <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <svg
                    className="w-16 h-16 text-white opacity-90 group-hover:scale-110 transition-transform"
                    fill="currentColor"
                    viewBox="0 0 64 64"
                  >
                    <circle
                      cx="32"
                      cy="32"
                      r="32"
                      fill="black"
                      fillOpacity="0.4"
                    />
                    <polygon points="26,20 50,32 26,44" fill="white" />
                  </svg>
                </span>
              )}
            </button>
          )}
        </div>

        {/* Content */}
        <a href={postUrl} className="group block">
          <h2 className="text-xl font-semibold mb-3 group-hover:text-accent transition-colors line-clamp-2">
            {post.title}
          </h2>

          {description && (
            <p className="text-sm text-muted-foreground mb-4 line-clamp-2 leading-relaxed">
              {description}
            </p>
          )}

          {/* Video Status Indicators */}
          {isProcessing && (
            <div className="text-sm text-yellow-600 mb-2 font-medium">
              Video is processing...
            </div>
          )}

          {hasError && (
            <div className="text-sm text-destructive mb-2 font-medium">
              Video processing failed
            </div>
          )}

          <div className="text-sm font-medium text-accent hover:underline">
            Watch video →
          </div>
        </a>

        <PostCardFooter
          postId={post.id}
          postSlug={post.slug || undefined}
          postTitle={post.title}
          interactions={interactions}
          onToggleLike={onToggleLike}
          onToggleDislike={onToggleDislike}
          onToggleBookmark={onToggleBookmark}
          showViewCount
        />
      </CardContent>
    </Card>
  );
}
