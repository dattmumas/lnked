'use client';

import {
  MoreHorizontal,
  Eye,
  Heart,
  MessageSquare,
  Calendar,
  Edit,
  Trash2,
  ExternalLink,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { deletePost } from '@/app/actions/postActions';
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


type DashboardPost = {
  id: string;
  title: string;
  slug?: string;
  published_at: string | null;
  created_at: string;
  description?: string | null;
  view_count?: number | null;
  collective?: { id: string; name: string; slug: string } | null;
  likes?: { count: number }[] | null;
  post_reactions?: { count: number; type?: string }[] | null;
  likeCount?: number;
  comments?: { id: string; content: string }[] | null;
  isFeatured?: boolean;
  video?: { id: string; title: string | null } | null;
};

export interface PostListItemProps {
  post: DashboardPost;
  onDelete?: (_id: string) => void;
  isSelected?: boolean;
  onSelect?: () => void;
  showCollective?: boolean;
  compact?: boolean;
  tableMode?: boolean;
}

/**
 * Enhanced PostListItem component using our design system.
 * Provides consistent post display with improved visual hierarchy,
 * interaction states, and responsive design.
 */
export default function PostListItem({
  post,
  onDelete,
  isSelected = false,
  onSelect,
  showCollective = false,
  compact = false,
  tableMode = false,
}: PostListItemProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;

    setIsDeleting(true);
    try {
      if (onDelete) {
        await onDelete(post.id);
      } else {
        await deletePost(post.id);
      }
      router.refresh();
    } catch (error) {
      console.error('Failed to delete post:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusVariant = (post: DashboardPost) => {
    if (!post.published_at) return 'secondary'; // draft
    if (post.published_at && new Date(post.published_at) > new Date())
      return 'outline'; // scheduled
    return 'default'; // published
  };

  const getStatusLabel = (post: DashboardPost) => {
    if (!post.published_at) return 'Draft';
    if (post.published_at && new Date(post.published_at) > new Date())
      return 'Scheduled';
    return 'Published';
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

      if (diffInSeconds < 60) return 'Just now';
      if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
      if (diffInSeconds < 86400)
        return `${Math.floor(diffInSeconds / 3600)}h ago`;
      if (diffInSeconds < 2592000)
        return `${Math.floor(diffInSeconds / 86400)}d ago`;

      return date.toLocaleDateString();
    } catch {
      return 'Invalid date';
    }
  };

  // Calculate engagement metrics from existing post data
  const likes =
    typeof post.likeCount === 'number'
      ? post.likeCount
      : post.likes?.[0]?.count || post.post_reactions?.[0]?.count || 0;

  const views = post.view_count || 0;
  const comments = post.comments?.length || 0;

  // Helper functions for URL routing
  const getPostViewUrl = (post: DashboardPost) => {
    return post.video ? `/videos/${post.video.id}` : `/posts/${post.id}`;
  };

  const getPostEditUrl = (post: DashboardPost) => {
    // Video posts don't have edit functionality yet, so keep routing to post edit
    return `/posts/${post.id}/edit`;
  };

  // Table mode - render as table rows
  if (tableMode) {
    return (
      <tr
        className={`hover:bg-muted/50 transition-colors ${isSelected ? 'bg-muted' : ''}`}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {onSelect && (
              <input
                type="checkbox"
                checked={isSelected}
                onChange={onSelect}
                className="h-4 w-4 rounded border-border accent-accent"
              />
            )}
            <div className="min-w-0 flex-1">
              <Link href={getPostViewUrl(post)} className="group block">
                <h3 className="font-medium text-foreground truncate group-hover:text-accent transition-colors">
                  {post.title}
                </h3>
              </Link>
              {post.description && (
                <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                  {post.description}
                </p>
              )}
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          <Badge variant={getStatusVariant(post)}>{getStatusLabel(post)}</Badge>
        </td>
        <td className="px-4 py-3 text-muted-foreground">
          {formatDate(post.published_at || post.created_at)}
        </td>
        <td className="px-4 py-3 text-muted-foreground">
          {likes > 0 ? likes.toLocaleString() : '—'}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" asChild>
              <Link href={getPostEditUrl(post)}>
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
                  <Link
                    href={getPostViewUrl(post)}
                    className="flex items-center gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    {post.video ? 'View Video' : 'View Post'}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link
                    href={getPostEditUrl(post)}
                    className="flex items-center gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    Edit Post
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="text-destructive focus:text-destructive focus:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {isDeleting ? 'Deleting...' : 'Delete Post'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </td>
      </tr>
    );
  }

  if (compact) {
    return (
      <div
        className={`flex items-center gap-component p-card-sm border-b border-border-subtle transition-colors transition-fast hover:bg-interaction-hover ${
          isSelected ? 'bg-interaction-focus border-accent' : ''
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
              <Link href={getPostViewUrl(post)} className="group block">
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
                  {formatDate(post.published_at || post.created_at)}
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
                <Link href={getPostEditUrl(post)}>
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
                    <Link
                      href={getPostViewUrl(post)}
                      className="flex items-center gap-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      {post.video ? 'View Video' : 'View Post'}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      href={getPostEditUrl(post)}
                      className="flex items-center gap-2"
                    >
                      <Edit className="h-4 w-4" />
                      Edit Post
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="border-border-subtle" />
                  <DropdownMenuItem
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="text-destructive focus:text-destructive focus:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {isDeleting ? 'Deleting...' : 'Delete Post'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
                <Link
                  href={getPostViewUrl(post)}
                  className="group flex-1 min-w-0"
                >
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
                  {formatDate(post.published_at || post.created_at)}
                </div>
              </div>

              {/* Engagement metrics */}
              {(views > 0 || likes > 0 || comments > 0) && (
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
                  {comments > 0 && (
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      {comments.toLocaleString()} comments
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
              <Link
                href={getPostViewUrl(post)}
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                {post.video ? 'View Video' : 'View Post'}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link
                href={getPostEditUrl(post)}
                className="flex items-center gap-2"
              >
                <Edit className="h-4 w-4" />
                Edit Post
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="border-border-subtle" />
            <DropdownMenuItem
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-destructive focus:text-destructive focus:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {isDeleting ? 'Deleting...' : 'Delete Post'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
}
