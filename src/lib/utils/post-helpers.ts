'use client';

// Define a consistent type for post data used in these helpers.
// This should be expanded or replaced with a canonical type from your database definitions.
type PostLikeInfo = {
  count: number;
};

type PostReactionInfo = {
  count: number;
  type?: string;
};

export type PostWithMetrics = {
  published_at: string | null;
  likeCount?: number;
  likes?: PostLikeInfo[] | null;
  post_reactions?: PostReactionInfo[] | null;
  view_count?: number | null;
  comments?: unknown[] | null;
};

/**
 * Determines the visual variant for a post's status badge.
 * @param post - The post object.
 * @returns 'secondary' for drafts, 'outline' for scheduled, 'default' for published.
 */
export function getStatusVariant(
  post: PostWithMetrics,
): 'secondary' | 'outline' | 'default' {
  if (!post.published_at) {
    return 'secondary'; // draft
  }
  if (new Date(post.published_at) > new Date()) {
    return 'outline'; // scheduled
  }
  return 'default'; // published
}

/**
 * Gets the human-readable label for a post's status.
 * @param post - The post object.
 * @returns 'Draft', 'Scheduled', or 'Published'.
 */
export function getStatusLabel(post: PostWithMetrics): string {
  if (!post.published_at) {
    return 'Draft';
  }
  if (new Date(post.published_at) > new Date()) {
    return 'Scheduled';
  }
  return 'Published';
}

/**
 * Safely calculates the total like count for a post from multiple possible data shapes.
 * @param post - The post object.
 * @returns The total number of likes.
 */
export function getLikeCount(post: PostWithMetrics): number {
  if (typeof post.likeCount === 'number' && post.likeCount >= 0) {
    return post.likeCount;
  }
  if (post.likes?.[0]?.count && post.likes[0].count >= 0) {
    return post.likes[0].count;
  }
  if (post.post_reactions?.[0]?.count && post.post_reactions[0].count >= 0) {
    return post.post_reactions[0].count;
  }
  return 0;
}

/**
 * Safely calculates the total view count for a post.
 * @param post - The post object.
 * @returns The total number of views.
 */
export function getViewCount(post: PostWithMetrics): number {
  return post.view_count ?? 0;
}

/**
 * Safely calculates the total comment count for a post.
 * @param post - The post object.
 * @returns The total number of comments.
 */
export function getCommentCount(post: PostWithMetrics): number {
  return post.comments?.length ?? 0;
}
