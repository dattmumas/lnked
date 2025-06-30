'use client';

import { useQuery } from '@tanstack/react-query';
import { Play, BookOpen, Headphones } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import React from 'react';

import { Badge } from '@/components/ui/badge';
import { useCollectiveData } from '@/hooks/collectives/useCollectiveData';
import supabase from '@/lib/supabase/browser';

// Constants
const FEATURED_POSTS_LIMIT = 2;
const RECENT_POSTS_LIMIT = 2;

interface FeaturedMediaProps {
  collectiveSlug: string;
  className?: string;
  initialFeaturedPosts?: TransformedPost[] | undefined;
}

// 🎓 Shared Types: Export interfaces for use across SSR components
export interface TransformedPost {
  id: string;
  title: string | null; // Database allows null titles
  subtitle: string | null;
  thumbnail_url: string | null;
  post_type: string | null; // Database has various post types
  published_at: string | null;
  author: string | null;
}

export function FeaturedMedia({
  collectiveSlug,
  className = '',
  initialFeaturedPosts,
}: FeaturedMediaProps): React.ReactElement {
  const { data: collective } = useCollectiveData(collectiveSlug);

  const { data: featuredPosts, isLoading } = useQuery({
    queryKey: ['featured-posts', collective?.id],
    queryFn: async (): Promise<TransformedPost[]> => {
      if (
        collective?.id === undefined ||
        collective.id === null ||
        collective.id.length === 0
      )
        return [];

      const client = supabase;

      // Get featured posts for this collective
      const { data: featuredData } = await client
        .from('featured_posts')
        .select('post_id, display_order')
        .eq('owner_id', collective.id)
        .eq('owner_type', 'collective')
        .order('display_order', { ascending: true })
        .limit(FEATURED_POSTS_LIMIT);

      if (
        featuredData === undefined ||
        featuredData === null ||
        featuredData.length === 0
      ) {
        // Fallback to recent posts if no featured posts
        const { data: recentPosts } = await client
          .from('posts')
          .select(
            `
            id, title, subtitle, thumbnail_url, post_type, 
            author_profile:users!author_id(id, username, full_name, avatar_url),
            published_at
          `,
          )
          .eq('collective_id', collective.id)
          .not('published_at', 'is', null)
          .eq('is_public', true)
          .order('published_at', { ascending: false })
          .limit(RECENT_POSTS_LIMIT);

        // Transform data to match expected interface
        return (recentPosts || []).map((post) => ({
          ...post,
          author:
            post.author_profile?.full_name ||
            post.author_profile?.username ||
            null,
        }));
      }

      // Get the actual featured posts
      const postIds = featuredData.map((fp) => fp.post_id);
      const { data: posts } = await client
        .from('posts')
        .select(
          `
          id, title, subtitle, thumbnail_url, post_type,
          author_profile:users!author_id(id, username, full_name, avatar_url),
          published_at
        `,
        )
        .in('id', postIds);

      // Transform data to match expected interface
      return (posts || []).map((post) => ({
        ...post,
        author:
          post.author_profile?.full_name ||
          post.author_profile?.username ||
          null,
      }));
    },
    // 🎓 SSR Pattern: Use server data as initial value
    // This means React will render immediately with server data,
    // then optionally refetch if the data becomes stale
    initialData: initialFeaturedPosts,

    // 🎓 Conditional Querying: Only run client query if we don't have server data
    // This prevents unnecessary API calls when we already have fresh data from SSR
    enabled: Boolean(collective?.id) && !initialFeaturedPosts,

    staleTime: 1000 * 60 * 10, // 10 minutes - server data stays fresh longer
    gcTime: 1000 * 60 * 30, // 30 minutes
  });

  const getOverlayIcon = (postType: string): React.ReactElement => {
    switch (postType) {
      case 'video':
        return <Play className="h-8 w-8" />;
      case 'audio':
        return <Headphones className="h-8 w-8" />;
      default:
        return <BookOpen className="h-8 w-8" />;
    }
  };

  const getPostTypeLabel = (postType: string): string => {
    switch (postType) {
      case 'video':
        return 'Video';
      case 'audio':
        return 'Podcast';
      default:
        return 'Article';
    }
  };

  // 🎓 SSR Loading State: Only show loading if we have no data at all
  // With SSR, we might have initialData immediately, so no loading needed
  // Only show loading if: no initial data AND still loading from client query
  if (isLoading && !initialFeaturedPosts) {
    return (
      <div className={`featured-media-container ${className}`}>
        <h2 className="text-xl font-semibold mb-4">Featured</h2>
        <div className="space-y-4">
          {Array.from({ length: FEATURED_POSTS_LIMIT }).map((_, i) => (
            <div key={i} className="featured-media-card animate-pulse">
              <div className="aspect-video bg-muted rounded-lg"></div>
              <div className="p-4 space-y-2">
                <div className="h-5 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (
    featuredPosts === undefined ||
    featuredPosts === null ||
    featuredPosts.length === 0
  ) {
    return (
      <div className={`featured-media-container ${className}`}>
        <h2 className="text-xl font-semibold mb-4">Featured</h2>
        <div className="text-center py-8 text-muted-foreground">
          No featured content yet
        </div>
      </div>
    );
  }

  return (
    <div className={`featured-media-container ${className}`}>
      <h2 className="text-xl font-semibold mb-4">Featured</h2>

      <div className="space-y-4">
        {featuredPosts.map((post) => (
          <Link
            key={post.id}
            href={`/posts/${post.id}`}
            className="group block"
          >
            <div className="featured-media-card rounded-lg border bg-card shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              {/* Thumbnail with overlay */}
              <div className="relative aspect-video bg-muted">
                {post.thumbnail_url !== undefined &&
                post.thumbnail_url !== null &&
                post.thumbnail_url.length > 0 ? (
                  <Image
                    src={post.thumbnail_url}
                    alt={post.title?.toString() || ''}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                    {getOverlayIcon(post.post_type?.toString() || '')}
                  </div>
                )}

                {/* Overlay icon */}
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="bg-black/60 rounded-full p-3 text-white">
                    {getOverlayIcon(post.post_type?.toString() || '')}
                  </div>
                </div>

                {/* Post type badge */}
                <div className="absolute top-3 left-3">
                  <Badge variant="secondary" className="text-xs">
                    {getPostTypeLabel(post.post_type?.toString() || '')}
                  </Badge>
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="font-semibold leading-tight line-clamp-2 group-hover:text-accent transition-colors">
                  {post.title?.toString() || 'Untitled'}
                </h3>

                {post.subtitle !== undefined &&
                  post.subtitle !== null &&
                  post.subtitle.length > 0 && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                      {post.subtitle}
                    </p>
                  )}

                <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                  {post.author !== undefined &&
                    post.author !== null &&
                    post.author.length > 0 && <span>by {post.author}</span>}
                  {post.published_at !== undefined &&
                    post.published_at !== null &&
                    post.published_at.length > 0 && (
                      <span>
                        {new Date(post.published_at).toLocaleDateString()}
                      </span>
                    )}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
