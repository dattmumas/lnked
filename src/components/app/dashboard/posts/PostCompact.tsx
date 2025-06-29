'use client';

import {
  Calendar,
  Edit,
  ExternalLink,
  MoreHorizontal,
  Trash2,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import React from 'react';

import { Button } from '@/components/primitives/Button';
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
  getStatusLabel,
  getStatusVariant,
  PostWithMetrics,
} from '@/lib/utils/post-helpers';

export type PostCompactData = PostWithMetrics & {
  id: string;
  title: string;
  slug?: string;
  created_at: string;
  collective?: { id: string; name: string; slug: string } | null;
  video?: { id: string; title: string | null } | null;
};

export interface PostCompactProps {
  post: PostCompactData;
  onDelete: () => void;
  isDeleting: boolean;
  showDeleteConfirm: boolean;
  onSelect?: () => void;
  isSelected: boolean;
  showCollective: boolean;
}

export default function PostCompact({
  post,
  onDelete,
  isDeleting,
  showDeleteConfirm,
  onSelect,
  isSelected,
  showCollective,
}: PostCompactProps): React.ReactElement {
  const postViewUrl = post.video
    ? `/videos/${post.video.id}`
    : `/posts/${post.id}`;
  const postEditUrl = `/posts/${post.id}/edit`;

  return (
    <div
      className={`flex items-center gap-4 px-4 py-3 border-b border-border transition-colors hover:bg-muted/50 ${
        isSelected ? 'bg-muted' : ''
      }`}
    >
      {/* Selection checkbox */}
      {onSelect && (
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onSelect}
          className="h-4 w-4 rounded border-border-subtle accent-accent micro-interaction"
        />
      )}

      {/* Post content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-component">
          <div className="min-w-0 flex-1">
            <Link href={postViewUrl} className="group block">
              <h3 className="font-medium text-content-primary truncate group-hover:text-content-accent transition-colors transition-fast">
                {post.title}
              </h3>
            </Link>
            <div className="flex items-center gap-2 mt-1">
              <Badge
                variant={getStatusVariant(post)}
                className="micro-interaction"
              >
                {getStatusLabel(post)}
              </Badge>
              {showCollective && post.collective && (
                <span className="text-xs text-content-secondary flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {post.collective.name}
                </span>
              )}
              <span className="text-xs text-content-secondary flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDate(post.published_at ?? post.created_at)}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              size="sm"
              variant="ghost"
              className="micro-interaction nav-hover"
              asChild
            >
              <Link href={postEditUrl}>
                <Edit className="h-4 w-4" />
              </Link>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="micro-interaction nav-hover"
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
        </div>
      </div>
    </div>
  );
}
