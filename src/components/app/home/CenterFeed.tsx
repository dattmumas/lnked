'use client';

import { Loader2, RefreshCw, Building, User as UserIcon } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useFeedRealtime } from '@/hooks/home/useFeedRealtime';
import { usePostFeedInteractions } from '@/hooks/home/usePostFeedInteractions';
import { useTenantFeed } from '@/hooks/home/useTenantFeed';
import { useVideoStatusRealtime } from '@/hooks/video/useVideoStatusRealtime';
import { useTenant } from '@/providers/TenantProvider';
import { useTenantStore } from '@/stores/tenant-store';

import { FeedVirtuoso } from './FeedVirtuoso';

import type { FeedItem } from '@/types/home/types';
import type { User } from '@supabase/supabase-js';

interface Props {
  user: User;
  initialFeedItems?: FeedItem[];
}

export function CenterFeed({
  user,
  initialFeedItems,
}: Props): React.JSX.Element {
  const {
    currentTenant,
    userTenants,
    isLoading: tenantLoading,
    error: tenantError,
  } = useTenant();
  const [includeCollectives] = useState(true);

  // Get feed scope from tenant store
  const feedScope = useTenantStore((s) => s.feedScope);

  const { feedItems, isLoading, error, hasMore, loadMore } = useTenantFeed({
    limit: 20,
    ...(initialFeedItems ? { initialData: initialFeedItems } : {}),
  });

  const interactions = usePostFeedInteractions(user.id);

  const [errorState, setErrorState] = useState<string | undefined>(
    error || undefined,
  );

  // Set up real-time video status updates
  useVideoStatusRealtime({
    userId: user.id,
    enabled: true,
    onStatusUpdate: (update) => {
      console.log(
        `🎥 [FEED] Video status updated: ${update.id} -> ${update.status}`,
      );
      // The hook automatically updates React Query cache, which will trigger feed refresh
    },
  });

  // Set up real-time feed updates
  const { hasNewPosts, newPostsCount, refreshFeed } = useFeedRealtime({
    tenantId: currentTenant?.tenant_id || '',
    enabled: Boolean(currentTenant?.tenant_id),
    onNewPostsAvailable: (count) => {
      console.log(`📝 New posts available: ${count}`);
    },
  });

  useEffect(() => {
    if (error !== undefined && error !== null) {
      setErrorState(error);
      const timer = setTimeout(() => {
        setErrorState(undefined);
      }, 5000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [error]);

  if (tenantLoading) {
    return (
      <div className="flex justify-center py-10">
        <div className="text-center">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Loading tenant context...</p>
        </div>
      </div>
    );
  }

  if (tenantError) {
    return (
      <div className="text-center py-10">
        <p className="text-red-500 text-sm mb-2">Tenant Error: {tenantError}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.location.reload()}
        >
          <RefreshCw className="w-4 h-4 mr-1" /> Reload
        </Button>
      </div>
    );
  }

  if (currentTenant === null) {
    return (
      <div className="text-center py-10">
        <div className="mb-4">
          <p className="text-sm text-gray-500 mb-2">
            No tenant context available. User has {userTenants?.length || 0}{' '}
            tenants.
          </p>
          <p className="text-xs text-gray-400">
            Debug: {JSON.stringify({ currentTenant, userTenants }, null, 2)}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.location.reload()}
        >
          <RefreshCw className="w-4 h-4 mr-1" /> Reload
        </Button>
      </div>
    );
  }

  if (isLoading && !initialFeedItems) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (errorState) {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <Alert variant="destructive">
          <AlertDescription>{errorState}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (feedItems.length === 0) {
    return (
      <div className="text-center py-10">
        <div className="mb-4">
          {currentTenant !== null ? (
            <div className="flex items-center justify-center gap-2 mb-2">
              {currentTenant.is_personal ? (
                <UserIcon className="w-5 h-5 text-blue-600" />
              ) : (
                <Building className="w-5 h-5 text-purple-600" />
              )}
              <span className="font-medium">{currentTenant.tenant_name}</span>
            </div>
          ) : null}
          <p className="text-sm text-gray-500">
            No posts yet. Create your first post to get started!
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Debug: Tenant ID: {currentTenant?.tenant_id}, Include Collectives:{' '}
            {includeCollectives.toString()}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* New Posts Indicator */}
      {hasNewPosts && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshFeed}
            className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {newPostsCount} new post{newPostsCount !== 1 ? 's' : ''}
          </Button>
        </div>
      )}

      {/* Feed Content */}
      <div className="">
        <FeedVirtuoso
          items={feedItems}
          interactions={interactions}
          loadMore={loadMore}
          hasMore={hasMore}
          windowScroll={true}
        />
      </div>
    </div>
  );
}
