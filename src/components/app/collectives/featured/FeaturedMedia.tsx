'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { Play, BookOpen, Headphones } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useCollectiveData } from '@/hooks/collectives/useCollectiveData';

interface FeaturedMediaProps {
  collectiveSlug: string;
  className?: string;
}

interface FeaturedPost {
  id: string;
  title: string;
  subtitle: string | null;
  thumbnail_url: string | null;
  post_type: 'text' | 'video';
  author: string | null;
  published_at: string | null;
}

export function FeaturedMedia({
  collectiveSlug,
  className = '',
}: FeaturedMediaProps) {
  const { data: collective } = useCollectiveData(collectiveSlug);

  const { data: featuredPosts, isLoading } = useQuery({
    queryKey: ['featured-posts', collective?.id],
    queryFn: async () => {
      if (!collective?.id) return [];

      const supabase = createSupabaseBrowserClient();

      // Get featured posts for this collective
      const { data: featuredData } = await supabase
        .from('featured_posts')
        .select('post_id, display_order')
        .eq('owner_id', collective.id)
        .eq('owner_type', 'collective')
        .order('display_order', { ascending: true })
        .limit(2);

      if (!featuredData || featuredData.length === 0) {
        // Fallback to recent posts if no featured posts
        const { data: recentPosts } = await supabase
          .from('posts')
          .select(
            `
            id, title, subtitle, thumbnail_url, post_type, author, published_at
          `,
          )
          .eq('collective_id', collective.id)
          .not('published_at', 'is', null)
          .eq('is_public', true)
          .order('published_at', { ascending: false })
          .limit(2);

        return recentPosts || [];
      }

      // Get the actual featured posts
      const postIds = featuredData.map((fp) => fp.post_id);
      const { data: posts } = await supabase
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

  const getOverlayIcon = (postType: string) => {
    switch (postType) {
      case 'video':
        return <Play className="h-8 w-8" />;
      case 'audio':
        return <Headphones className="h-8 w-8" />;
      default:
        return <BookOpen className="h-8 w-8" />;
    }
  };

  const getPostTypeLabel = (postType: string) => {
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
          {Array.from({ length: 2 }).map((_, i) => (
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

  if (!featuredPosts || featuredPosts.length === 0) {
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
                {post.thumbnail_url ? (
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

                {post.subtitle && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                    {post.subtitle}
                  </p>
                )}

                <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                  {post.author && <span>by {post.author}</span>}
                  {post.published_at && (
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
