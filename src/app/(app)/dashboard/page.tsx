import {
  BookOpen,
  Rss,
  Plus,
  AlertCircle,
  Info,
  List,
  Video,
} from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import React from 'react';

import { default as RecentPostRowComponent } from '@/components/app/dashboard/organisms/RecentPostRow';
import StatsRow from '@/components/app/dashboard/organisms/StatsRow';
import { Button } from '@/components/primitives/Button';
import { Card } from '@/components/primitives/Card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { loadDashboardData } from '@/lib/data-loaders/dashboard-loader';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const MAX_RECENT_PERSONAL_POSTS_DISPLAY = 3;

// Enable ISR with 5-minute revalidation for dashboard data
// Dashboard data changes moderately, 5 minutes provides good balance
export const revalidate = 300;

// Dynamic rendering for personalized content
export const dynamic = 'force-dynamic';

export default async function DashboardManagementPage(): Promise<React.ReactElement> {
  const supabase = await createServerSupabaseClient();

  // Get session to retrieve user reliably
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    redirect('/sign-in?redirect=/dashboard');
  }

  // Load all dashboard data using the optimized loader
  const dashboardData = await loadDashboardData(session.user.id);

  const {
    profile,
    stats,
    recent_posts: personalPosts,
    owned_collectives: ownedCollectives,
  } = dashboardData;

  const username =
    (profile?.username ?? '').trim().length > 0
      ? (profile?.username ?? '')
      : '';

  return (
    <div className="pattern-stack gap-section">
      {/* Enhanced Stats Row with design system integration */}
      <StatsRow
        subscriberCount={stats.subscriber_count}
        followerCount={stats.follower_count}
        totalPosts={stats.total_posts}
        collectiveCount={stats.collective_count}
        totalViews={stats.total_views}
        totalLikes={stats.total_likes}
        monthlyRevenue={stats.monthly_revenue}
        pendingPayout={stats.pending_payout}
        openRate="0%" // TODO: Implement when email tracking is ready
        publishedThisMonth={stats.published_this_month}
      />

      {/* Enhanced main content sections with improved grid */}
      <div className="content-grid-dashboard">
        {/* Individual Newsletter - Enhanced with design tokens */}
        <Card size="lg" className="pattern-card micro-interaction">
          <div className="pattern-stack">
            {/* Enhanced header with better typography */}
            <div className="flex items-center gap-component">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-surface-elevated-2 border border-border-subtle">
                <Rss className="h-5 w-5 text-content-accent" />
              </div>
              <div>
                <h2 className="text-content-primary font-semibold text-lg tracking-tight">
                  My Content
                </h2>
                <p className="text-content-secondary text-sm">
                  Personal posts and articles
                </p>
              </div>
            </div>

            {/* Enhanced action buttons with improved spacing */}
            <div className="flex flex-wrap gap-component">
              <Button
                variant="default"
                size="sm"
                leftIcon={<Plus className="h-4 w-4" />}
                className="micro-interaction btn-scale"
                asChild
              >
                <Link href="/posts/new">Write New Post</Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Video className="h-4 w-4" />}
                className="micro-interaction nav-hover"
                asChild
              >
                <Link href="/videos">Video Management</Link>
              </Button>
              {username.trim().length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="micro-interaction nav-hover"
                  asChild
                >
                  <Link href={`/profile/${username}`}>View Profile</Link>
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="micro-interaction nav-hover"
                asChild
              >
                <Link href="/dashboard/my-newsletter/subscribers">
                  Subscribers
                </Link>
              </Button>
            </div>

            {/* Enhanced posts display */}
            {personalPosts !== null &&
            personalPosts !== undefined &&
            Array.isArray(personalPosts) &&
            personalPosts.length > 0 ? (
              <Card
                size="md"
                className="pattern-card border border-border-subtle"
              >
                <div className="divide-y divide-border-subtle">
                  {personalPosts
                    .slice(0, MAX_RECENT_PERSONAL_POSTS_DISPLAY)
                    .map((post) => (
                      <RecentPostRowComponent
                        key={post.id}
                        id={post.id}
                        title={post.title}
                        status={post.is_public ? 'published' : 'draft'}
                        date={post.published_at ?? post.created_at}
                      />
                    ))}
                </div>
              </Card>
            ) : (
              <Alert className="pattern-card border-border-subtle bg-surface-elevated-1">
                <Info className="h-4 w-4 text-content-accent" />
                <AlertTitle className="text-content-primary">
                  No Personal Posts Yet
                </AlertTitle>
                <AlertDescription className="text-content-secondary">
                  You haven&apos;t written any personal posts. Click &quot;Write
                  New Post&quot; to get started!
                </AlertDescription>
              </Alert>
            )}

            {/* Enhanced view all button */}
            {personalPosts !== null &&
              personalPosts !== undefined &&
              Array.isArray(personalPosts) &&
              personalPosts.length > MAX_RECENT_PERSONAL_POSTS_DISPLAY && (
                <div className="text-center">
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<List className="h-4 w-4" />}
                    className="micro-interaction nav-hover"
                    asChild
                  >
                    <Link href="/dashboard/posts">View All My Posts</Link>
                  </Button>
                </div>
              )}
          </div>
        </Card>

        {/* Owned Collectives - Enhanced with design tokens */}
        <Card size="lg" className="pattern-card micro-interaction">
          <div className="pattern-stack">
            {/* Enhanced header with better typography */}
            <div className="flex items-center gap-component">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-surface-elevated-2 border border-border-subtle">
                <BookOpen className="h-5 w-5 text-content-accent" />
              </div>
              <div>
                <h2 className="text-content-primary font-semibold text-lg tracking-tight">
                  My Owned Collectives
                </h2>
                <p className="text-content-secondary text-sm">
                  Communities you manage
                </p>
              </div>
            </div>

            {/* Enhanced create button */}
            <Button
              variant="default"
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              className="micro-interaction btn-scale w-fit"
              asChild
            >
              <Link href="/collectives/new">Create Collective</Link>
            </Button>

            {/* Enhanced collectives display */}
            {ownedCollectives !== null &&
            ownedCollectives !== undefined &&
            Array.isArray(ownedCollectives) &&
            ownedCollectives.length > 0 ? (
              <div className="dashboard-grid dashboard-grid-secondary">
                {ownedCollectives.map((collective) => (
                  <Card
                    key={collective.id}
                    size="md"
                    className="pattern-card micro-interaction card-lift flex flex-col"
                  >
                    <div className="pattern-stack flex-1">
                      <div>
                        <h3 className="font-serif text-lg font-semibold text-content-primary truncate">
                          {collective.name}
                        </h3>
                        <p className="text-content-secondary text-sm truncate mt-1">
                          {collective.description !== null &&
                          collective.description !== undefined &&
                          collective.description.trim().length > 0
                            ? collective.description
                            : 'No description'}
                        </p>
                        {collective.member_count !== undefined && (
                          <p className="text-xs text-content-tertiary mt-2">
                            {collective.member_count} members •{' '}
                            {collective.post_count || 0} posts
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        className="w-full micro-interaction btn-scale mt-auto"
                        asChild
                      >
                        <Link href={`/collectives/${collective.slug}`}>
                          View Collective
                        </Link>
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Alert className="pattern-card border-border-subtle bg-surface-elevated-1">
                <AlertCircle className="h-4 w-4 text-content-accent" />
                <AlertTitle className="text-content-primary">
                  No Collectives Yet
                </AlertTitle>
                <AlertDescription className="text-content-secondary">
                  You don&apos;t own any collectives. Click &quot;Create
                  Collective&quot; to start one!
                </AlertDescription>
              </Alert>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
