'use client';

import { useMemo } from 'react';

import PostViewer from '@/components/app/posts/PostViewer';

import type {
  PostWithAuthorAndCollective,
  PostViewer as PostViewerType,
} from '@/lib/posts';

interface PostLoaderProps {
  post: PostWithAuthorAndCollective;
  viewer: PostViewerType;
  commentCount: number;
}

// Helper to calculate reading time
function calculateReadingTime(content: string | null | undefined): string {
  if (!content) return '1 min read';
  const wordsPerMinute = 200;
  const words = content.trim().split(/\s+/).length;
  const minutes = Math.ceil(words / wordsPerMinute);
  return `${minutes} min read`;
}

// Helper to get author initials
function getAuthorInitials(
  fullName: string | null | undefined,
  username: string | null | undefined,
): string {
  const name = fullName || username || 'Unknown';
  const parts = name.split(' ').filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '');
  }
  return name.slice(0, 2).toUpperCase();
}

// Helper to format view count
function formatViewCount(count: number | null): string {
  if (!count) return '0 views';
  if (count < 1000) return `${count} views`;
  if (count < 1000000) return `${(count / 1000).toFixed(1)}K views`;
  return `${(count / 1000000).toFixed(1)}M views`;
}

export default function PostLoader({
  post,
  viewer,
  commentCount,
}: PostLoaderProps) {
  // Compute derived values once
  const viewModel = useMemo(
    () => ({
      readingTime: calculateReadingTime(post.content),
      authorInitials: getAuthorInitials(
        post.author?.full_name,
        post.author?.username,
      ),
      formattedViewCount: formatViewCount(post.view_count),
      hasAuthor: Boolean(post.author),
      hasCollective: Boolean(post.collective),
      isPublished: Boolean(post.is_public && post.published_at),
    }),
    [post],
  );

  return <PostViewer post={post} viewer={viewer} viewModel={viewModel} />;
}
