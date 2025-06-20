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
}

export function FeaturedMedia({
  collectiveSlug,
  className = '',
}: FeaturedMediaProps): React.ReactElement {
  const { data: collective } = useCollectiveData(collectiveSlug);

  const { data: featuredPosts, isLoading } = useQuery({
    queryKey: ['featured-posts', collective?.id],
    queryFn: async () => {
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
            id, title, subtitle, thumbnail_url, post_type, author, published_at
          `,
          )
          .eq('collective_id', collective.id)
          .not('published_at', 'is', undefined)
          .eq('is_public', true)
          .order('published_at', { ascending: false })
          .limit(RECENT_POSTS_LIMIT);

        return recentPosts || [];
      }

      // Get the actual featured posts
      const postIds = featuredData.map((fp) => fp.post_id);
      const { data: posts } = await client
        .from('posts')
        .select(
          `
          id, title, subtitle, thumbnail_url, post_type, author, published_at
        `,
        )
        .in('id', postIds);

      return posts || [];
    },
    enabled: Boolean(collective?.id),
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

  if (isLoading) {
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
                    alt={post.title}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                    {getOverlayIcon(post.post_type)}
                  </div>
                )}

                {/* Overlay icon */}
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="bg-black/60 rounded-full p-3 text-white">
                    {getOverlayIcon(post.post_type)}
                  </div>
                </div>

                {/* Post type badge */}
                <div className="absolute top-3 left-3">
                  <Badge variant="secondary" className="text-xs">
                    {getPostTypeLabel(post.post_type)}
                  </Badge>
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="font-semibold leading-tight line-clamp-2 group-hover:text-accent transition-colors">
                  {post.title}
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
