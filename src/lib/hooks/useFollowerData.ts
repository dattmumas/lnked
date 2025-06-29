import { useEffect, useState } from 'react';

import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

interface FollowerData {
  followerCount: number;
  isFollowing: boolean;
  loading: boolean;
  error: string | null;
}

interface UseFollowerDataProps {
  targetId: string;
  targetType: 'user' | 'collective';
  currentUserId?: string | null;
}

export function useFollowerData({
  targetId,
  targetType,
  currentUserId,
}: UseFollowerDataProps): FollowerData {
  const [followerCount, setFollowerCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    async function fetchFollowerData(): Promise<void> {
      try {
        setLoading(true);
        setError(null);

        // Get follower count via RPC (avoids 406 Accept issues)
        const { data, error } = await supabase.rpc('get_follower_count', {
          entity_id: targetId,
          entity_type: targetType,
        });

        if (error) {
          console.error('Error fetching follower count:', error);
          setError(error instanceof Error ? error.message : 'Unknown error');
        } else {
          setFollowerCount(data || 0);
        }

        // Check if current user is following (only if authenticated)
        if (
          currentUserId !== null &&
          currentUserId !== undefined &&
          currentUserId !== ''
        ) {
          const { data: isFollow, error: followError } = await supabase.rpc(
            'is_following',
            {
              follower_user_id: currentUserId,
              target_id: targetId,
              target_type: targetType,
            },
          );

          if (followError !== null && followError !== undefined) {
            throw new Error(
              `Failed to check follow status: ${followError.message}`,
            );
          }

          setIsFollowing(Boolean(isFollow));
        } else {
          setIsFollowing(false);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    void fetchFollowerData();
  }, [targetId, targetType, currentUserId, supabase]);

  return {
    followerCount,
    isFollowing,
    loading,
    error,
  };
}

// Real-time hook that listens for follow changes
export function useRealtimeFollowerData({
  targetId,
  targetType,
  currentUserId,
}: UseFollowerDataProps): FollowerData {
  const [followerCount, setFollowerCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    async function fetchInitialData(): Promise<void> {
      try {
        setLoading(true);
        setError(null);

        // Get initial follower count via RPC
        const { data: count, error: countError } = await supabase.rpc(
          'get_follower_count',
          {
            entity_id: targetId,
            entity_type: targetType,
          },
        );

        if (countError !== null && countError !== undefined) {
          throw new Error(
            `Failed to fetch follower count: ${countError.message}`,
          );
        }

        setFollowerCount(count ?? 0);

        // Check initial follow status via RPC
        if (
          currentUserId !== null &&
          currentUserId !== undefined &&
          currentUserId !== ''
        ) {
          const { data: isFollow, error: followError } = await supabase.rpc(
            'is_following',
            {
              follower_user_id: currentUserId,
              target_id: targetId,
              target_type: targetType,
            },
          );

          if (followError !== null && followError !== undefined) {
            throw new Error(
              `Failed to check follow status: ${followError.message}`,
            );
          }

          setIsFollowing(Boolean(isFollow));
        } else {
          setIsFollowing(false);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    void fetchInitialData();

    // Set up real-time subscription for follow changes
    const channel = supabase
      .channel(`follows:${targetId}:${targetType}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'follows',
          filter: `following_id=eq.${targetId}`,
        },
        (payload) => {
          if (
            payload.new !== null &&
            payload.new !== undefined &&
            'following_type' in payload.new &&
            payload.new['following_type'] === targetType
          ) {
            // New follow
            if (payload.eventType === 'INSERT') {
              setFollowerCount((prev) => prev + 1);
              if (
                currentUserId !== null &&
                currentUserId !== undefined &&
                currentUserId !== '' &&
                payload.new['follower_id'] === currentUserId
              ) {
                setIsFollowing(true);
              }
            }
            // Unfollow
            else if (
              payload.eventType === 'DELETE' &&
              payload.old !== null &&
              payload.old !== undefined
            ) {
              setFollowerCount((prev) => Math.max(0, prev - 1));
              if (
                currentUserId !== null &&
                currentUserId !== undefined &&
                currentUserId !== '' &&
                payload.old['follower_id'] === currentUserId
              ) {
                setIsFollowing(false);
              }
            }
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [targetId, targetType, currentUserId, supabase]);

  return {
    followerCount,
    isFollowing,
    loading,
    error,
  };
}
