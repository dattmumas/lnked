'use client';

import React from 'react';

import { cn } from '@/lib/utils/cn';

import PostListItem, { type PostListItemProps } from './PostListItem';

interface DashboardPostsTableProps {
  posts: PostListItemProps['post'][];
  queryKey: readonly unknown[];
  /**
   * If true, show the collective column even for personal posts.
   */
  showCollective?: boolean;
  className?: string;
}

/**
 * Opinionated responsive posts table.
 *
 * • md and up ⇒ traditional table layout with sticky header.
 * • below md ⇒ card‐style list using PostCompact.
 */
export default function DashboardPostsTable({
  posts,
  queryKey,
  showCollective = false,
  className,
}: DashboardPostsTableProps): React.ReactElement {
  if (!posts || posts.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground rounded-lg bg-card">
        No posts found. Click <span className="font-medium">“New Post”</span> to
        create your first one!
      </div>
    );
  }

  return (
    <div className={cn('rounded-lg bg-card overflow-x-auto', className)}>
      {/* Mobile – cards */}
      <div className="md:hidden divide-y divide-border">
        {posts.map((post) => (
          <PostListItem
             
            key={post.id}
            post={post}
            variant="compact"
            queryKey={queryKey}
            showCollective={showCollective}
          />
        ))}
      </div>

      {/* Desktop – table */}
      <table className="hidden md:table min-w-full text-sm p-16">
        <thead className="sticky top-0 bg-muted/60 backdrop-blur supports-[backdrop-filter]:bg-muted/30">
          <tr className="text-muted-foreground">
            <th className="px-6 py-4 text-left font-xl whitespace-nowrap">
              Title
            </th>
            <th className="px-6 py-4 text-left font-medium whitespace-nowrap">
              Status
            </th>
            <th className="px-4 py-3 text-left font-semibold whitespace-nowrap">
              Publish Date
            </th>
            <th className="px-4 py-3 text-left font-semibold whitespace-nowrap">
              Likes
            </th>
            <th className="px-4 py-3 text-left font-semibold whitespace-nowrap">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {posts.map((post) => (
            <PostListItem
              key={post.id}
              post={post}
              variant="table"
              queryKey={queryKey}
              showCollective={showCollective}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
