'use client';

import {
  Calendar,
  Edit,
  ExternalLink,
  Eye,
  Heart,
  MoreHorizontal,
  Trash2,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import React from 'react';

import { Button } from '@/components/primitives/Button';
import { Card } from '@/components/primitives/Card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDate } from '@/lib/utils/date-helpers';
import {
  getLikeCount,
  getViewCount,
  getStatusLabel,
  getStatusVariant,
  PostWithMetrics,
} from '@/lib/utils/post-helpers';

// The post type should be comprehensive, including all fields the card might need.
// This should eventually be replaced by a canonical type from database.types.ts
export type PostCardData = PostWithMetrics & {
  id: string;
  title: string;
  description?: string | null;
  slug?: string;
  created_at: string;
  collective?: { id: string; name: string; slug: string } | null;
  video?: { id: string; title: string | null } | null;
};

export interface PostCardProps {
  post: PostCardData;
  onDelete: () => void;
  isDeleting: boolean;
  showDeleteConfirm: boolean;
  onSelect?: () => void;
  isSelected: boolean;
  showCollective: boolean;
}

export default function PostCard({
  post,
  onDelete,
  isDeleting,
  showDeleteConfirm,
  onSelect,
  isSelected,
  showCollective,
}: PostCardProps): React.ReactElement {
  const likes = getLikeCount(post);
  const views = getViewCount(post);

  const postViewUrl = post.video
    ? `/videos/${post.video.id}`
    : `/posts/${post.id}`;
  const postEditUrl = `/posts/${post.id}/edit`;

  return (
    <Card
      size="md"
      className={`pattern-card micro-interaction card-lift transition-all transition-normal ${
        isSelected ? 'ring-2 ring-accent border-accent' : ''
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-component">
        <div className="flex items-start gap-component flex-1 min-w-0">
          {/* Selection checkbox */}
          {onSelect && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onSelect}
              className="h-4 w-4 rounded border-border-subtle accent-accent micro-interaction mt-1"
            />
          )}

          {/* Post content */}
          <div className="flex-1 min-w-0">
            <div className="pattern-stack gap-component">
              {/* Title and status */}
              <div className="flex items-start justify-between gap-component">
                <Link href={postViewUrl} className="group flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-content-primary group-hover:text-content-accent transition-colors transition-fast line-clamp-2">
                    {post.title}
                  </h3>
                </Link>
                <Badge
                  variant={getStatusVariant(post)}
                  className="micro-interaction flex-shrink-0"
                >
                  {getStatusLabel(post)}
                </Badge>
              </div>

              {/* Content snippet from post description */}
              {post.description && (
                <p className="text-content-secondary text-sm line-clamp-2">
                  {post.description}
                </p>
              )}

              {/* Metadata */}
              <div className="flex flex-wrap items-center gap-component text-xs text-content-secondary">
                {showCollective && post.collective && (
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    <Link
                      href={`/collectives/${post.collective.slug}`}
                      className="hover:text-content-accent transition-colors transition-fast"
                    >
                      {post.collective.name}
                    </Link>
                  </div>
                )}

                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDate(post.published_at ?? post.created_at)}
                </div>
              </div>

              {/* Engagement metrics */}
              {(views > 0 || likes > 0) && (
                <div className="flex items-center gap-component text-xs text-content-secondary border-t border-border-subtle pt-component">
                  {views > 0 && (
                    <div className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {views.toLocaleString()} views
                    </div>
                  )}
                  {likes > 0 && (
                    <div className="flex items-center gap-1">
                      <Heart className="h-3 w-3" />
                      {likes.toLocaleString()} likes
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="micro-interaction nav-hover flex-shrink-0"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="bg-surface-elevated-1 border-border-subtle"
          >
            <DropdownMenuItem asChild>
              <Link href={postViewUrl} className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                {post.video ? 'View Video' : 'View Post'}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={postEditUrl} className="flex items-center gap-2">
                <Edit className="h-4 w-4" />
                Edit Post
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="border-border-subtle" />
            <DropdownMenuItem
              onClick={onDelete}
              disabled={isDeleting}
              className="text-destructive focus:text-destructive focus:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {showDeleteConfirm
                ? 'Confirm Delete'
                : isDeleting
                  ? 'Deleting...'
                  : 'Delete Post'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
}
