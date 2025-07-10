'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { moderatePost } from '@/app/actions/collectiveActions';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface PendingPost {
  id: string;
  title: string;
  submitted_at: string;
  author_name: string;
}

export function ModerationDashboardClient({
  initialPosts,
  collectiveId,
}: {
  initialPosts: PendingPost[];
  collectiveId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [posts, setPosts] = useState(initialPosts);

  const handleModeration = (
    postId: string,
    status: 'published' | 'rejected',
  ) => {
    startTransition(async () => {
      // Optimistically remove the post from the UI
      setPosts((currentPosts) => currentPosts.filter((p) => p.id !== postId));

      const result = await moderatePost({ postId, collectiveId, status });

      if (result && 'success' in result) {
        toast.success(
          `Post has been ${status === 'published' ? 'approved' : 'rejected'}.`,
        );
      } else if (result && 'error' in result) {
        toast.error('Failed to moderate post.', {
          description: result.error,
        });
        // Revert optimistic update on failure
        setPosts(initialPosts);
      }
    });
  };

  if (posts.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-10">
        <p>There are no posts pending approval.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Author</TableHead>
          <TableHead>Submitted</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {posts.map((post) => (
          <TableRow key={post.id}>
            <TableCell className="font-medium">{post.title}</TableCell>
            <TableCell>{post.author_name}</TableCell>
            <TableCell>
              {new Date(post.submitted_at).toLocaleDateString()}
            </TableCell>
            <TableCell className="text-right space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleModeration(post.id, 'rejected')}
                disabled={isPending}
              >
                Reject
              </Button>
              <Button
                size="sm"
                onClick={() => handleModeration(post.id, 'published')}
                disabled={isPending}
              >
                Approve
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
