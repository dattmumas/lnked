import { useQuery } from '@tanstack/react-query';

import { useTenantContext } from '@/providers/TenantProvider';

const TENANT_ANALYTICS_STALE_TIME = 10 * 60 * 1000; // 10 minutes

// Query keys for tenant analytics
export const tenantAnalyticsKeys = {
  all: ['tenant-analytics'] as const,
  tenant: (tenantId: string) => [...tenantAnalyticsKeys.all, 'tenant', tenantId] as const,
  overview: (tenantId: string) => [...tenantAnalyticsKeys.tenant(tenantId), 'overview'] as const,
  activity: (tenantId: string) => [...tenantAnalyticsKeys.tenant(tenantId), 'activity'] as const,
  members: (tenantId: string) => [...tenantAnalyticsKeys.tenant(tenantId), 'members'] as const,
};

export interface TenantOverviewStats {
  member_count: number;
  post_count: number;
  comment_count: number;
  channel_count: number;
  active_members_30d: number;
  new_members_30d: number;
  posts_this_month: number;
  engagement_rate: number;
}

export interface TenantActivityData {
  date: string;
  posts: number;
  comments: number;
  new_members: number;
  active_users: number;
}

export interface TenantMemberStats {
  user_id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  joined_at: string;
  last_active: string | null;
  post_count: number;
  comment_count: number;
}

export interface UseTenantAnalyticsReturn {
  overview: TenantOverviewStats | null;
  activity: TenantActivityData[] | null;
  memberStats: TenantMemberStats[] | null;
  isLoading: boolean;
  error: Error | null;
  refreshAnalytics: () => Promise<void>;
}

/**
 * Hook for tenant analytics and dashboard data
 */
export function useTenantAnalytics(tenantId?: string): UseTenantAnalyticsReturn {
  const { currentTenant } = useTenantContext();
  const effectiveTenantId = tenantId ?? currentTenant?.tenant_id;

  // Fetch overview statistics
  const overviewQuery = useQuery({
    queryKey: tenantAnalyticsKeys.overview(effectiveTenantId ?? ''),
    queryFn: async (): Promise<TenantOverviewStats> => {
      if (!effectiveTenantId) {
        throw new Error('No tenant context available');
      }

      const response = await fetch(`/api/tenants/${effectiveTenantId}/analytics/overview`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to fetch overview' })) as { message?: string };
        throw new Error(error.message ?? 'Failed to fetch tenant overview');
      }

      const data = await response.json();
      return data.data;
    },
    enabled: Boolean(effectiveTenantId),
    staleTime: TENANT_ANALYTICS_STALE_TIME,
  });

  // Fetch activity data (last 30 days)
  const activityQuery = useQuery({
    queryKey: tenantAnalyticsKeys.activity(effectiveTenantId ?? ''),
    queryFn: async (): Promise<TenantActivityData[]> => {
      if (!effectiveTenantId) {
        throw new Error('No tenant context available');
      }

      const response = await fetch(`/api/tenants/${effectiveTenantId}/analytics/activity`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to fetch activity' })) as { message?: string };
        throw new Error(error.message ?? 'Failed to fetch tenant activity');
      }

      const data = await response.json();
      return data.data;
    },
    enabled: Boolean(effectiveTenantId),
    staleTime: TENANT_ANALYTICS_STALE_TIME,
  });

  // Fetch member statistics
  const memberStatsQuery = useQuery({
    queryKey: tenantAnalyticsKeys.members(effectiveTenantId ?? ''),
    queryFn: async (): Promise<TenantMemberStats[]> => {
      if (!effectiveTenantId) {
        throw new Error('No tenant context available');
      }

      const response = await fetch(`/api/tenants/${effectiveTenantId}/analytics/members`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to fetch member stats' })) as { message?: string };
        throw new Error(error.message ?? 'Failed to fetch member statistics');
      }

      const data = await response.json();
      return data.data;
    },
    enabled: Boolean(effectiveTenantId),
    staleTime: TENANT_ANALYTICS_STALE_TIME,
  });

  const refreshAnalytics = async () => {
    await Promise.all([
      overviewQuery.refetch(),
      activityQuery.refetch(),
      memberStatsQuery.refetch(),
    ]);
  };

  return {
    overview: overviewQuery.data || null,
    activity: activityQuery.data || null,
    memberStats: memberStatsQuery.data || null,
    isLoading: overviewQuery.isLoading || activityQuery.isLoading || memberStatsQuery.isLoading,
    error: overviewQuery.error || activityQuery.error || memberStatsQuery.error,
    refreshAnalytics,
  };
}

/**
 * Hook for simplified tenant overview (for dashboard widgets)
 */
export function useTenantOverview(tenantId?: string) {
  const { currentTenant } = useTenantContext();
  const effectiveTenantId = tenantId ?? currentTenant?.tenant_id;

  return useQuery({
    queryKey: tenantAnalyticsKeys.overview(effectiveTenantId ?? ''),
    queryFn: async (): Promise<TenantOverviewStats> => {
      if (!effectiveTenantId) {
        throw new Error('No tenant context available');
      }

      const response = await fetch(`/api/tenants/${effectiveTenantId}/analytics/overview`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to fetch overview' })) as { message?: string };
        throw new Error(error.message ?? 'Failed to fetch tenant overview');
      }

      const data = await response.json();
      return data.data;
    },
    enabled: Boolean(effectiveTenantId),
    staleTime: TENANT_ANALYTICS_STALE_TIME,
  });
} 