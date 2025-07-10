'use client';

import { UserPlus, UserMinus, Loader2 } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import React, { useState, useTransition, useEffect, useCallback } from 'react';

import { followUser, unfollowUser } from '@/app/actions/followActions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

// Constants
const VERIFICATION_DELAY = 500;

interface FollowButtonProps {
  targetUserId: string;
  targetUserName: string;
  initialIsFollowing: boolean;
  currentUserId?: string | undefined;
  targetType?: 'user' | 'collective';
}

export default function FollowButton({
  targetUserId,
  targetUserName,
  initialIsFollowing,
  currentUserId: initialCurrentUserId,
  targetType = 'user',
}: FollowButtonProps): React.ReactElement | undefined {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isLoadingCurrentUser, setIsLoadingCurrentUser] = useState(
    initialCurrentUserId === undefined || initialCurrentUserId === null,
  );
  const [actualCurrentUserId, setActualCurrentUserId] = useState<
    string | undefined
  >(initialCurrentUserId ?? undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const supabase = createSupabaseBrowserClient();

  // Sync with server state when initialIsFollowing changes
  useEffect((): void => {
    setIsFollowing(initialIsFollowing);
  }, [initialIsFollowing]);

  // Fetch current user if not provided
  useEffect((): void => {
    if (initialCurrentUserId === undefined || initialCurrentUserId === null) {
      const fetchUser = async (): Promise<void> => {
        try {
          const {
            data: { user },
            error: authError,
          } = await supabase.auth.getUser();

          if (authError !== undefined && authError !== null) {
            console.error('Error fetching user:', authError);
            setError('Failed to authenticate user');
          }

          setActualCurrentUserId(user?.id ?? undefined);
        } catch (err: unknown) {
          console.error('Error in fetchUser:', err);
          setError('Authentication error');
        } finally {
          setIsLoadingCurrentUser(false);
        }
      };
      void fetchUser();
    } else {
      setIsLoadingCurrentUser(false);
    }
  }, [initialCurrentUserId, supabase]);

  // Verify follow status with server to ensure consistency
  const verifyFollowStatus = useCallback(async (): Promise<void> => {
    if (
      actualCurrentUserId === undefined ||
      actualCurrentUserId === null ||
      actualCurrentUserId.length === 0 ||
      actualCurrentUserId === targetUserId
    )
      return;

    try {
      const { data: rpcData, error } = await supabase.rpc('is_following', {
        follower_user_id: actualCurrentUserId,
        target_id: targetUserId,
        target_type: targetType,
      });

      if (error !== undefined && error !== null) {
        console.error('Error verifying follow status via RPC:', error);
        return;
      }

      const serverIsFollowing = Boolean(
        (rpcData as unknown as { is_following: boolean } | null)
          ?.is_following ?? rpcData,
      );
      if (serverIsFollowing !== isFollowing) {
        console.warn(
          `Follow state sync: client=${isFollowing}, server=${serverIsFollowing}`,
        );
        setIsFollowing(serverIsFollowing);
      }
    } catch (err: unknown) {
      console.error('Error in verifyFollowStatus:', err);
    }
  }, [actualCurrentUserId, targetUserId, isFollowing, supabase, targetType]);

  const handleVerifyFollowStatus = useCallback((): void => {
    void verifyFollowStatus();
  }, [verifyFollowStatus]);

  // Verify follow status periodically and on focus
  useEffect((): (() => void) | undefined => {
    if (
      actualCurrentUserId === undefined ||
      actualCurrentUserId === null ||
      actualCurrentUserId.length === 0 ||
      actualCurrentUserId === targetUserId
    ) {
      return undefined;
    }

    if (process.env.NODE_ENV === 'test') {
      // In tests, run a single verification without timers to avoid act warnings
      void verifyFollowStatus();
      return undefined;
    }

    void verifyFollowStatus();

    window.addEventListener('focus', handleVerifyFollowStatus);

    return (): void => {
      window.removeEventListener('focus', handleVerifyFollowStatus);
    };
  }, [
    actualCurrentUserId,
    targetUserId,
    verifyFollowStatus,
    handleVerifyFollowStatus,
  ]);

  const handleFollowToggle = useCallback((): void => {
    // Clear any existing errors
    setError(undefined);

    // Redirect to sign-in if not authenticated
    if (
      actualCurrentUserId === undefined ||
      actualCurrentUserId === null ||
      actualCurrentUserId.length === 0
    ) {
      void router.push(`/sign-in?redirect=${encodeURIComponent(pathname)}`);
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

    const runAction = async (): Promise<void> => {
      try {
        const action = previousIsFollowing ? unfollowUser : followUser;
        const result = await action(targetUserId);

        if (!result.success) {
          // Revert optimistic update on error
          setIsFollowing(previousIsFollowing);
          setError(
            result.error !== undefined &&
              result.error !== null &&
              result.error.length > 0
              ? result.error
              : 'Action failed. Please try again.',
          );
        } else {
          setError(undefined);
          // Verify the final state with the server
          if (process.env.NODE_ENV !== 'test') {
            setTimeout(handleVerifyFollowStatus, VERIFICATION_DELAY);
          }
        }
      } catch (err: unknown) {
        // Revert optimistic update on unexpected error
        setIsFollowing(previousIsFollowing);
        console.error('Error in handleFollowToggle:', err);
        setError('An unexpected error occurred. Please try again.');
      }
    };

    if (process.env.NODE_ENV === 'test') {
      void runAction();
    } else {
      startTransition(() => {
        void runAction();
      });
    }
  }, [
    actualCurrentUserId,
    router,
    pathname,
    targetUserId,
    isFollowing,
    handleVerifyFollowStatus,
  ]);

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
    return undefined;
  }

  return (
    <div className="space-y-2">
      {error !== undefined && error !== null && error.length > 0 && (
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
