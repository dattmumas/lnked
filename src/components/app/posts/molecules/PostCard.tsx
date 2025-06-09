import ArticleCard from './ArticleCard';
import VideoCard from './VideoCard';

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

interface UnifiedPost {
  id: string;
  title: string;
  content?: string | null;
  meta_description?: string | null;
  thumbnail_url?: string | null;
  slug?: string | null;
  created_at: string;
  post_type: 'text' | 'video';
  metadata?: any; // JSON metadata for video posts
  author: Author;
  collective?: Collective | null;
}

interface PostCardProps {
  post: UnifiedPost;
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

/**
 * Unified PostCard component that renders either ArticleCard or VideoCard
 * based on the post type, following the creative phase design decisions.
 */
export default function PostCard({
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
}: PostCardProps) {
  // Determine post type and render appropriate card
  if (post.post_type === 'video') {
    return (
      <VideoCard
        post={post}
        interactions={interactions}
        onToggleLike={onToggleLike}
        onToggleDislike={onToggleDislike}
        onToggleBookmark={onToggleBookmark}
        onFollow={onFollow}
        isFollowing={isFollowing}
        currentUserId={currentUserId}
        showFollowButton={showFollowButton}
        className={className}
      />
    );
  }

  // Default to ArticleCard for text posts
  return (
    <ArticleCard
      post={post}
      interactions={interactions}
      onToggleLike={onToggleLike}
      onToggleDislike={onToggleDislike}
      onToggleBookmark={onToggleBookmark}
      onFollow={onFollow}
      isFollowing={isFollowing}
      currentUserId={currentUserId}
      showFollowButton={showFollowButton}
      className={className}
    />
  );
}

// Export utility function for backward compatibility
export const truncateText = (text: string | null, maxLength = 150): string => {
  if (!text) return '';
  return text.length <= maxLength ? text : `${text.substring(0, maxLength)}...`;
};
