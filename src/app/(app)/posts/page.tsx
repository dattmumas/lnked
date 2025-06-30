import { BarChart, CheckCircle, Edit3, FileText, Plus } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import React from 'react';

import PostRow from '@/app/(app)/posts/PostRow';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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

    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              My Posts
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage and track your content
            </p>
          </div>
          <Button asChild size="default" className="shadow-sm">
            <Link href="/posts/new">
              <Plus className="h-4 w-4 mr-2" /> New Post
            </Link>
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card className="bg-card/80 dark:bg-card/50 border-border/50 hover:border-border/80 transition-all duration-200 hover:shadow-lg">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardDescription>Total Posts</CardDescription>
                <CardTitle className="text-3xl font-bold">
                  {stats.totalPosts}
                </CardTitle>
              </div>
              <div className="p-3 rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
          </Card>
          <Card className="bg-card/80 dark:bg-card/50 border-border/50 hover:border-border/80 transition-all duration-200 hover:shadow-lg">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardDescription>Published</CardDescription>
                <CardTitle className="text-3xl font-bold text-green-600 dark:text-green-500">
                  {stats.publishedPosts}
                </CardTitle>
              </div>
              <div className="p-3 rounded-lg bg-green-600/10">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
            </CardHeader>
          </Card>
          <Card className="bg-card/80 dark:bg-card/50 border-border/50 hover:border-border/80 transition-all duration-200 hover:shadow-lg">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardDescription>Drafts</CardDescription>
                <CardTitle className="text-3xl font-bold text-yellow-600 dark:text-yellow-500">
                  {stats.draftPosts}
                </CardTitle>
              </div>
              <div className="p-3 rounded-lg bg-yellow-600/10">
                <Edit3 className="h-5 w-5 text-yellow-600" />
              </div>
            </CardHeader>
          </Card>
          <Card className="bg-card/80 dark:bg-card/50 border-border/50 hover:border-border/80 transition-all duration-200 hover:shadow-lg">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardDescription>Total Views</CardDescription>
                <CardTitle className="text-3xl font-bold text-blue-600 dark:text-blue-500">
                  {stats.totalViews.toLocaleString()}
                </CardTitle>
              </div>
              <div className="p-3 rounded-lg bg-blue-600/10">
                <BarChart className="h-5 w-5 text-blue-600" />
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* Posts List */}
        <Card className="shadow-sm border-border/50">
          <CardContent className="p-0">
            {posts.length === 0 ? (
              <div className="p-16 text-center">
                <div className="mx-auto w-24 h-24 mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <svg
                    className="h-10 w-10 text-gray-400 dark:text-gray-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                  </svg>
                </div>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  You haven't created any posts yet.
                </p>
                <Button asChild variant="outline">
                  <Link href="/posts/new">Create your first post →</Link>
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {posts.map((post) => (
                  <PostRow key={post.id} post={post} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination placeholder */}
        {posts.length > 0 && (
          <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
            Showing {posts.length} of {stats.totalPosts} posts
          </div>
        )}
      </div>
    );
  } catch (error) {
    console.error('Error loading posts page:', error);
    return (
      <div className="p-4">
        <p className="text-red-600 dark:text-red-400">
          Failed to load posts. Please try again later.
        </p>
      </div>
    );
  }
}
