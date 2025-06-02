import { Database } from '@/lib/database.types';

// Base types from database
type User = Database['public']['Tables']['users']['Row'];
type Post = Database['public']['Tables']['posts']['Row'];
type Follow = Database['public']['Tables']['follows']['Row'];

// Enhanced Profile interface with computed properties
export interface Profile {
  id: string;
  username: string;
  fullName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  coverImageUrl: string | null;
  socialLinks: SocialLinks | null;
  isProfilePublic: boolean;
  showComments: boolean;
  showFollowers: boolean;
  showSubscriptions: boolean;
  tags: string[] | null;
  createdAt: string;
  updatedAt: string | null;
}

// Social links structure
export interface SocialLinks {
  website?: string;
  twitter?: string;
  linkedin?: string;
  github?: string;
  instagram?: string;
  location?: string;
}

// Profile metrics and counts
export interface ProfileMetrics {
  followerCount: number;
  followingCount: number;
  postCounts: ContentCounts;
  totalViews: number;
  totalLikes: number;
}

// Content type counts
export interface ContentCounts {
  writing: number;
  video: number;
  total: number;
}

// Enhanced post interface for profile display
export interface ProfilePost {
  id: string;
  title: string;
  content: string | null;
  subtitle: string | null;
  thumbnailUrl: string | null;
  postType: Database['public']['Enums']['post_type_enum'];
  status: Database['public']['Enums']['post_status_type'];
  isPublic: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string | null;
  viewCount: number | null;
  likeCount: number;
  readTime?: number; // Computed from content
  author: {
    id: string;
    username: string;
    fullName: string | null;
    avatarUrl: string | null;
  };
  collective?: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

// Social feed item types
export type SocialFeedType = 'activity' | 'likes' | 'following';

export interface ActivityFeedItem {
  id: string;
  type: 'post_published' | 'post_liked' | 'user_followed' | 'post_commented';
  createdAt: string;
  actor: {
    id: string;
    username: string;
    fullName: string | null;
    avatarUrl: string | null;
  };
  target?: {
    id: string;
    title?: string;
    type: 'post' | 'user' | 'collective';
  };
  metadata?: Record<string, unknown>;
}

// Following/follower user display
export interface UserConnection {
  id: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  isFollowing: boolean;
  followedAt: string;
  mutualFollows?: number;
}

// Content filters and pagination
export interface ContentFilters {
  type?: Database['public']['Enums']['post_type_enum'];
  status?: Database['public']['Enums']['post_status_type'];
  search?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
  sortBy?: 'created_at' | 'published_at' | 'view_count' | 'like_count';
  sortOrder?: 'asc' | 'desc';
}

// API response types
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  nextCursor?: string;
}

export interface ProfileResponse {
  profile: Profile;
  metrics: ProfileMetrics;
  isFollowing: boolean;
  canEdit: boolean;
  canFollow: boolean;
}

// Context provider types
export interface ProfileContextValue {
  profile: Profile;
  metrics: ProfileMetrics;
  isOwner: boolean;
  canEdit: boolean;
  isFollowing: boolean;
  permissions: {
    canEdit: boolean;
    canDelete: boolean;
    canFollow: boolean;
    canMessage: boolean;
  };
}

// Component prop types
export interface ProfileLayoutProps {
  username: string;
  children: React.ReactNode;
}

export interface ProfileHeroProps {
  className?: string;
}

export interface AvatarCardProps {
  src?: string | null;
  size: number;
  editable?: boolean;
  onEdit?: () => void;
  className?: string;
}

export interface ProfileMetaProps {
  name: string | null;
  handle: string;
  bio: string | null;
  showFullBio?: boolean;
  onToggleBio?: () => void;
  className?: string;
}

export interface SocialLinksProps {
  links: SocialLinks | null;
  editable?: boolean;
  onEdit?: () => void;
  className?: string;
}

export interface CounterPillsProps {
  followerCount: number;
  followingCount: number;
  postCounts: ContentCounts;
  className?: string;
}

export interface FollowButtonProps {
  isFollowing: boolean;
  isLoading?: boolean;
  onClick: () => void;
  className?: string;
}

export interface SocialSidebarProps {
  className?: string;
}

export interface SocialTabsProps {
  defaultTab?: SocialFeedType;
  onTabChange?: (tab: SocialFeedType) => void;
  className?: string;
}

export interface ActivityFeedProps {
  username: string;
  className?: string;
}

export interface ContentAreaProps {
  className?: string;
}

export interface ContentTabsProps {
  activeType: Database['public']['Enums']['post_type_enum'];
  onTypeChange: (type: Database['public']['Enums']['post_type_enum']) => void;
  counts: ContentCounts;
  className?: string;
}

export interface ContentGridProps {
  posts: ProfilePost[];
  loading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  className?: string;
}

export interface ContentCardProps {
  post: ProfilePost;
  loading?: 'eager' | 'lazy';
  onClick?: () => void;
  className?: string;
}

// Hook return types
export interface UseProfileReturn {
  data: Profile | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export interface UseProfileMetricsReturn {
  data: ProfileMetrics | undefined;
  isLoading: boolean;
  error: Error | null;
}

export interface UseFollowStatusReturn {
  data: { isFollowing: boolean } | undefined;
  isLoading: boolean;
  error: Error | null;
}

export interface UseProfilePostsReturn {
  data: PaginatedResponse<ProfilePost> | undefined;
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isLoading: boolean;
  error: Error | null;
}

export interface UseSocialFeedReturn {
  data: PaginatedResponse<ActivityFeedItem | UserConnection> | undefined;
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isLoading: boolean;
  error: Error | null;
}

// Mutation types
export interface FollowMutationVariables {
  targetUsername: string;
  action: 'follow' | 'unfollow';
}

export interface UpdateProfileVariables {
  username: string;
  updates: Partial<Pick<Profile, 'fullName' | 'bio' | 'avatarUrl' | 'socialLinks'>>;
}

// Error types
export class ProfileError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'ProfileError';
  }
}

export class PermissionError extends ProfileError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 'PERMISSION_DENIED', 403);
  }
}

export class NotFoundError extends ProfileError {
  constructor(resource: string = 'Profile') {
    super(`${resource} not found`, 'NOT_FOUND', 404);
  }
} 