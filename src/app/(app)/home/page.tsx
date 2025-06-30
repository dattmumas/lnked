import { Loader2 } from 'lucide-react';
import { redirect } from 'next/navigation';
import React, { Suspense } from 'react';

import {
  getUserPersonalTenant,
  loadUserFeed,
  loadUserTenants,
} from '@/lib/data-loaders/feed-loader';
import { createServerSupabaseClient } from '@/lib/supabase/server';

import HomePageClient from './HomePageClient';

import type { FeedItem } from '@/types/home/types';

// Enable ISR with 60-second revalidation for feed data
// Feed content changes frequently but 1 minute cache provides good balance
export const revalidate = 60;

// Dynamic rendering for personalized content
export const dynamic = 'force-dynamic';

// Loading component for Suspense boundaries
function LoadingSpinner(): React.JSX.Element {
  return (
    <div className="flex justify-center items-center min-h-[400px]">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );
}

export default async function HomePage(): Promise<React.ReactElement> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user === null) {
    redirect('/sign-in');
  }

  try {
    // Fetch user data in parallel for optimal performance
    const [tenants, personalTenantId] = await Promise.all([
      loadUserTenants(user.id),
      getUserPersonalTenant(user.id),
    ]);

    // Pre-fetch initial feed data if we have a personal tenant
    let initialFeedItems: FeedItem[] = [];
    if (personalTenantId) {
      initialFeedItems = await loadUserFeed(user.id, personalTenantId, {
        limit: 20,
        includeCollectives: true,
        includeFollowed: true,
        status: 'published',
      });
    }

    return (
      <Suspense fallback={<LoadingSpinner />}>
        <HomePageClient
          user={user}
          initialFeedItems={initialFeedItems}
          initialTenants={tenants}
          personalTenantId={personalTenantId}
        />
      </Suspense>
    );
  } catch (error) {
    console.error('Error loading homepage data:', error);
    // Return with empty data on error - client will fetch
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <HomePageClient
          user={user}
          initialFeedItems={[]}
          initialTenants={[]}
          personalTenantId={null}
        />
      </Suspense>
    );
  }
}
