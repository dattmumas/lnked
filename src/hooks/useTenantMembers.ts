// Tenant Members Management Hook
// Provides functionality for managing members within a tenant

'use client';

import { useEffect, useState, useCallback } from 'react';

import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

import type { TenantMember, MemberRole, UseTenantMembersReturn } from '@/types/tenant.types';

/**
 * Hook to manage tenant members
 * @param tenantId - The tenant ID to manage members for
 * @returns Members data, loading state, and management functions
 */
export function useTenantMembers(tenantId: string | null): UseTenantMembersReturn {
  const [members, setMembers] = useState<TenantMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    if (!tenantId) {
      setMembers([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const supabase = createSupabaseBrowserClient();

      // Get tenant members with user information
      const { data, error: membersError } = await supabase
        .from('tenant_members')
        .select(`
          id,
          tenant_id,
          user_id,
          role,
          joined_at,
          user:users(
            id,
            username,
            full_name,
            avatar_url,
            email
          )
        `)
        .eq('tenant_id', tenantId)
        .order('joined_at', { ascending: true });

      if (membersError) {
        throw membersError;
      }

      // Transform the data to match our TenantMember interface
      // @ts-expect-error tenant-migration: TenantMember type will be updated to handle nullable joined_at and user relation
      const transformedMembers: TenantMember[] = (data || []).map(member => ({
        id: member.id,
        tenant_id: member.tenant_id,
        user_id: member.user_id,
        role: member.role,
        joined_at: member.joined_at,
        // @ts-expect-error tenant-migration: user relation will be properly typed after schema migration
        user_name: member.user?.full_name || member.user?.username || 'Unknown User',
        // @ts-expect-error tenant-migration: user relation will be properly typed after schema migration
        user_email: member.user?.email || null,
        // @ts-expect-error tenant-migration: user relation will be properly typed after schema migration
        user_avatar_url: member.user?.avatar_url || null,
      }));

      setMembers(transformedMembers);
    } catch (err) {
      console.error('Error fetching tenant members:', err);
      setError(err instanceof Error ? err.message : 'Failed to load members');
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  const inviteMember = useCallback(async (email: string, role: MemberRole = 'member') => {
    if (!tenantId) throw new Error('No tenant selected');

    try {
      const supabase = createSupabaseBrowserClient();

      // First, check if user exists with this email
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      if (userError && userError.code !== 'PGRST116') {
        throw userError;
      }

      if (!userData) {
        // User doesn't exist, send invitation (this would typically involve an invitation system)
        throw new Error('User not found. Invitation system not implemented yet.');
      }

      // Add user to tenant
      const { error: insertError } = await supabase
        .from('tenant_members')
        .insert({
          tenant_id: tenantId,
          user_id: userData.id,
          role,
        });

      if (insertError) {
        throw insertError;
      }

      // Refresh members list
      await fetchMembers();
    } catch (err) {
      console.error('Error inviting member:', err);
      throw err;
    }
  }, [tenantId, fetchMembers]);

  const updateMemberRole = useCallback(async (memberId: string, newRole: MemberRole) => {
    if (!tenantId) throw new Error('No tenant selected');

    try {
      const supabase = createSupabaseBrowserClient();

      const { error } = await supabase
        .from('tenant_members')
        .update({ role: newRole })
        .eq('id', memberId)
        .eq('tenant_id', tenantId);

      if (error) {
        throw error;
      }

      // Update local state
      setMembers(prev => prev.map(member => 
        member.id === memberId 
          ? { ...member, role: newRole }
          : member
      ));
    } catch (err) {
      console.error('Error updating member role:', err);
      throw err;
    }
  }, [tenantId]);

  const removeMember = useCallback(async (memberId: string) => {
    if (!tenantId) throw new Error('No tenant selected');

    try {
      const supabase = createSupabaseBrowserClient();

      const { error } = await supabase
        .from('tenant_members')
        .delete()
        .eq('id', memberId)
        .eq('tenant_id', tenantId);

      if (error) {
        throw error;
      }

      // Update local state
      setMembers(prev => prev.filter(member => member.id !== memberId));
    } catch (err) {
      console.error('Error removing member:', err);
      throw err;
    }
  }, [tenantId]);

  const refreshMembers = useCallback(() => {
    return fetchMembers();
  }, [fetchMembers]);

  useEffect(() => {
    void fetchMembers();
  }, [fetchMembers]);

  return {
    members,
    isLoading,
    error,
    inviteMember,
    updateMemberRole,
    removeMember,
    refreshMembers,
  };
} 