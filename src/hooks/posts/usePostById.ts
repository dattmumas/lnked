'use client';

import { useQuery } from '@tanstack/react-query';

import supabase from '@/lib/supabase/browser';


export function fetchPost(id: string) {
  return supabase
    .from('v_user_visible_posts')
    .select('*')
    .eq('id', id)
    .single();
}

export function usePostById(id: string | null) {
  return useQuery({
    queryKey: ['post', id],
    enabled: typeof id === 'string',
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await fetchPost(id);
      if (error) throw new Error(error.message);
      return data;
    },
  });
}
