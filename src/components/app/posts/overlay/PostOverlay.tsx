'use client';

import { useQuery } from '@tanstack/react-query';
import React, { useMemo } from 'react';

import OverlayPostViewer from '@/components/app/posts/overlay/OverlayPostViewer';
import { CenteredSpinner } from '@/components/ui/CenteredSpinner';
import { fetchPost, type PostResult } from '@/lib/posts';
import supabase from '@/lib/supabase/browser';

interface Props {
  postId: string;
}

// Helpers duplicated from PostLoader (avoid new files)
function calculateReadingTime(content: string | null | undefined): string {
  if (!content) return '1 min read';
  const wordsPerMinute = 200;
  const words = content.trim().split(/\s+/).length;
  const minutes = Math.ceil(words / wordsPerMinute);
  return `${minutes} min read`;
}

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

function formatViewCount(count: number | null): string {
  if (!count) return '0 views';
  if (count < 1000) return `${count} views`;
  if (count < 1000000) return `${(count / 1000).toFixed(1)}K views`;
  return `${(count / 1000000).toFixed(1)}M views`;
}

export default function PostOverlay({ postId }: Props): React.ReactElement {
  const { data, isLoading, error } = useQuery<PostResult | null, Error>({
    queryKey: ['fullPost', postId],
    enabled: typeof postId === 'string',
    queryFn: async () => {
      if (!postId) return null;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const viewerId = user?.id;
      return await fetchPost(supabase, postId, viewerId);
    },
  });

  const post = data?.post;

  const viewModel = useMemo(() => {
    if (!post) {
      return {
        readingTime: '1 min read',
        authorInitials: '',
        formattedViewCount: '0 views',
        hasAuthor: false,
        hasCollective: false,
        isPublished: false,
      };
    }
    return {
      readingTime: calculateReadingTime(post.content),
      authorInitials: getAuthorInitials(
        post.author?.full_name,
        post.author?.username,
      ),
      formattedViewCount: formatViewCount(post.view_count),
      hasAuthor: Boolean(post.author),
      hasCollective: Boolean(post.collective),
      isPublished: Boolean(post.is_public && post.published_at),
    };
  }, [post]);

  if (isLoading) return <CenteredSpinner />;
  if (error || !data || !post)
    return <p className="p-4 text-destructive">Failed to load</p>;

  return (
    <OverlayPostViewer post={post} viewer={data.viewer} viewModel={viewModel} />
  );
}
