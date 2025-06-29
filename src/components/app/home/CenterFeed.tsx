'use client';

import { Loader2, RefreshCw, Building, User as UserIcon } from 'lucide-react';
import React, { useState } from 'react';

import { Button } from '@/components/ui/button';
import { usePostFeedInteractions } from '@/hooks/home/usePostFeedInteractions';
import { useTenantFeed } from '@/hooks/home/useTenantFeed';
import { useTenant } from '@/providers/TenantProvider';

import { PostCardWrapper } from './PostCardWrapper';

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

  const { feedItems, isLoading, error, refetch, loadMore, hasMore } =
    useTenantFeed({
      includeCollectives,
      status: 'published',
      limit: 20,
      ...(initialFeedItems ? { initialData: initialFeedItems } : {}),
    });

  const interactions = usePostFeedInteractions(user.id);

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
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10">
        <p className="text-red-500 text-sm mb-2">Error loading feed: {error}</p>
        <Button variant="outline" size="sm" onClick={refetch}>
          <RefreshCw className="w-4 h-4 mr-1" /> Retry
        </Button>
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
      {/* Feed Header removed per user request */}

      {/* Feed Items */}
      {feedItems.map((item) => (
        <PostCardWrapper
          key={item.id}
          item={item}
          interactions={interactions}
        />
      ))}

      {/* Load More Button */}
      {hasMore && (
        <div className="flex justify-center py-4">
          <Button variant="outline" onClick={loadMore} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : null}
            Load More
          </Button>
        </div>
      )}
    </div>
  );
}
