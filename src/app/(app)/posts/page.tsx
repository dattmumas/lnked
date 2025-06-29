import { Plus } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import React from 'react';

import DashboardPostsTable from '@/components/app/dashboard/posts/DashboardPostsTable';
import { Button } from '@/components/ui/button';
import { createServerSupabaseClient } from '@/lib/supabase/server';

import type { Database, Enums } from '@/lib/database.types';

// Use a type alias for DashboardPost
export type DashboardPost = Database['public']['Tables']['posts']['Row'] & {
  collective?: { id: string; name: string; slug: string } | null;
  post_reactions?: { count: number; type?: string }[] | null;
  likeCount?: number;
  isFeatured?: boolean;
  video?: { id: string; title: string | null } | null;
};

// Type for collectives user can post to
type PublishingTargetCollective = Pick<
  Database['public']['Tables']['collectives']['Row'],
  'id' | 'name' | 'slug'
>;

type VideoAsset = Pick<
  Database['public']['Tables']['video_assets']['Row'],
  'id' | 'title'
>;

export default async function MyPostsPage(): Promise<React.ReactElement> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { session },
    error: authErrorSession,
  } = await supabase.auth.getSession();

  if (
    authErrorSession !== null ||
    session === null ||
    session === undefined ||
    session.user === null ||
    session.user === undefined
  ) {
    redirect('/sign-in');
  }

  const userId = session.user.id;

  // Fetch all posts authored by the user (personal and collective)
  const { data: posts, error: postsError } = await supabase
    .from('posts')
    .select(
      `
      *,
      collective:collectives!collective_id(id, name, slug),
      post_reactions:post_reactions!post_id(count)
    `,
    )
    .eq('author_id', userId)
    .neq('status', 'removed')
    .order('created_at', { ascending: false });

  // Fetch videos created by the user to map video posts
  const { data: videos, error: videosError } = await supabase
    .from('video_assets')
    .select('id, title')
    .eq('created_by', userId);

  if (videosError) {
    console.error('Error fetching videos:', videosError.message);
  }

  // Fetch collectives the user owns
  const { data: ownedCollectives, error: ownedError } = await supabase
    .from('collectives')
    .select('id, name, slug')
    .eq('owner_id', userId)
    .order('name', { ascending: true });

  // Fetch collectives the user is a member of (editor or author roles might be relevant for posting)
  const { data: memberCollectivesData, error: memberError } = await supabase
    .from('collective_members')
    .select('role, collective:collectives!inner(id, name, slug)')
    .eq('member_id', userId)
    .in('role', [
      'admin',
      'editor',
      'author',
    ] as Enums<'collective_member_role'>[])
    .order('collective(name)', { ascending: true });

  if (postsError !== null || ownedError !== null || memberError !== null) {
    console.error('Error fetching data for My Posts page:', {
      postsError: JSON.stringify(postsError, null, 2),
      ownedError: JSON.stringify(ownedError, null, 2),
      memberError: JSON.stringify(memberError, null, 2),
    });
    return <div className="p-4">Failed to load page data.</div>;
  }

  const publishingCollectives: PublishingTargetCollective[] = [];
  const addedCollectiveIds = new Set<string>();

  if (
    ownedCollectives !== null &&
    ownedCollectives !== undefined &&
    Array.isArray(ownedCollectives)
  ) {
    ownedCollectives.forEach((c: PublishingTargetCollective) => {
      if (!addedCollectiveIds.has(c.id)) {
        publishingCollectives.push(c);
        addedCollectiveIds.add(c.id);
      }
    });
  }
  if (
    memberCollectivesData !== null &&
    memberCollectivesData !== undefined &&
    Array.isArray(memberCollectivesData)
  ) {
    memberCollectivesData.forEach(
      (membership: { collective?: PublishingTargetCollective }) => {
        if (
          membership.collective !== null &&
          membership.collective !== undefined &&
          !addedCollectiveIds.has(membership.collective.id)
        ) {
          publishingCollectives.push(membership.collective);
          addedCollectiveIds.add(membership.collective.id);
        }
      },
    );
  }

  const { data: featuredPosts, error: featuredError } = await supabase
    .from('featured_posts')
    .select('post_id')
    .eq('owner_id', userId)
    .eq('owner_type', 'user');

  if (featuredError) {
    console.error('Error fetching featured posts:', featuredError.message);
  }

  const featuredIds = new Set(
    (featuredPosts ?? []).map((fp: { post_id: string }) => fp.post_id),
  );

  // Create a mapping of video post titles to video IDs
  const videoMap = new Map<string, { id: string; title: string | null }>();
  if (videos !== null && videos !== undefined && Array.isArray(videos)) {
    (videos as VideoAsset[]).forEach(({ id, title }) => {
      // Match the title pattern used in getOrCreatePostForVideo
      const videoPostTitle = `Video: ${(title ?? '').trim() || id}`;
      videoMap.set(videoPostTitle, { id, title });
    });
  }

  // Map posts to include likeCount and video information
  const postsWithLikeCount = (posts as DashboardPost[]).map(
    (post: DashboardPost) => {
      const video = videoMap.get(post.title);
      const transformedPost: DashboardPost = {
        ...post,
        likeCount: post.like_count || 0,
        isFeatured: featuredIds.has(post.id),
        ...(video ? { video } : { video: null }),
        post_reactions: post.post_reactions || [],
      };
      return transformedPost;
    },
  );

  const renderNewPostButton = (): React.ReactElement => {
    return (
      <Button asChild size="sm" className="w-full md:w-auto">
        <Link href="/posts/new">
          <Plus className="h-4 w-4 mr-2" /> New Post
        </Link>
      </Button>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end mb-4">{renderNewPostButton()}</div>
      <DashboardPostsTable
        posts={postsWithLikeCount}
        queryKey={['dashboard-posts', userId]}
      />
    </div>
  );
}
