'use client';

import { Eye, Edit2, MoreVertical, Trash2, Heart } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { deletePost } from '@/app/actions/postActions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import type { DashboardPost } from './page';

interface PostRowProps {
  post: DashboardPost;
}

export default function PostRow({ post }: PostRowProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deletePost(post.id);
      if (result.success) {
        toast.success('Post deleted successfully');
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to delete post');
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Failed to delete post');
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <>
      <div className="p-4 sm:p-6 hover:bg-muted/50 transition-colors duration-200">
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold mb-2 truncate">
              <Link
                href={`/posts/${post.slug}`}
                className="text-card-foreground/90 hover:text-primary transition-colors"
              >
                {post.title}
              </Link>
            </h3>
            <div className="flex items-center flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
              <Badge
                variant={post.status === 'active' ? 'success' : 'outline'}
                className="py-1"
              >
                {post.status === 'active' ? 'Published' : 'Draft'}
              </Badge>
              <span className="flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5" />
                {post.view_count} views
              </span>
              <span className="flex items-center gap-1.5">
                <Heart className="h-3.5 w-3.5" />
                {post.like_count} likes
              </span>
              {post.published_at && (
                <span className="text-muted-foreground/80">
                  {new Date(post.published_at).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              >
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <Link
                  href={`/posts/${post.slug}`}
                  className="flex items-center"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href={`/posts/${post.slug}/edit`}
                  className="flex items-center"
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setShowDeleteDialog(true)}
                className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete your
              post and remove it from our servers.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
