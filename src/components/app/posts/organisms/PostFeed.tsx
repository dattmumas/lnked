'use client';

import { Loader2 } from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';

import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { cn } from '@/lib/utils';

// Constants for magic numbers
const POSTS_LIMIT = 20;

import { usePostInteractions } from '../hooks/usePostInteractions';
import PostCard from '../molecules/PostCard';

interface Author {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

interface Collective {
  id: string;
  name: string;
  slug: string;
}

interface UnifiedPost {
  id: string;
  title: string;
  content?: string | null;
  meta_description?: string | null;
  thumbnail_url?: string | null;
  slug?: string | null;
  created_at: string;
  post_type: 'text' | 'video';
  metadata?: Record<string, unknown>;
  author: Author;
  collective?: Collective | null;
}

type PostQueryRow = {
  id: string;
  title: string;
  content: string | null;
  meta_description: string | null;
  thumbnail_url: string | null;
  slug: string | null;
  created_at: string;
  post_type: 'text' | 'video';
  metadata: Record<string, unknown> | null;
  author: {
    id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  collective: {
    id: string;
    name: string;
    slug: string;
  } | null;
};

interface PostFeedProps {
  posts?: UnifiedPost[];
  currentUserId?: string;
  showFollowButtons?: boolean;
  className?: string;
  emptyMessage?: string;
  loading?: boolean;
}

// Default empty array to avoid re-creating on each render
const DEFAULT_POSTS: UnifiedPost[] = [];

function PostCardWithInteractions({
  post,
  currentUserId,
  showFollowButtons = false,
}: {
  post: UnifiedPost;
  currentUserId?: string;
  showFollowButtons?: boolean;
}): React.ReactElement {
  const interactions = usePostInteractions({
    postId: post.id,
    userId: currentUserId,
  });

  const handleToggleLike = useCallback((): void => {
    void interactions.toggleLike();
  }, [interactions]);

  const handleToggleDislike = useCallback((): void => {
    void interactions.toggleDislike();
  }, [interactions]);

  const handleToggleBookmark = useCallback((): void => {
    void interactions.toggleBookmark();
  }, [interactions]);

  return (
    <PostCard
      post={post}
      interactions={interactions.interactions}
      onToggleLike={handleToggleLike}
      onToggleDislike={handleToggleDislike}
      onToggleBookmark={handleToggleBookmark}
      currentUserId={currentUserId}
      showFollowButton={showFollowButtons}
      className="h-full"
    />
  );
}

export default function PostFeed({
  posts = DEFAULT_POSTS,
  currentUserId,
  showFollowButtons = false,
  className,
  emptyMessage = 'No posts found',
  loading = false,
}: PostFeedProps): React.ReactElement {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading posts...</p>
        </div>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-muted-foreground">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6',
        className,
      )}
    >
      {posts.map((post) => (
        <PostCardWithInteractions
          key={post.id}
          post={post}
          currentUserId={currentUserId}
          showFollowButtons={showFollowButtons}
        />
      ))}
    </div>
  );
}

// Hook for fetching posts data
export function usePostFeed(_userId?: string): {
  posts: UnifiedPost[];
  loading: boolean;
  error: string | undefined;
  refetch: () => void;
} {
  const [posts, setPosts] = useState<UnifiedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);

  const supabase = createSupabaseBrowserClient();

  useEffect((): void => {
    const fetchPosts = async (): Promise<void> => {
      try {
        setLoading(true);
        setError(undefined);

        // Fetch posts with author and collective information
        const { data, error: fetchError } = await supabase
          .from('posts')
          .select(
            `
            id,
            title,
            content,
            meta_description,
            thumbnail_url,
            slug,
            created_at,
            post_type,
            metadata,
            author:users!author_id (
              id,
              username,
              full_name,
              avatar_url
            ),
            collective:collectives!collective_id (
              id,
              name,
              slug
            )
          `,
          )
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(POSTS_LIMIT);

        if (fetchError) {
          throw fetchError;
        }

        // Transform the data to match our interface
        const rows: PostQueryRow[] = (data ?? []) as unknown as PostQueryRow[];
        const transformedPosts: UnifiedPost[] = rows.map((post) => ({
          id: post.id,
          title: post.title,
          content: post.content,
          meta_description: post.meta_description,
          thumbnail_url: post.thumbnail_url,
          slug: post.slug,
          created_at: post.created_at,
          post_type:
            post.post_type !== undefined && post.post_type !== null
              ? post.post_type
              : 'text',
          metadata: post.metadata ?? undefined,
          author: {
            id:
              post.author?.id !== undefined &&
              post.author?.id !== null &&
              post.author.id.length > 0
                ? post.author.id
                : '',
            username:
              post.author?.username !== undefined &&
              post.author?.username !== null &&
              post.author.username.length > 0
                ? post.author.username
                : null,
            full_name:
              post.author?.full_name !== undefined &&
              post.author?.full_name !== null &&
              post.author.full_name.length > 0
                ? post.author.full_name
                : null,
            avatar_url:
              post.author?.avatar_url !== undefined &&
              post.author?.avatar_url !== null &&
              post.author.avatar_url.length > 0
                ? post.author.avatar_url
                : null,
          },
          collective:
            post.collective !== undefined && post.collective !== null
              ? {
                  id: post.collective.id,
                  name: post.collective.name,
                  slug: post.collective.slug,
                }
              : null,
        }));

        setPosts(transformedPosts);
      } catch (err: unknown) {
        console.error('Error fetching posts:', err);
        setError('Failed to load posts');
      } finally {
        setLoading(false);
      }
    };

    void fetchPosts();
  }, [supabase]);

  const refetch = useCallback((): void => {
    setLoading(true);
    // Re-trigger the effect by updating a dependency
  }, []);

  return {
    posts,
    loading,
    error,
    refetch,
  };
}
