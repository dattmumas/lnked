"use client";

import { useState, useTransition, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { UserPlus, UserMinus, Loader2 } from "lucide-react";
import { followUser, unfollowUser } from "@/app/actions/followActions";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { useRouter, usePathname } from "next/navigation";

interface FollowButtonProps {
  targetUserId: string;
  targetUserName: string;
  initialIsFollowing: boolean; // This should be passed from the server component fetching page data
  currentUserId?: string | null; // Optional, can also be fetched client-side if not passed
}

export default function FollowButton({
  targetUserId,
  targetUserName,
  initialIsFollowing,
  currentUserId: initialCurrentUserId, // Rename prop to avoid conflict with state
}: FollowButtonProps) {
  const router = useRouter(); // Import from next/navigation if not already there
  const pathname = usePathname(); // Import from next/navigation if not already there
  const [isPending, startTransition] = useTransition();
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isLoadingCurrentUser, setIsLoadingCurrentUser] = useState(
    !initialCurrentUserId
  );
  const [actualCurrentUserId, setActualCurrentUserId] = useState<string | null>(
    initialCurrentUserId || null
  );
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    setIsFollowing(initialIsFollowing);
  }, [initialIsFollowing]);

  useEffect(() => {
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
      router.push(`/sign-in?redirect=${pathname}`);
      return;
    }
    if (actualCurrentUserId === targetUserId) return; // Cannot follow self

    const previousIsFollowing = isFollowing;
    setIsFollowing(!isFollowing); // Optimistic update

    startTransition(async () => {
      const action = previousIsFollowing ? unfollowUser : followUser;
      const result = await action(targetUserId);
      if (!result.success) {
        setIsFollowing(previousIsFollowing); // Revert on error
        alert(result.error || "Action failed. Please try again.");
      } else {
        // Success, revalidation should update any follower counts displayed elsewhere
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

  if (!actualCurrentUserId || actualCurrentUserId === targetUserId) {
    return null; // Don't show follow button for self or if user not loaded/logged in
  }

  return (
    <Button
      onClick={handleFollowToggle}
      disabled={isPending || isLoadingCurrentUser}
      variant={isFollowing ? "outline" : "default"}
      size="sm"
    >
      {isPending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : isFollowing ? (
        <UserMinus className="mr-2 h-4 w-4" />
      ) : (
        <UserPlus className="mr-2 h-4 w-4" />
      )}
      {isPending
        ? "Processing..."
        : isFollowing
        ? `Unfollow ${targetUserName}`
        : `Follow ${targetUserName}`}
    </Button>
  );
}
