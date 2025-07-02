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
          video_id,
          users!posts_author_id_fkey (
            username,
            full_name,
            avatar_url
          ),
          collectives!posts_collective_id_fkey (
            name,
            slug
          ),
          video_assets!posts_video_id_fkey (
            id,
            mux_playback_id,
            status,
            duration,
            is_public
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
        video_id: string | null;
        users?: {
          username: string | null;
          full_name: string | null;
          avatar_url: string | null;
        } | null;
        collectives?: { name: string | null; slug: string | null } | null;
        video_assets?: Array<{
          id: string;
          mux_playback_id: string | null;
          status: string | null;
          duration: number | null;
          is_public: boolean | null;
        }> | null;
      }>;

      const postIds = postRows.map((p) => p.id);
      // Fetch reaction counts
      const { data: reactions } = await supabase
        .from('post_reactions')
        .select('post_id, type')
        .in('post_id', postIds);

      const reactionCounts = new Map<
        string,
        { likes: number; dislikes: number }
      >();
      postIds.forEach((id) => {
        reactionCounts.set(id, { likes: 0, dislikes: 0 });
      });
      reactions?.forEach((r) => {
        const current = reactionCounts.get(r.post_id);
        if (current) {
          if (r.type === 'like') current.likes += 1;
          else if (r.type === 'dislike') current.dislikes += 1;
        }
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

      const items: FeedItem[] = postRows.map((post) => {
        // Get reaction data from Map and destructure
        const reactionEntry = reactionCounts.get(post.id) ?? {
          likes: 0,
          dislikes: 0,
        };
        const { likes, dislikes } = reactionEntry;
        const commentsCount = commentCounts[post.id] ?? 0;

        // Get video data if available
        const video =
          post.video_assets && post.video_assets.length > 0
            ? post.video_assets[0]
            : null;

        const base: FeedItem = {
          id: post.id,
          type: post.post_type === 'video' ? 'video' : 'post',
          title: post.title,
          author: {
            name: post.users?.full_name ?? 'Unknown Author',
            username: post.users?.username ?? 'unknown',
            ...(post.users?.avatar_url
              ? { avatar_url: post.users?.avatar_url }
              : {}),
          },
          published_at: post.published_at ?? new Date().toISOString(),
          stats: {
            likes,
            dislikes,
            comments: commentsCount,
          },
        };

        if (post.content !== null && post.content !== undefined) {
          base.content = post.content;
        }

        const views = (post.metadata as Record<string, number> | undefined)?.[
          'views'
        ];
        if (views !== undefined) {
          base.stats.views = views;
        }

        if (post.thumbnail_url) {
          base.thumbnail_url = post.thumbnail_url;
        }

        // Handle video posts
        if (post.post_type === 'video' && video) {
          // Add duration if available
          if (video.duration !== null && video.duration !== undefined) {
            base.duration = video.duration.toString();
          }

          // Add video metadata
          base.metadata = {
            ...(video.mux_playback_id
              ? { playbackId: video.mux_playback_id }
              : {}),
            status: video.status || 'preparing',
            videoAssetId: video.id,
          };
        } else if (post.post_type === 'video' && post.metadata) {
          // Fallback to metadata field if video_assets not available
          const { duration } = post.metadata as Record<string, string>;
          if (duration !== undefined) {
            base.duration = duration;
          }
        }

        if (post.collectives) {
          base.collective = {
            name: post.collectives.name ?? 'Unknown',
            slug: post.collectives.slug ?? 'unknown',
          };
        }

        return base;
      });

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
