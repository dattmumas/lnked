'use client';

import React, { createContext, useContext, useMemo } from 'react';

import {
  useCollectiveData,
  useCollectiveMetrics,
  useCollectiveFollowStatus,
} from '@/hooks/useCollectiveData';

import type { Collective, CollectiveMetrics } from '@/lib/hooks/profile/types';

interface CollectiveContextValue {
  collective: Collective;
  metrics: CollectiveMetrics;
  isFollowing: boolean;
}

const CollectiveContext = createContext<CollectiveContextValue | null>(null);

export function CollectiveProvider({
  slug,
  children,
}: {
  slug: string;
  children: React.ReactNode;
}) {
  const {
    data: collective,
    isLoading: collectiveLoading,
    error: collectiveError,
  } = useCollectiveData(slug);
  const {
    data: metrics,
    isLoading: metricsLoading,
    error: metricsError,
  } = useCollectiveMetrics(slug);
  const {
    data: followStatus,
    isLoading: followStatusLoading,
    error: followStatusError,
  } = useCollectiveFollowStatus(slug);

  const value = useMemo(() => {
    if (!collective || !metrics || !followStatus) return null;

    return {
      collective,
      metrics,
      isFollowing: followStatus.isFollowing,
    };
  }, [collective, metrics, followStatus]);

  if (collectiveLoading || metricsLoading || followStatusLoading) {
    return <div>Loading...</div>;
  }

  if (collectiveError || metricsError || followStatusError || !value) {
    return <div>Error loading collective data.</div>;
  }

  return (
    <CollectiveContext.Provider value={value}>
      {children}
    </CollectiveContext.Provider>
  );
}

export function useCollectiveContext() {
  const context = useContext(CollectiveContext);
  if (!context) {
    throw new Error(
      'useCollectiveContext must be used within a CollectiveProvider',
    );
  }
  return context;
}
