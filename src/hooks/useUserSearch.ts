import { useQuery } from '@tanstack/react-query';

interface User {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

const STALE_TIME_MS = 30 * 1000; // 30 seconds

export function useUserSearch(query: string, enabled = true): {
  data: User[] | undefined;
  isLoading: boolean;
  error: Error | null;
} {
  return useQuery({
    queryKey: ['user-search', query],
    queryFn: async (): Promise<User[]> => {
      if (query.trim() === '') return [];
      
      const params = new URLSearchParams({ q: query.trim() });
      const response = await fetch(`/api/search/users?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to search users');
      }
      
      return response.json() as Promise<User[]>;
    },
    enabled: enabled && query.trim().length > 0,
    staleTime: STALE_TIME_MS,
  });
} 