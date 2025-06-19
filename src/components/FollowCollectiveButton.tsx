'use client';

import { UserPlus, UserMinus, Loader2 } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useTransition, useEffect } from 'react';

import {
  followCollective,
  unfollowCollective,
} from '@/app/actions/followActions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

interface FollowCollectiveButtonProps {
  targetCollectiveId: string;
  targetCollectiveName: string;
  initialIsFollowing: boolean;
  currentUserId?: string | null;
}

export default function FollowCollectiveButton({
  targetCollectiveId,
  targetCollectiveName,
  initialIsFollowing,
  currentUserId: initialCurrentUserId,
}: FollowCollectiveButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isLoadingCurrentUser, setIsLoadingCurrentUser] =
    useState(!initialCurrentUserId);
  const [actualCurrentUserId, setActualCurrentUserId] = useState<string | null>(
    initialCurrentUserId || null,
  );
  const [error, setError] = useState<string | undefined>(undefined);
  const supabase = createSupabaseBrowserClient();

  useEffect((): void => {
    setIsFollowing(initialIsFollowing);
  }, [initialIsFollowing]);

  useEffect((): void => {
    if (!initialCurrentUserId) {
      const fetchUser = async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setActualCurrentUserId(user?.id || null);
        setIsLoadingCurrentUser(false);
      };
      fetchUser();
    } else {
      setIsLoadingCurrentUser(false);
    }
  }, [initialCurrentUserId, supabase]);

  const handleFollowToggle = async () => {
    if (!actualCurrentUserId) {
      void router.push(`/sign-in?redirect=${pathname}`);
      return;
    }

    const previousIsFollowing = isFollowing;
    setIsFollowing(!isFollowing);

    startTransition(async () => {
      const action = previousIsFollowing
        ? unfollowCollective
        : followCollective;
      const result = await action(targetCollectiveId);
      if (!result.success) {
        setIsFollowing(previousIsFollowing);
        setError(result.error || 'Action failed. Please try again.');
      } else {
        setError(undefined);
      }
    });
  };

  if (isLoadingCurrentUser) {
    return (
      <Button disabled className="animate-pulse w-[120px]">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading
      </Button>
    );
  }

  if (!actualCurrentUserId) {
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
        onClick={() => void handleFollowToggle()}
        disabled={isPending || isLoadingCurrentUser}
        variant={isFollowing ? 'outline' : 'default'}
        size="sm"
        aria-label={
          isFollowing
            ? `Unfollow ${targetCollectiveName}`
            : `Follow ${targetCollectiveName}`
        }
      >
        {isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : isFollowing ? (
          <UserMinus className="mr-2 h-4 w-4" />
        ) : (
          <UserPlus className="mr-2 h-4 w-4" />
        )}
        {isPending
          ? 'Processing...'
          : isFollowing
            ? `Unfollow ${targetCollectiveName}`
            : `Follow ${targetCollectiveName}`}
      </Button>
    </div>
  );
}
