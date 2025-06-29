'use client';

import React, { useCallback, useState } from 'react';

import { useDeletePostMutation } from '@/hooks/posts/useDeletePostMutation';

import PostCard, { PostCardData } from './PostCard';
import PostCompact, { PostCompactData } from './PostCompact';
import PostRow, { PostRowData } from './PostRow';

// A union type for the post data, ensuring any of the variants can be handled.
// This should be derived from a single, canonical database type in the future.
type DashboardPost = PostCardData & PostRowData & PostCompactData;

export interface PostListItemProps {
  post: DashboardPost;
  onSelect?: () => void;
  isSelected?: boolean;
  showCollective?: boolean;
  variant?: 'card' | 'compact' | 'table';
  queryKey: readonly unknown[]; // Query key for the list this item belongs to
}

/**
 * Renders a post list item, delegating to the appropriate variant component.
 * It contains the shared delete logic using an optimistic mutation hook.
 */
export default function PostListItem({
  post,
  onSelect,
  isSelected = false,
  showCollective = false,
  variant = 'card',
  queryKey,
}: PostListItemProps): React.ReactElement {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const deleteMutation = useDeletePostMutation(queryKey);

  const handleDelete = useCallback((): void => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      setTimeout(() => setShowDeleteConfirm(false), 3000);
      return;
    }
    deleteMutation.mutate(post.id);
  }, [showDeleteConfirm, deleteMutation, post.id]);

  const handleSelect = useCallback((): void => {
    onSelect?.();
  }, [onSelect]);

  const baseProps = {
    post,
    onDelete: handleDelete,
    isDeleting: deleteMutation.isPending,
    showDeleteConfirm,
  } as const;

  switch (variant) {
    case 'table':
      return <PostRow {...baseProps} />;
    case 'compact':
      return (
        <PostCompact
          {...baseProps}
          onSelect={handleSelect}
          isSelected={isSelected}
          showCollective={showCollective}
        />
      );
    case 'card':
    default:
      return (
        <PostCard
          {...baseProps}
          onSelect={handleSelect}
          isSelected={isSelected}
          showCollective={showCollective}
        />
      );
  }
}
