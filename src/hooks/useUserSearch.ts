import { useQuery } from '@tanstack/react-query';

interface User {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

const STALE_TIME_MS = 30 * 1000; // 30 seconds
const MIN_QUERY_LENGTH = 2; // Minimum query length for API calls

export function useUserSearch(query: string, enabled = true): {
  data: User[] | undefined;
  isLoading: boolean;
  error: Error | null;
} {
  return useQuery({
    queryKey: ['user-search', query],
    queryFn: async (): Promise<User[]> => {
      if (query.trim().length < MIN_QUERY_LENGTH) return [];
      
      const params = new URLSearchParams({ q: query.trim() });
      const response = await fetch(`/api/search/users?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to search users');
      }
      
      const data = await response.json() as { users: User[]; query: string; count: number };
      return data.users;
    },
    enabled: enabled && query.trim().length >= MIN_QUERY_LENGTH,
    staleTime: STALE_TIME_MS,
  });
} 