import { Plus } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import React from 'react';

import { Button } from '@/components/ui/button';
import { loadPostsData } from '@/lib/data-loaders/posts-loader';
import { createServerSupabaseClient } from '@/lib/supabase/server';

import type { Database } from '@/lib/database.types';

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

// Enable ISR with 2-minute revalidation for posts data
// Posts change frequently, 2 minutes provides good balance
export const revalidate = 120;

// Dynamic rendering for personalized content
export const dynamic = 'force-dynamic';

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
    redirect('/sign-in?redirect=/posts');
  }

  const userId = session.user.id;

  try {
    // Load all posts data using the optimized loader
    const { posts, publishingCollectives, stats } = await loadPostsData(userId);

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
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">My Posts</h1>
          {renderNewPostButton()}
        </div>

        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <div className="bg-white border rounded-lg p-4 text-center shadow-sm">
            <p className="text-3xl font-bold text-gray-800">
              {stats.totalPosts}
            </p>
            <p className="text-gray-600">Total Posts</p>
          </div>
          <div className="bg-white border rounded-lg p-4 text-center shadow-sm">
            <p className="text-3xl font-bold text-green-600">
              {stats.publishedPosts}
            </p>
            <p className="text-gray-600">Published</p>
          </div>
          <div className="bg-white border rounded-lg p-4 text-center shadow-sm">
            <p className="text-3xl font-bold text-yellow-600">
              {stats.draftPosts}
            </p>
            <p className="text-gray-600">Drafts</p>
          </div>
          <div className="bg-white border rounded-lg p-4 text-center shadow-sm">
            <p className="text-3xl font-bold text-blue-600">
              {stats.totalViews.toLocaleString()}
            </p>
            <p className="text-gray-600">Total Views</p>
          </div>
        </div>

        {/* Posts List */}
        <div className="bg-white border rounded-lg shadow-sm">
          {posts.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500 mb-4">
                You haven't created any posts yet.
              </p>
              <Link href="/posts/new" className="text-blue-600 hover:underline">
                Create your first post →
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-2">
                        <a
                          href={`/posts/${post.slug}`}
                          className="hover:text-blue-600 transition-colors"
                        >
                          {post.title}
                        </a>
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            post.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {post.status}
                        </span>
                        <span>{post.view_count} views</span>
                        <span>{post.like_count} likes</span>
                        {post.published_at && (
                          <span>
                            Published{' '}
                            {new Date(post.published_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <a
                        href={`/posts/${post.slug}/edit`}
                        className="text-gray-600 hover:text-blue-600 transition-colors"
                      >
                        Edit
                      </a>
                      <span className="text-gray-300">•</span>
                      <a
                        href={`/posts/${post.slug}`}
                        className="text-gray-600 hover:text-blue-600 transition-colors"
                      >
                        View
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination placeholder */}
        {posts.length > 0 && (
          <div className="mt-6 text-center text-sm text-gray-500">
            Showing {posts.length} of {stats.totalPosts} posts
          </div>
        )}
      </div>
    );
  } catch (error) {
    console.error('Error loading posts page:', error);
    return (
      <div className="p-4">
        <p className="text-red-600">
          Failed to load posts. Please try again later.
        </p>
      </div>
    );
  }
}
