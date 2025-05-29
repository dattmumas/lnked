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
    async function fetchFollowerData() {
      try {
        setLoading(true);
        setError(null);

        // Get follower count
        const { count, error: countError } = await supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', targetId)
          .eq('following_type', targetType);

        if (countError) {
          throw new Error(
            `Failed to fetch follower count: ${countError.message}`,
          );
        }

        setFollowerCount(count || 0);

        // Check if current user is following (only if authenticated)
        if (currentUserId) {
          const { data: followData, error: followError } = await supabase
            .from('follows')
            .select('*')
            .eq('follower_id', currentUserId)
            .eq('following_id', targetId)
            .eq('following_type', targetType)
            .maybeSingle();

          if (followError) {
            throw new Error(
              `Failed to check follow status: ${followError.message}`,
            );
          }

          setIsFollowing(Boolean(followData));
        } else {
          setIsFollowing(false);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchFollowerData();
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
    async function fetchInitialData() {
      try {
        setLoading(true);
        setError(null);

        // Get initial follower count
        const { count, error: countError } = await supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', targetId)
          .eq('following_type', targetType);

        if (countError) {
          throw new Error(
            `Failed to fetch follower count: ${countError.message}`,
          );
        }

        setFollowerCount(count || 0);

        // Check initial follow status
        if (currentUserId) {
          const { data: followData, error: followError } = await supabase
            .from('follows')
            .select('*')
            .eq('follower_id', currentUserId)
            .eq('following_id', targetId)
            .eq('following_type', targetType)
            .maybeSingle();

          if (followError) {
            throw new Error(
              `Failed to check follow status: ${followError.message}`,
            );
          }

          setIsFollowing(Boolean(followData));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchInitialData();

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
            payload.new &&
            'following_type' in payload.new &&
            payload.new.following_type === targetType
          ) {
            // New follow
            if (payload.eventType === 'INSERT') {
              setFollowerCount((prev) => prev + 1);
              if (currentUserId && payload.new.follower_id === currentUserId) {
                setIsFollowing(true);
              }
            }
            // Unfollow
            else if (payload.eventType === 'DELETE' && payload.old) {
              setFollowerCount((prev) => Math.max(0, prev - 1));
              if (currentUserId && payload.old.follower_id === currentUserId) {
                setIsFollowing(false);
              }
            }
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [targetId, targetType, currentUserId, supabase]);

  return {
    followerCount,
    isFollowing,
    loading,
    error,
  };
}
