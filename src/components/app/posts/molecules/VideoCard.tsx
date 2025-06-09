'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import PostCardHeader from './PostCardHeader';
import PostCardFooter from './PostCardFooter';
import VideoThumbnail from './VideoThumbnail';
import { cn } from '@/lib/utils';

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

interface VideoMetadata {
  videoAssetId?: string;
  duration?: number;
  playbackId?: string;
  status?: 'preparing' | 'ready' | 'errored';
  aspectRatio?: string;
}

interface VideoPost {
  id: string;
  title: string;
  content?: string | null; // Description for video posts
  thumbnail_url?: string | null;
  slug?: string | null;
  created_at: string;
  metadata?: VideoMetadata;
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

  const handleVideoClick = () => {
    // Navigate to the post detail page where the video player will be shown
    router.push(postUrl);
  };

  return (
    <Card
      className={cn(
        'overflow-hidden hover:shadow-lg transition-all duration-200 hover:ring-2 hover:ring-primary/20 hover:scale-[1.02]',
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

        {/* Video Thumbnail */}
        <div className="mb-4">
          <VideoThumbnail
            thumbnailUrl={post.thumbnail_url}
            duration={post.metadata?.duration}
            playbackId={post.metadata?.playbackId}
            isProcessing={isProcessing}
            onClick={handleVideoClick}
            className="w-full"
          />
        </div>

        {/* Content */}
        <Link href={postUrl} className="group block">
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
        </Link>

        <PostCardFooter
          postId={post.id}
          postSlug={post.slug || undefined}
          postTitle={post.title}
          interactions={interactions}
          onToggleLike={onToggleLike}
          onToggleDislike={onToggleDislike}
          onToggleBookmark={onToggleBookmark}
          showViewCount={true}
        />
      </CardContent>
    </Card>
  );
}
