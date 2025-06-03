import { useQuery } from '@tanstack/react-query';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import type { Database } from '@/lib/database.types';

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

export function useCollectiveData(slug: string) {
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

      if (error || !data) {
        throw new Error('Collective not found');
      }

      return data as Collective;
    },
  });
}

export function useCollectiveMembers(collectiveId: string) {
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

      if (error) throw error;
      return data as CollectiveMember[];
    },
  });
}

export function useCollectiveStats(collectiveId: string) {
  return useQuery({
    queryKey: ['collective-stats', collectiveId],
    queryFn: async () => {
      const supabase = createSupabaseBrowserClient();
      
      // Use the optimized RPC function instead of separate count queries
      // Type assertion needed since RPC function isn't in generated types yet
      const { data, error } = await (supabase as any)
        .rpc('get_collective_stats', { collective_id: collectiveId });

      if (error) throw error;
      
      // Parse the JSON response from the RPC function
      const stats = data as {
        member_count: number;
        follower_count: number;
      };

      return {
        memberCount: stats.member_count || 0,
        followerCount: stats.follower_count || 0,
      };
    },
    // Enable caching for 5 minutes to reduce database load
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}
