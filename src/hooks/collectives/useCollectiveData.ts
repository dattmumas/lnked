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
      
      // Get member count
      const { count: memberCount } = await supabase
        .from('collective_members')
        .select('*', { count: 'exact', head: true })
        .eq('collective_id', collectiveId);

      // Get follower count  
      const { count: followerCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', collectiveId)
        .eq('following_type', 'collective');

      return {
        memberCount: memberCount || 0,
        followerCount: followerCount || 0,
      };
    },
  });
}
