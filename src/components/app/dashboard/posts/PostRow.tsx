'use client';

import { Edit, ExternalLink, MoreHorizontal, Trash2 } from 'lucide-react';
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
  getLikeCount,
  getStatusLabel,
  getStatusVariant,
  PostWithMetrics,
} from '@/lib/utils/post-helpers';

export type PostRowData = PostWithMetrics & {
  id: string;
  title: string;
  description?: string | null;
  slug?: string;
  created_at: string;
  video?: { id: string; title: string | null } | null;
};

export interface PostRowProps {
  post: PostRowData;
  onDelete: () => void;
  isDeleting: boolean;
  showDeleteConfirm: boolean;
}

export default function PostRow({
  post,
  onDelete,
  isDeleting,
  showDeleteConfirm,
}: PostRowProps): React.ReactElement {
  const likes = getLikeCount(post);
  const postViewUrl = post.video
    ? `/videos/${post.video.id}`
    : `/posts/${post.id}`;
  const postEditUrl = `/posts/${post.id}/edit`;

  return (
    <tr className="hover:bg-muted/50 transition-colors">
      <td className="px-6 py-4 whitespace-nowrap">
        <Link
          href={postViewUrl}
          className="hover:text-accent transition-colors"
        >
          {post.title}
        </Link>
      </td>
      <td className="px-6 py-4">
        <Badge variant={getStatusVariant(post)}>{getStatusLabel(post)}</Badge>
      </td>
      <td className="px-6 py-4 text-muted-foreground">
        {formatDate(post.published_at ?? post.created_at)}
      </td>
      <td className="px-6 py-4 text-muted-foreground">
        {likes > 0 ? likes.toLocaleString() : '—'}
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" asChild>
            <Link href={postEditUrl}>
              <Edit className="h-4 w-4" />
            </Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
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
              <DropdownMenuSeparator />
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
      </td>
    </tr>
  );
}
