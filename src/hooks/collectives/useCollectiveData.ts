import { useQuery } from '@tanstack/react-query';

import { Database } from '@/lib/database.types';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

import type { UseQueryResult } from '@tanstack/react-query';

// Constants
/* eslint-disable no-magic-numbers */
const STALE_TIME_MS = 5 * 60 * 1000; // 5 minutes
const GC_TIME_MS = 10 * 60 * 1000; // 10 minutes
/* eslint-enable no-magic-numbers */

type Collective = Database['public']['Tables']['collectives']['Row'] & {
  owner: { full_name: string | null } | null;
};

type CollectiveMember = Database['public']['Tables']['collective_members']['Row'] & {
  user: { 
    full_name: string | null; 
    avatar_url: string | null; 
    bio: string | null; 
    username: string | null;
  } | null;
};

interface QueryOptions {
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
}

interface CollectiveStats {
  memberCount: number;
  followerCount: number;
}

export function useCollectiveData(slug: string): UseQueryResult<Collective, Error> {
  return useQuery({
    queryKey: ['collective', slug],
    queryFn: async () => {
      const supabase = createSupabaseBrowserClient();
      
      const { data, error } = await supabase
        .from('collectives')
        .select(`
          id, name, description, owner_id, tags, logo_url, cover_image_url, intro_video_url,
          owner:users!owner_id(full_name)
        `)
        .eq('slug', slug)
        .single();

      const hasError = error !== null && error !== undefined;
      const hasData = data !== null && data !== undefined;
      
      if (hasError || !hasData) {
        throw new Error('Collective not found');
      }

      return data as Collective;
    },
  });
}

export function useCollectiveMembers(
  collectiveId: string,
  options: QueryOptions = {},
): UseQueryResult<CollectiveMember[], Error> {
  return useQuery({
    queryKey: ['collective-members', collectiveId],
    queryFn: async () => {
      const supabase = createSupabaseBrowserClient();
      
      const { data, error } = await supabase
        .from('collective_members')
        .select(`
          *,
          user:users!member_id(full_name, avatar_url, bio, username)
        `)
        .eq('collective_id', collectiveId)
        .order('created_at', { ascending: true });

      if (error !== null) throw error;
      return data as CollectiveMember[];
    },
    ...options, // Allow overriding with enabled: false
  });
}

export function useCollectiveStats(
  collectiveId: string,
  options: QueryOptions = {},
): UseQueryResult<CollectiveStats, Error> {
  return useQuery({
    queryKey: ['collective-stats', collectiveId],
    queryFn: async () => {
      const supabase = createSupabaseBrowserClient();
      
      const { data, error } = await supabase.rpc(
        'get_collective_stats',
        { collective_id: collectiveId },
      );

      if (error !== null) throw error;
      
      const stats = data as {
        member_count: number;
        follower_count: number;
      };

      return {
        memberCount: stats.member_count ?? 0,
        followerCount: stats.follower_count ?? 0,
      };
    },
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
    ...options, // Allow overriding with enabled: false
  });
}
