import { useQuery } from '@tanstack/react-query';

import { useUser } from '@/hooks/useUser';
import { Database } from '@/lib/database.types';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { 
  CollectiveWithPermission, 
  canUserPostToCollective 
} from '@/types/enhanced-database.types';

import type { UseQueryResult } from '@tanstack/react-query';

// Constants
/* eslint-disable no-magic-numbers */
const STALE_TIME_MS = 1000 * 60 * 5; // 5 minutes
const GC_TIME_MS = 1000 * 60 * 10; // 10 minutes (formerly cacheTime)
const SEARCH_STALE_TIME_MS = 1000 * 60 * 2; // 2 minutes for search results
/* eslint-enable no-magic-numbers */

// Role priority constants
const ROLE_PRIORITY: Record<string, number> = { 
  owner: 4, 
  admin: 3, 
  editor: 2, 
  author: 1 
};

// Narrow type for membership query results (select columns from `collective_members` plus joined `collectives`)
interface MembershipRow {
  collective_id: string;
  role: Database['public']['Enums']['collective_member_role'] | null;
  collectives: {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    description: string | null;
  };
}

// Hook to get user's collective memberships with posting permissions
export const useCollectiveMemberships = (includeNonPostable = false): UseQueryResult<CollectiveWithPermission[], Error> => {
  const { user } = useUser();

  return useQuery({
    queryKey: ['user-collective-memberships', user?.id, includeNonPostable],
    queryFn: async (): Promise<CollectiveWithPermission[]> => {
      const hasUserId = user?.id !== undefined && user?.id !== null && user?.id !== '';
      if (!hasUserId) {
        throw new Error('User not authenticated');
      }

      const supabase = createSupabaseBrowserClient();

      // Query collective memberships with collective details
      const { data: memberships, error } = await supabase
        .from('collective_members')
        .select(`
          collective_id,
          role,
          collectives!inner(
            id,
            name,
            slug,
            logo_url,
            description
          )
        `)
        .eq('member_id', user.id)
        .eq('member_type', 'user');

      if (error !== null) {
        console.error('Error fetching collective memberships:', error);
        throw new Error(`Failed to fetch collective memberships: ${error.message}`);
      }

      const hasMemberships = memberships !== null && memberships !== undefined;
      if (!hasMemberships) {
        return [];
      }

      // Transform to CollectiveWithPermission format
      const collectivesWithPermissions: CollectiveWithPermission[] = memberships
        .map((membership: MembershipRow) => {
          const collective = membership.collectives;
          const userRole = membership.role as Database['public']['Enums']['collective_member_role'];
          const canPost = canUserPostToCollective(userRole);

          return {
            id: collective.id,
            name: collective.name,
            slug: collective.slug,
            logo_url: collective.logo_url,
            description: collective.description,
            user_role: userRole,
            can_post: canPost,
          };
        })
        .filter((collective) => {
          // Filter based on posting permissions unless includeNonPostable is true
          return includeNonPostable || collective.can_post;
        });

      // Sort by role priority (owner > admin > editor > author) and then by name
      return collectivesWithPermissions.sort((a, b) => {
        const aPriority = ROLE_PRIORITY[a.user_role] ?? 0;
        const bPriority = ROLE_PRIORITY[b.user_role] ?? 0;
        
        if (aPriority !== bPriority) {
          return bPriority - aPriority; // Higher priority first
        }
        
        return a.name.localeCompare(b.name); // Alphabetical by name
      });
    },
    enabled: Boolean(user?.id),
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
  });
};

// Hook to get collective membership counts (for display purposes)
export const useCollectiveMembershipCounts = (collectiveIds: string[]): UseQueryResult<Record<string, number>, Error> => {
  return useQuery({
    queryKey: ['collective-membership-counts', collectiveIds],
    queryFn: async (): Promise<Record<string, number>> => {
      if (collectiveIds.length === 0) {
        return {};
      }

      const supabase = createSupabaseBrowserClient();

      const { data: counts, error } = await supabase
        .from('collective_members')
        .select('collective_id')
        .in('collective_id', collectiveIds);

      if (error !== null) {
        console.error('Error fetching membership counts:', error);
        throw new Error(`Failed to fetch membership counts: ${error.message}`);
      }

      // Count memberships per collective
      const countMap: Record<string, number> = {};
      collectiveIds.forEach(id => {
        countMap[id] = 0;
      });

      counts?.forEach(member => {
        countMap[member.collective_id] = (countMap[member.collective_id] ?? 0) + 1;
      });

      return countMap;
    },
    enabled: collectiveIds.length > 0,
    staleTime: STALE_TIME_MS,
  });
};

