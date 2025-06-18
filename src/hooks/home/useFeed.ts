'use client';

import { useState, useEffect, useCallback } from 'react';

import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { POSTS_LIMIT, REFETCH_DELAY } from '@/types/home/constants';

import type { FeedItem } from '@/types/home/types';

interface UseFeedReturn {
  feedItems: FeedItem[];
  loading: boolean;
  error: string | undefined;
  refetch: () => void;
}

export function useFeed(): UseFeedReturn {
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | undefined>(undefined);

  const supabase = createSupabaseBrowserClient();

  const fetchFeed = useCallback(async (): Promise<void> => {
    try {
      // Fetch posts with user and collective info
      const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select(
          `
          id,
          title,
          content,
          post_type,
          thumbnail_url,
          metadata,
          published_at,
          users!posts_author_id_fkey (
            username,
            full_name,
            avatar_url
          ),
          collectives!posts_collective_id_fkey (
            name,
            slug
          )
        `,
        )
        .not('published_at', 'is', null)
        .order('published_at', { ascending: false })
        .limit(POSTS_LIMIT);

      if (postsError) {
        setError(postsError.message);
        return;
      }

      const postRows = (posts ?? []) as unknown as Array<{
        id: string;
        title: string;
        content: string | null;
        post_type: 'video' | 'text';
        thumbnail_url: string | null;
        metadata: Record<string, unknown> | null;
        published_at: string | null;
        users?: { username: string | null; full_name: string | null; avatar_url: string | null } | null;
        collectives?: { name: string | null; slug: string | null } | null;
      }>;

      const postIds = postRows.map((p) => p.id);
      // Fetch reaction counts
      const { data: reactions } = await supabase
        .from('post_reactions')
        .select('post_id, type')
        .in('post_id', postIds);

      const reactionCounts: Record<string, { likes: number; dislikes: number }> = {};
      postIds.forEach((id) => {
        reactionCounts[id] = { likes: 0, dislikes: 0 };
      });
      reactions?.forEach((r) => {
        if (r.type === 'like') reactionCounts[r.post_id].likes += 1;
        else if (r.type === 'dislike') reactionCounts[r.post_id].dislikes += 1;
      });

      // Comment counts
      const { data: comments } = await supabase
        .from('comments')
        .select('entity_id')
        .eq('entity_type', 'post')
        .in('entity_id', postIds);

      const commentCounts: Record<string, number> = {};
      postIds.forEach((id) => {
        commentCounts[id] = 0;
      });
      comments?.forEach((c) => {
        commentCounts[c.entity_id] = (commentCounts[c.entity_id] ?? 0) + 1;
      });

      const items: FeedItem[] = postRows.map((post) => ({
        id: post.id,
        type: post.post_type === 'video' ? 'video' : 'post',
        title: post.title,
        content: post.content ?? undefined,
        author: {
          name: post.users?.full_name ?? 'Unknown Author',
          username: post.users?.username ?? 'unknown',
          avatar_url: post.users?.avatar_url ?? undefined,
        },
        published_at: post.published_at ?? new Date().toISOString(),
        stats: {
          likes: reactionCounts[post.id]?.likes ?? 0,
          dislikes: reactionCounts[post.id]?.dislikes ?? 0,
          comments: commentCounts[post.id] ?? 0,
          views: (post.metadata as Record<string, number> | undefined)?.views,
        },
        thumbnail_url: post.thumbnail_url ?? undefined,
        duration:
          post.post_type === 'video' && post.metadata
            ? ((post.metadata as Record<string, string>).duration ?? undefined)
            : undefined,
        collective: post.collectives
          ? { name: post.collectives.name ?? 'Unknown', slug: post.collectives.slug ?? 'unknown' }
          : undefined,
      }));

      setFeedItems(items);
      setError(undefined);
    } catch {
      setError('Failed to load feed');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void fetchFeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refetch = useCallback((): void => {
    setLoading(true);
    setTimeout(() => {
      void fetchFeed();
    }, REFETCH_DELAY);
  }, [fetchFeed]);

  return { feedItems, loading, error, refetch };
} 