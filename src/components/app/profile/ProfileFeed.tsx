'use client';
import { Heart } from 'lucide-react';
import Link from 'next/link';
import React, { useState, useMemo, useTransition } from 'react';

import { truncateText } from '@/components/app/posts/molecules/PostCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import AudioSlider, { AudioPost } from './AudioSlider';
import ContentFilterTabs from './ContentFilterTabs';
import MicrothreadPanel, { MicroPost } from './MicrothreadPanel';

import type { Database } from '@/lib/database.types';

export type PostWithLikes = Database['public']['Tables']['posts']['Row'] & {
  like_count?: number | null;
  dislike_count?: number | null;
  current_user_has_liked?: boolean;
};

type PostWithSlug = PostWithLikes & {
  collective_slug?: string | null;
  slug?: string | null;
};

interface ProfileFeedProps {
  posts: PostWithSlug[];
  pinnedPost?: PostWithSlug | null;
  microPosts: MicroPost[];
}

type ContentType = 'articles' | 'videos' | 'audio';

// Legacy PostCard component for backward compatibility
function PostCard({
  post,
  collectiveSlug,
}: {
  post: PostWithSlug;
  collectiveSlug: string | undefined;
}): React.ReactElement {
  const [isPending] = useTransition();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [optimisticLikeCount, setOptimisticLikeCount] = useState(
    post.like_count !== undefined && post.like_count !== null
      ? post.like_count
      : 0,
  );
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [optimisticUserHasLiked, setOptimisticUserHasLiked] = useState(
    post.current_user_has_liked !== undefined &&
      post.current_user_has_liked !== null
      ? post.current_user_has_liked
      : false,
  );

  const formattedDate =
    post.created_at !== undefined &&
    post.created_at !== null &&
    post.created_at.length > 0
      ? new Date(post.created_at).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : 'Date not available';

  const postUrl =
    post.slug !== undefined && post.slug !== null && post.slug.length > 0
      ? `/posts/${post.slug}`
      : collectiveSlug !== undefined &&
          collectiveSlug !== null &&
          collectiveSlug.length > 0
        ? `/collectives/${collectiveSlug}/${post.id}`
        : `/posts/${post.id}`;

  return (
    <article className="bg-card border border-border rounded-xl shadow-sm p-6 transition-all duration-200 hover:ring-2 hover:ring-primary hover:scale-[1.02] flex flex-col">
      <Link href={postUrl} className="group mb-auto">
        <h2 className="text-2xl font-bold mb-2 group-hover:text-accent transition-colors">
          {post.title}
        </h2>
      </Link>

      <p className="text-xs sm:text-sm text-muted-foreground mb-3">
        Published on {formattedDate}
      </p>

      <div className="prose dark:prose-invert max-w-none mb-4 text-sm sm:text-base flex-grow">
        <p>{truncateText(post.content)}</p>
      </div>

      <div className="flex items-center justify-between mt-auto pt-4 border-t border-border">
        <Link
          href={postUrl}
          className="text-sm font-medium text-accent hover:underline"
        >
          Read more &rarr;
        </Link>

        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            disabled={isPending}
            aria-label={optimisticUserHasLiked ? 'Unlike post' : 'Like post'}
            className="rounded-full"
          >
            <Heart
              className={`w-5 h-5 ${
                optimisticUserHasLiked
                  ? 'fill-accent text-accent'
                  : 'text-muted-foreground/40'
              }`}
            />
          </Button>
          <span className="text-sm text-muted-foreground tabular-nums">
            {optimisticLikeCount} {optimisticLikeCount === 1 ? 'like' : 'likes'}
          </span>
        </div>
      </div>
    </article>
  );
}

export default function ProfileFeed({
  posts,
  pinnedPost,
  microPosts,
}: ProfileFeedProps): React.ReactElement {
  const [activeTab, setActiveTab] = useState('all');

  const classifyPost = (p: PostWithLikes): ContentType => {
    if (
      p.content !== undefined &&
      p.content !== null &&
      p.content.length > 0 &&
      p.content.includes('<audio')
    )
      return 'audio';
    if (
      p.content !== undefined &&
      p.content !== null &&
      p.content.length > 0 &&
      p.content.includes('<iframe')
    )
      return 'videos';
    return 'articles';
  };

  const combinedPosts = useMemo(
    () => (pinnedPost ? [pinnedPost, ...posts] : posts),
    [pinnedPost, posts],
  );

  const categorized = useMemo(() => {
    return combinedPosts.map((p) => ({ ...p, contentType: classifyPost(p) }));
  }, [combinedPosts]);

  const pinned = pinnedPost ? categorized[0] : undefined;
  const rest = pinnedPost ? categorized.slice(1) : categorized;

  const filtered = useMemo(() => {
    if (activeTab === 'all') return rest;
    return rest.filter((p) => p.contentType === activeTab);
  }, [activeTab, rest]);

  const audioPosts = categorized.filter((p) => p.contentType === 'audio');

  return (
    <div className="grid md:grid-cols-[70%_30%] gap-8">
      <div>
        <AudioSlider
          posts={
            audioPosts as (AudioPost & { collective_slug?: string | null })[]
          }
        />
        <ContentFilterTabs active={activeTab} onChange={setActiveTab} />
        {pinned && (
          <div className="mb-6">
            <Badge variant="secondary" className="mb-2">
              Featured
            </Badge>
            <PostCard
              post={pinned}
              collectiveSlug={pinned.collective_slug ?? undefined}
            />
          </div>
        )}
        <div className="grid gap-8">
          {filtered.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              collectiveSlug={post.collective_slug ?? undefined}
            />
          ))}
        </div>
      </div>
      <MicrothreadPanel posts={microPosts} />
    </div>
  );
}
