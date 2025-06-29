import { Loader2 } from 'lucide-react';
import { redirect } from 'next/navigation';
import React, { Suspense } from 'react';

import {
  loadUserFeed,
  loadUserTenants,
  getUserPersonalTenant,
} from '@/lib/data-loaders/feed-loader';
import { createServerSupabaseClient } from '@/lib/supabase/server';

import HomePageClient from './HomePageClient';

import type { FeedItem } from '@/types/home/types';

// Force dynamic rendering to ensure fresh data
export const dynamic = 'force-dynamic';

// Loading component for Suspense boundaries
function LoadingSpinner(): React.JSX.Element {
  return (
    <div className="flex justify-center items-center min-h-[400px]">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );
}

export default async function HomePage(): Promise<React.JSX.Element> {
  const supabase = await createServerSupabaseClient();

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/sign-in?redirect=/home');
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
    console.error('Error loading home page data:', error);

    // Fallback to client-side loading if server fetch fails
    return <HomePageClient />;
  }
}
