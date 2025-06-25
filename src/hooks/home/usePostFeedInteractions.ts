'use client';

/* eslint-disable consistent-return */

import { useState, useEffect, useCallback } from 'react';

import { createTenantAwareRepositoryClient } from '@/lib/data-access/tenant-aware-client';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

interface PostInteractionsState {
  likedPosts: Set<string>;
  dislikedPosts: Set<string>;
  bookmarkedPosts: Set<string>;
  initialized: boolean;
}

export interface PostFeedInteractions {
  likedPosts: Set<string>;
  dislikedPosts: Set<string>;
  bookmarkedPosts: Set<string>;
  initialized: boolean;
  toggleLike: (postId: string) => Promise<void>;
  toggleDislike: (postId: string) => Promise<void>;
  toggleBookmark: (postId: string) => Promise<void>;
}

export function usePostFeedInteractions(userId: string): PostFeedInteractions {
  const [state, setState] = useState<PostInteractionsState>({
    likedPosts: new Set(),
    dislikedPosts: new Set(),
    bookmarkedPosts: new Set(),
    initialized: false,
  });

  const supabase = createSupabaseBrowserClient();

  // Initial load
  useEffect(() => {
    if (!userId || state.initialized) return;

    let mounted = true;

    const load = async (): Promise<void> => {
      try {
        const { data: reactions } = await supabase
          .from('post_reactions')
          .select('post_id, type')
          .eq('user_id', userId);

        const { data: bookmarks } = await supabase
          .from('post_bookmarks')
          .select('post_id')
          .eq('user_id', userId);

        if (mounted) {
          const liked = new Set(
            reactions?.filter((r) => r.type === 'like').map((r) => r.post_id) ?? [],
          );
          const disliked = new Set(
            reactions?.filter((r) => r.type === 'dislike').map((r) => r.post_id) ?? [],
          );
          const bookmarked = new Set(bookmarks?.map((b) => b.post_id) ?? []);
          setState({ likedPosts: liked, dislikedPosts: disliked, bookmarkedPosts: bookmarked, initialized: true });
        }
      } catch (err) {
        console.error('Error loading post interactions', err);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [userId, state.initialized, supabase]);

  // Toggle helpers
  const toggleLike = useCallback(
    async (postId: string) => {
      if (!userId) return;
      const isLiked = state.likedPosts.has(postId);
      const isDisliked = state.dislikedPosts.has(postId);
      // optimistic
      setState((prev) => {
        const liked = new Set(prev.likedPosts);
        const disliked = new Set(prev.dislikedPosts);
        if (isLiked) liked.delete(postId);
        else liked.add(postId);
        if (isDisliked) disliked.delete(postId);
        return { ...prev, likedPosts: liked, dislikedPosts: disliked };
      });
      try {
        const tenantRepo = await createTenantAwareRepositoryClient();
        await tenantRepo.insertPostReaction({ user_id: userId, post_id: postId, type: 'like' });
      } catch (err) {
        console.error('toggleLike error', err);
      }
    },
    [userId, state.likedPosts, state.dislikedPosts],
  );

  const toggleDislike = useCallback(
    async (postId: string) => {
      if (!userId) return;
      const isDisliked = state.dislikedPosts.has(postId);
      const isLiked = state.likedPosts.has(postId);
      setState((prev) => {
        const liked = new Set(prev.likedPosts);
        const disliked = new Set(prev.dislikedPosts);
        if (isDisliked) disliked.delete(postId);
        else disliked.add(postId);
        if (isLiked) liked.delete(postId);
        return { ...prev, likedPosts: liked, dislikedPosts: disliked };
      });
      try {
        const tenantRepo = await createTenantAwareRepositoryClient();
        await tenantRepo.insertPostReaction({ user_id: userId, post_id: postId, type: 'dislike' });
      } catch (err) {
        console.error('toggleDislike error', err);
      }
    },
    [userId, state.likedPosts, state.dislikedPosts],
  );

  const toggleBookmark = useCallback(
    async (postId: string) => {
      if (!userId) return;
      const isBookmarked = state.bookmarkedPosts.has(postId);
      setState((prev) => {
        const bookmarked = new Set(prev.bookmarkedPosts);
        if (isBookmarked) bookmarked.delete(postId);
        else bookmarked.add(postId);
        return { ...prev, bookmarkedPosts: bookmarked };
      });
      try {
        if (isBookmarked) {
          const tenantRepo = await createTenantAwareRepositoryClient();
          await tenantRepo.deletePostBookmark({ user_id: userId, post_id: postId });
        } else {
          const tenantRepo = await createTenantAwareRepositoryClient();
          await tenantRepo.insertPostBookmark({ user_id: userId, post_id: postId });
        }
      } catch (err) {
        console.error('toggleBookmark error', err);
      }
    },
    [userId, state.bookmarkedPosts],
  );

  return { ...state, toggleLike, toggleDislike, toggleBookmark };
} 