// Hook to validate user's posting permissions for specific collectives
export const useCollectivePostingPermissions = (collectiveIds: string[]): UseQueryResult<Record<string, boolean>, Error> => {
  const { user } = useUser();

  return useQuery({
    queryKey: ['collective-posting-permissions', user?.id, collectiveIds],
    queryFn: async (): Promise<Record<string, boolean>> => {
      const hasUserId = user?.id !== undefined && user?.id !== null && user?.id !== '';
      if (!hasUserId || collectiveIds.length === 0) {
        return {};
      }

      const supabase = createSupabaseBrowserClient();

      const { data: memberships, error } = await supabase
        .from('collective_members')
        .select('collective_id, role')
        .eq('member_id', user.id)
        .eq('member_type', 'user')
        .in('collective_id', collectiveIds);

      if (error !== null) {
        console.error('Error checking posting permissions:', error);
        throw new Error(`Failed to check posting permissions: ${error.message}`);
      }

      const permissions: Record<string, boolean> = {};
      
      // Initialize all as false
      collectiveIds.forEach(id => {
        permissions[id] = false;
      });

      // Set permissions based on user role
      memberships?.forEach(membership => {
        const userRole = membership.role;
        permissions[membership.collective_id] = canUserPostToCollective(userRole);
      });

      return permissions;
    },
    enabled: Boolean(user?.id) && collectiveIds.length > 0,
    staleTime: STALE_TIME_MS,
  });
};

// Hook to search collective memberships (for large collective lists)
export const useSearchCollectiveMemberships = (searchQuery: string): UseQueryResult<CollectiveWithPermission[], Error> => {
  const { user } = useUser();

  return useQuery({
    queryKey: ['search-collective-memberships', user?.id, searchQuery],
    queryFn: async (): Promise<CollectiveWithPermission[]> => {
      const hasUserId = user?.id !== undefined && user?.id !== null && user?.id !== '';
      const hasSearchQuery = searchQuery !== undefined && searchQuery !== null && searchQuery.trim() !== '';
      
      if (!hasUserId || !hasSearchQuery) {
        return [];
      }

      const supabase = createSupabaseBrowserClient();

      // Search collective memberships by name or slug
      const { data: memberships, error } = await supabase
        .from('collective_members')
        .select(`
          collective_id,
          role,
          collectives!inner(
            id,
            name,
            slug,
            logo_url,
            description
          )
        `)
        .eq('member_id', user.id)
        .eq('member_type', 'user')
        .or(`name.ilike.%${searchQuery}%,slug.ilike.%${searchQuery}%`, { 
          referencedTable: 'collectives' 
        });

      if (error !== null) {
        console.error('Error searching collective memberships:', error);
        throw new Error(`Failed to search collective memberships: ${error.message}`);
      }

      const hasMemberships = memberships !== null && memberships !== undefined;
      if (!hasMemberships) {
        return [];
      }

      // Transform and filter for posting permissions
      return memberships
        .map((membership: MembershipRow) => {
          const collective = membership.collectives;
          const userRole = membership.role as Database['public']['Enums']['collective_member_role'];
          const canPost = canUserPostToCollective(userRole);

          return {
            id: collective.id,
            name: collective.name,
            slug: collective.slug,
            logo_url: collective.logo_url,
            description: collective.description,
            user_role: userRole,
            can_post: canPost,
          };
        })
        .filter((collective) => collective.can_post);
    },
    enabled: Boolean(user?.id) && Boolean(searchQuery.trim()),
    staleTime: SEARCH_STALE_TIME_MS,
  });
}; 