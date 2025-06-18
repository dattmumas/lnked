/* eslint-disable unicorn/no-null */
'use client';

import React, { useCallback } from 'react';

import PostCard from '@/components/app/posts/molecules/PostCard';

import type { FeedItem } from '@/types/home/types';
import type { PostFeedInteractions } from '@/hooks/home/usePostFeedInteractions';

interface Props {
  item: FeedItem;
  interactions: PostFeedInteractions;
}

export function PostCardWrapper({
  item,
  interactions,
}: Props): React.JSX.Element {
  const handleLike = useCallback((): void => {
    void interactions.toggleLike(item.id);
  }, [interactions, item.id]);

  const handleDislike = useCallback((): void => {
    void interactions.toggleDislike(item.id);
  }, [interactions, item.id]);

  const handleBookmark = useCallback((): void => {
    void interactions.toggleBookmark(item.id);
  }, [interactions, item.id]);

  const unifiedPost = {
    id: item.id,
    title: item.title,
    content: item.content ?? null,
    meta_description: null,
    thumbnail_url: item.thumbnail_url ?? null,
    slug: null,
    created_at: item.published_at,
    post_type: item.type === 'video' ? ('video' as const) : ('text' as const),
    metadata: item.duration ? { duration: item.duration } : null,
    author: {
      id: '',
      username: item.author.username,
      full_name: item.author.name,
      avatar_url: item.author.avatar_url ?? null,
    },
    collective: item.collective ? { id: '', ...item.collective } : null,
  };

  return (
    <PostCard
      post={unifiedPost}
      interactions={{
        isLiked: interactions.likedPosts.has(item.id),
        isDisliked: interactions.dislikedPosts.has(item.id),
        isBookmarked: interactions.bookmarkedPosts.has(item.id),
        likeCount: item.stats.likes,
        dislikeCount: item.stats.dislikes,
        commentCount: item.stats.comments,
        viewCount: item.stats.views,
      }}
      onToggleLike={handleLike}
      onToggleDislike={handleDislike}
      onToggleBookmark={handleBookmark}
    />
  );
}
