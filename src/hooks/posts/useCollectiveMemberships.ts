import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { useUser } from '@/hooks/useUser';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

import type { CollectiveWithPermission } from '@/lib/data-loaders/posts-loader';
import type { Database } from '@/lib/database.types';
import type { UserTenantsResponse } from '@/types/tenant.types';

// Constants
const STALE_TIME_MS = 1000 * 60 * 5; // 5 minutes
const GC_TIME_MS = 1000 * 60 * 10; // 10 minutes

const ROLE_PRIORITY: Record<string, number> = {
  owner: 4,
  admin: 3,
  editor: 2,
  author: 1,
};

export function useCollectiveMemberships(
  postableOnly = false,
): UseQueryResult<CollectiveWithPermission[], Error> {
  const { user } = useUser();
  const supabase = createSupabaseBrowserClient();

  return useQuery({
    queryKey: ['collectiveMemberships', user?.id, postableOnly],
    queryFn: async () => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase.rpc('get_user_tenants');

      if (error) {
        throw new Error('Failed to fetch collective memberships.');
      }

      let collectives: UserTenantsResponse[] = data || [];

      if (postableOnly) {
        collectives = collectives.filter(
          (tenant) =>
            tenant.tenant_type === 'collective' &&
            ['owner', 'admin', 'editor'].includes(tenant.user_role),
        );
      }

      const collectivesWithPermissions: CollectiveWithPermission[] =
        collectives.map((tenant) => ({
          id: tenant.tenant_id,
          name: tenant.tenant_name,
          slug: tenant.tenant_slug,
          logo_url: null, // This RPC doesn't return branding info
          description: null, // This RPC doesn't return description
          user_role:
            tenant.user_role as Database['public']['Enums']['collective_member_role'],
          can_post: ['owner', 'admin', 'editor'].includes(tenant.user_role),
          member_count: tenant.member_count,
        }));

      // Sort by role priority and then by name
      return collectivesWithPermissions.sort((a, b) => {
        const aPriority = ROLE_PRIORITY[a.user_role] ?? 0;
        const bPriority = ROLE_PRIORITY[b.user_role] ?? 0;

        if (aPriority !== bPriority) {
          return bPriority - aPriority; // Higher priority first
        }

        return a.name.localeCompare(b.name);
      });
    },
    enabled: Boolean(user?.id),
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
  });
}
