'use client';

import { useState, useTransition, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { UserPlus, UserMinus, Loader2 } from 'lucide-react';
import { followUser, unfollowUser } from '@/app/actions/followActions';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { useRouter, usePathname } from 'next/navigation';

interface FollowButtonProps {
  targetUserId: string;
  targetUserName: string;
  initialIsFollowing: boolean;
  currentUserId?: string | null;
}

export default function FollowButton({
  targetUserId,
  targetUserName,
  initialIsFollowing,
  currentUserId: initialCurrentUserId,
}: FollowButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isLoadingCurrentUser, setIsLoadingCurrentUser] =
    useState(!initialCurrentUserId);
  const [actualCurrentUserId, setActualCurrentUserId] = useState<string | null>(
    initialCurrentUserId || null,
  );
  const [error, setError] = useState<string | null>(null);
  const supabase = createSupabaseBrowserClient();

  // Sync with server state when initialIsFollowing changes
  useEffect(() => {
    setIsFollowing(initialIsFollowing);
  }, [initialIsFollowing]);

  // Fetch current user if not provided
  useEffect(() => {
    if (!initialCurrentUserId) {
      const fetchUser = async () => {
        try {
          const {
            data: { user },
            error: authError,
          } = await supabase.auth.getUser();

          if (authError) {
            console.error('Error fetching user:', authError);
            setError('Failed to authenticate user');
          }

          setActualCurrentUserId(user?.id || null);
        } catch (err) {
          console.error('Error in fetchUser:', err);
          setError('Authentication error');
        } finally {
          setIsLoadingCurrentUser(false);
        }
      };
      fetchUser();
    } else {
      setIsLoadingCurrentUser(false);
    }
  }, [initialCurrentUserId, supabase]);

  // Verify follow status with server to ensure consistency
  const verifyFollowStatus = useCallback(async () => {
    if (!actualCurrentUserId || actualCurrentUserId === targetUserId) return;

    try {
      const { data, error } = await supabase
        .from('follows')
        .select('*')
        .eq('follower_id', actualCurrentUserId)
        .eq('following_id', targetUserId)
        .eq('following_type', 'user')
        .maybeSingle();

      if (error) {
        console.error('Error verifying follow status:', error);
        return;
      }

      const serverIsFollowing = !!data;
      if (serverIsFollowing !== isFollowing) {
        console.log(
          `Follow state sync: client=${isFollowing}, server=${serverIsFollowing}`,
        );
        setIsFollowing(serverIsFollowing);
      }
    } catch (err) {
      console.error('Error in verifyFollowStatus:', err);
    }
  }, [actualCurrentUserId, targetUserId, isFollowing, supabase]);

  // Verify follow status periodically and on focus
  useEffect(() => {
    if (actualCurrentUserId && actualCurrentUserId !== targetUserId) {
      verifyFollowStatus();

      const handleFocus = () => verifyFollowStatus();
      window.addEventListener('focus', handleFocus);

      return () => {
        window.removeEventListener('focus', handleFocus);
      };
    }
  }, [actualCurrentUserId, targetUserId, verifyFollowStatus]);

  const handleFollowToggle = async () => {
    // Clear any existing errors
    setError(null);

    // Redirect to sign-in if not authenticated
    if (!actualCurrentUserId) {
      router.push(`/sign-in?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    // Prevent self-following
    if (actualCurrentUserId === targetUserId) {
      setError('You cannot follow yourself');
      return;
    }

    const previousIsFollowing = isFollowing;

    // Optimistic update
    setIsFollowing(!isFollowing);

    startTransition(async () => {
      try {
        const action = previousIsFollowing ? unfollowUser : followUser;
        const result = await action(targetUserId);

        if (!result.success) {
          // Revert optimistic update on error
          setIsFollowing(previousIsFollowing);
          setError(result.error || 'Action failed. Please try again.');
        } else {
          setError(null);
          // Verify the final state with the server
          setTimeout(verifyFollowStatus, 500);
        }
      } catch (err) {
        // Revert optimistic update on unexpected error
        setIsFollowing(previousIsFollowing);
        console.error('Error in handleFollowToggle:', err);
        setError('An unexpected error occurred. Please try again.');
      }
    });
  };

  // Don't render if loading user or if user is self
  if (isLoadingCurrentUser) {
    return (
      <Button disabled className="animate-pulse w-[120px]">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading
      </Button>
    );
  }

  // Don't show follow button for self or if user not logged in (will show sign-in redirect)
  if (actualCurrentUserId === targetUserId) {
    return null;
  }

  return (
    <div className="space-y-2">
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Button
        onClick={handleFollowToggle}
        disabled={isPending || isLoadingCurrentUser}
        variant={isFollowing ? 'outline' : 'default'}
        size="sm"
        className="w-full"
        aria-label={
          isFollowing
            ? `Unfollow ${targetUserName}`
            : `Follow ${targetUserName}`
        }
      >
        {isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : isFollowing ? (
          <UserMinus className="mr-2 h-4 w-4" />
        ) : (
          <UserPlus className="mr-2 h-4 w-4" />
        )}
        {isPending ? 'Processing...' : isFollowing ? `Following` : `Follow`}
      </Button>
    </div>
  );
}
