'use client';
import React, { useState, useMemo } from 'react';
import type { Database } from '@/lib/database.types';
import PostCard from '@/components/app/posts/molecules/PostCard';
import AudioSlider, { AudioPost } from './AudioSlider';
import ContentFilterTabs from './ContentFilterTabs';
import MicrothreadPanel, { MicroPost } from './MicrothreadPanel';

export type PostWithLikes = Database['public']['Tables']['posts']['Row'] & {
  like_count?: number | null;
  dislike_count?: number | null;
  current_user_has_liked?: boolean;
};

type PostWithSlug = PostWithLikes & { collective_slug?: string | null };

interface ProfileFeedProps {
  posts: PostWithSlug[];
  microPosts: MicroPost[];
}

type ContentType = 'articles' | 'videos' | 'audio';

export default function ProfileFeed({ posts, microPosts }: ProfileFeedProps) {
  const [activeTab, setActiveTab] = useState('all');

  const classifyPost = (p: PostWithLikes): ContentType => {
    if (p.content && p.content.includes('<audio')) return 'audio';
    if (p.content && p.content.includes('<iframe')) return 'videos';
    return 'articles';
  };

  const categorized = useMemo(() => {
    return posts.map((p) => ({ ...p, contentType: classifyPost(p) }));
  }, [posts]);

  const pinned = categorized[0];
  const rest = categorized.slice(1);

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
            <PostCard
              post={pinned}
              collectiveSlug={pinned.collective_slug ?? null}
            />
          </div>
        )}
        <div className="grid gap-8">
          {filtered.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              collectiveSlug={post.collective_slug ?? null}
            />
          ))}
        </div>
      </div>
      <MicrothreadPanel posts={microPosts} />
    </div>
  );
}
