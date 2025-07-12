import { useQuery } from '@tanstack/react-query';

import supabase from '@/lib/supabase/browser';

export function useUserRole(userId: string | null, tenantId: string | null) {
  return useQuery({
    queryKey: ['user-role', userId, tenantId],
    queryFn: async () => {
      if (!userId || !tenantId) {
        return null;
      }

      const { data, error } = await supabase
        .from('tenant_members')
        .select('role')
        .eq('user_id', userId)
        .eq('tenant_id', tenantId)
        .maybeSingle(); // Use maybeSingle instead of single to handle no results gracefully

      if (error) {
        console.error('Error fetching user role:', error.message || error);
        return null;
      }

      return data?.role || null;
    },
    enabled: Boolean(userId && tenantId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}
