"use client";

import { useState, useTransition, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { togglePostLike } from "@/app/actions/likeActions";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
// import type { User } from "@supabase/supabase-js"; // User type is not strictly needed here

interface PostLikeButtonProps {
  postId: string;
  collectiveSlug: string | null; // Updated to allow null
  initialLikes: number;
  initialUserHasLiked?: boolean; // Optional, component can fetch if not provided
  authorId: string; // Added authorId
}

export default function PostLikeButton({
  postId,
  collectiveSlug,
  initialLikes,
  initialUserHasLiked,
  authorId, // Added authorId
}: PostLikeButtonProps) {
  const supabase = createSupabaseBrowserClient();
  const [isPending, startTransition] = useTransition();
  const [likeCount, setLikeCount] = useState(initialLikes);
  const [userHasLiked, setUserHasLiked] = useState(
    initialUserHasLiked || false
  );
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoadingInitialState, setIsLoadingInitialState] = useState(true);

  useEffect(() => {
    const fetchInitialState = async () => {
      setIsLoadingInitialState(true); // Ensure loading state is true at start of fetch
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);

      if (user && initialUserHasLiked === undefined) {
        const { data: like, error } = await supabase
          .from("post_reactions")
          .select("user_id") // Only need to check existence
          .eq("post_id", postId)
          .eq("user_id", user.id)
          .eq("type", "like")
          .maybeSingle();
        if (error) {
          console.error("Error fetching initial like state:", error.message);
        } else {
          setUserHasLiked(!!like);
        }
      } else if (initialUserHasLiked !== undefined) {
        setUserHasLiked(initialUserHasLiked);
      }
      setIsLoadingInitialState(false);
    };
    fetchInitialState();
    // Rerun if the specific post or its initial liked status changes, or if user context might change externally (less likely for this button)
    // Keying on supabase client instance is also good practice if it could change, though unlikely for createSupabaseBrowserClient.
  }, [supabase, postId, initialUserHasLiked]);

  useEffect(() => {
    setLikeCount(initialLikes);
  }, [initialLikes]);

  const handleLikeToggle = async () => {
    if (!currentUserId) {
      alert("Please sign in to like posts.");
      return;
    }
    if (isLoadingInitialState) return;

    const previousLikeCount = likeCount;
    const previousUserHasLiked = userHasLiked;

    setUserHasLiked(!userHasLiked);
    setLikeCount(userHasLiked ? likeCount - 1 : likeCount + 1);

    startTransition(async () => {
      const result = await togglePostLike(postId, collectiveSlug, authorId);
      if (!result.success) {
        setUserHasLiked(previousUserHasLiked);
        setLikeCount(previousLikeCount);
        alert(result.message || "Failed to update like.");
      } else {
        if (result.newLikeCount !== undefined)
          setLikeCount(result.newLikeCount);
        if (result.userHadLiked !== undefined)
          setUserHasLiked(result.userHadLiked);
      }
    });
  };

  return (
    <div className="flex items-center space-x-2">
      <Button
        variant="ghost"
        size="lg"
        onClick={handleLikeToggle}
        disabled={isPending || isLoadingInitialState || !currentUserId}
        aria-label={userHasLiked ? "Unlike post" : "Like post"}
        className="flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-muted"
      >
        <Heart
          className={`w-5 h-5 ${
            userHasLiked
              ? "fill-destructive text-destructive"
              : "text-muted-foreground"
          }`}
        />
        <span>{userHasLiked ? "Liked" : "Like"}</span>
      </Button>
      <span className="text-base text-muted-foreground tabular-nums">
        {likeCount} {likeCount === 1 ? "like" : "likes"}
      </span>
    </div>
  );
}
