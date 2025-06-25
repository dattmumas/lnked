import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { useTenantContext } from '@/providers/TenantProvider';

import type { TenantSettingsFormData } from '@/types/tenant.types';

const TENANT_SETTINGS_STALE_TIME = 5 * 60 * 1000; // 5 minutes

// Query keys for tenant settings
export const tenantSettingsKeys = {
  all: ['tenant-settings'] as const,
  tenant: (tenantId: string) => [...tenantSettingsKeys.all, 'tenant', tenantId] as const,
  notifications: (tenantId: string) => [...tenantSettingsKeys.tenant(tenantId), 'notifications'] as const,
  privacy: (tenantId: string) => [...tenantSettingsKeys.tenant(tenantId), 'privacy'] as const,
};

export interface TenantSettings {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_public: boolean;
  type: 'personal' | 'collective';
  member_count: number;
  created_at: string;
  updated_at: string;
}

export interface TenantNotificationSettings {
  email_notifications: boolean;
  push_notifications: boolean;
  mention_notifications: boolean;
  new_member_notifications: boolean;
  channel_activity_notifications: boolean;
  digest_frequency: 'never' | 'daily' | 'weekly';
}

export interface TenantPrivacySettings {
  is_public: boolean;
  allow_discovery: boolean;
  require_approval: boolean;
  member_visibility: 'public' | 'members_only' | 'admins_only';
  content_visibility: 'public' | 'members_only';
}

export interface UseTenantSettingsReturn {
  settings: TenantSettings | null;
  notificationSettings: TenantNotificationSettings | null;
  privacySettings: TenantPrivacySettings | null;
  isLoading: boolean;
  error: Error | null;
  updateSettings: (data: Partial<TenantSettingsFormData>) => Promise<TenantSettings>;
  updateNotificationSettings: (data: Partial<TenantNotificationSettings>) => Promise<TenantNotificationSettings>;
  updatePrivacySettings: (data: Partial<TenantPrivacySettings>) => Promise<TenantPrivacySettings>;
  deleteTenant: () => Promise<void>;
  refreshSettings: () => Promise<unknown>;
}

/**
 * Hook for managing tenant settings
 */
