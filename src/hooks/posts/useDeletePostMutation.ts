'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { deletePost } from '@/app/actions/postActions';

// Define the shape of the data in the query cache
// This should align with what your posts query returns
interface PostInCache {
  id: string;
  // Use unknown for additional properties to avoid `any`.
  [key: string]: unknown;
}

interface DeletePostResult {
  success: boolean;
  error?: string;
  redirectPath?: string;
}

import type { UseMutationResult } from '@tanstack/react-query';

/**
 * Provides an optimistic delete mutation for posts.
 * When a post is deleted, it is immediately removed from the UI. If the server
 * call fails, the change is reverted and a toast notification is shown.
 *
 * @param queryKey The React Query key for the posts list to invalidate and update.
 */
export function useDeletePostMutation(
  queryKey: readonly unknown[],
): UseMutationResult<
  DeletePostResult,
  Error,
  string,
  { previousPosts?: PostInCache[] }
> {
  const queryClient = useQueryClient();

  return useMutation<
    DeletePostResult,
    Error,
    string,
    { previousPosts?: PostInCache[] }
  >({
    mutationFn: (postId: string) => deletePost(postId),
    onMutate: async (postId: string) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previousPosts = queryClient.getQueryData<PostInCache[]>(queryKey);

      // Optimistically remove the post from the cache
      queryClient.setQueryData<PostInCache[]>(queryKey, (old) =>
        old ? old.filter((post) => post.id !== postId) : [],
      );

      // Return a context object only if we have a snapshot; avoids assigning
      // `undefined` to an exact optional property.
      if (previousPosts === undefined) {
        return {};
      }
      return { previousPosts };
    },
    onError: (err, _postId, context) => {
      // If the mutation fails, roll back to the previous state
      if (context?.previousPosts) {
        queryClient.setQueryData(queryKey, context.previousPosts);
      }
      toast.error('Failed to delete post', {
        description: 'Please try again.',
      });
    },
    onSettled: () => {
      // Always refetch after error or success to ensure data consistency
      void queryClient.invalidateQueries({ queryKey });
    },
  });
}