export function useTenantSettings(tenantId?: string): UseTenantSettingsReturn {
  const { currentTenant } = useTenantContext();
  const queryClient = useQueryClient();
  const effectiveTenantId = tenantId ?? currentTenant?.tenant_id;

  // Fetch tenant settings
  const settingsQuery = useQuery({
    queryKey: tenantSettingsKeys.tenant(effectiveTenantId ?? ''),
    queryFn: async (): Promise<TenantSettings> => {
      if (!effectiveTenantId) {
        throw new Error('No tenant context available');
      }

      const response = await fetch(`/api/tenants/${effectiveTenantId}/settings`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to fetch settings' })) as { message?: string };
        throw new Error(error.message ?? 'Failed to fetch tenant settings');
      }

      const data = await response.json();
      return data.data;
    },
    enabled: Boolean(effectiveTenantId),
    staleTime: TENANT_SETTINGS_STALE_TIME,
  });

  // Fetch notification settings
  const notificationQuery = useQuery({
    queryKey: tenantSettingsKeys.notifications(effectiveTenantId ?? ''),
    queryFn: async (): Promise<TenantNotificationSettings> => {
      if (!effectiveTenantId) {
        throw new Error('No tenant context available');
      }

      const response = await fetch(`/api/tenants/${effectiveTenantId}/settings/notifications`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to fetch notification settings' })) as { message?: string };
        throw new Error(error.message ?? 'Failed to fetch notification settings');
      }

      const data = await response.json();
      return data.data;
    },
    enabled: Boolean(effectiveTenantId),
    staleTime: TENANT_SETTINGS_STALE_TIME,
  });

  // Fetch privacy settings
  const privacyQuery = useQuery({
    queryKey: tenantSettingsKeys.privacy(effectiveTenantId ?? ''),
    queryFn: async (): Promise<TenantPrivacySettings> => {
      if (!effectiveTenantId) {
        throw new Error('No tenant context available');
      }

      const response = await fetch(`/api/tenants/${effectiveTenantId}/settings/privacy`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to fetch privacy settings' })) as { message?: string };
        throw new Error(error.message ?? 'Failed to fetch privacy settings');
      }

      const data = await response.json();
      return data.data;
    },
    enabled: Boolean(effectiveTenantId),
    staleTime: TENANT_SETTINGS_STALE_TIME,
  });

  // Update general settings
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: Partial<TenantSettingsFormData>): Promise<TenantSettings> => {
      if (!effectiveTenantId) {
        throw new Error('No tenant context available');
      }

      const response = await fetch(`/api/tenants/${effectiveTenantId}/settings`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to update settings' })) as { message?: string };
        throw new Error(error.message ?? 'Failed to update tenant settings');
      }

      const result = await response.json();
      return result.data;
    },
    onSuccess: (updatedSettings) => {
      // Update cache
      queryClient.setQueryData(
        tenantSettingsKeys.tenant(effectiveTenantId ?? ''),
        updatedSettings
      );
      
      // Invalidate user tenants cache to update tenant list
      void queryClient.invalidateQueries({
        queryKey: ['user-tenants'],
      });
    },
  });

  // Update notification settings
  const updateNotificationsMutation = useMutation({
    mutationFn: async (data: Partial<TenantNotificationSettings>): Promise<TenantNotificationSettings> => {
      if (!effectiveTenantId) {
        throw new Error('No tenant context available');
      }

      const response = await fetch(`/api/tenants/${effectiveTenantId}/settings/notifications`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to update notification settings' })) as { message?: string };
        throw new Error(error.message ?? 'Failed to update notification settings');
      }

      const result = await response.json();
      return result.data;
    },
    onSuccess: (updatedSettings) => {
      // Update cache
      queryClient.setQueryData(
        tenantSettingsKeys.notifications(effectiveTenantId ?? ''),
        updatedSettings
      );
    },
  });

  // Update privacy settings
  const updatePrivacyMutation = useMutation({
    mutationFn: async (data: Partial<TenantPrivacySettings>): Promise<TenantPrivacySettings> => {
      if (!effectiveTenantId) {
        throw new Error('No tenant context available');
      }

      const response = await fetch(`/api/tenants/${effectiveTenantId}/settings/privacy`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to update privacy settings' })) as { message?: string };
        throw new Error(error.message ?? 'Failed to update privacy settings');
      }

      const result = await response.json();
      return result.data;
    },
    onSuccess: (updatedSettings) => {
      // Update cache
      queryClient.setQueryData(
        tenantSettingsKeys.privacy(effectiveTenantId ?? ''),
        updatedSettings
      );
    },
  });

  // Delete tenant
  const deleteTenantMutation = useMutation({
    mutationFn: async (): Promise<void> => {
      if (!effectiveTenantId) {
        throw new Error('No tenant context available');
      }

      const response = await fetch(`/api/tenants/${effectiveTenantId}/settings`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to delete tenant' })) as { message?: string };
        throw new Error(error.message ?? 'Failed to delete tenant');
      }
    },
    onSuccess: () => {
      // Invalidate all tenant-related caches
      void queryClient.invalidateQueries({
        queryKey: ['user-tenants'],
      });
      void queryClient.invalidateQueries({
        queryKey: tenantSettingsKeys.all,
      });
    },
  });

  const refreshSettings = useCallback(async () => {
    const results = await Promise.allSettled([
      settingsQuery.refetch(),
      notificationQuery.refetch(),
      privacyQuery.refetch(),
    ]);
    return results;
  }, [settingsQuery.refetch, notificationQuery.refetch, privacyQuery.refetch]);

  return {
    settings: settingsQuery.data || null,
    notificationSettings: notificationQuery.data || null,
    privacySettings: privacyQuery.data || null,
    isLoading: settingsQuery.isLoading || notificationQuery.isLoading || privacyQuery.isLoading,
    error: settingsQuery.error || notificationQuery.error || privacyQuery.error,
    updateSettings: updateSettingsMutation.mutateAsync,
    updateNotificationSettings: updateNotificationsMutation.mutateAsync,
    updatePrivacySettings: updatePrivacyMutation.mutateAsync,
    deleteTenant: deleteTenantMutation.mutateAsync,
    refreshSettings,
  };
} 