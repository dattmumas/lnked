'use client';

import { Heart } from 'lucide-react';
import React, { useState, useTransition, useEffect, useCallback } from 'react';

import { togglePostLike } from '@/app/actions/likeActions';
import { Button } from '@/components/ui/button';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
// import type { User } from "@supabase/supabase-js"; // User type is not strictly needed here

interface PostLikeButtonProps {
  postId: string;
  collectiveSlug: string | null; // Updated to allow null
  initialLikes: number;
  initialUserHasLiked?: boolean; // Optional, component can fetch if not provided
}

export default function PostLikeButton({
  postId,
  collectiveSlug,
  initialLikes,
  initialUserHasLiked,
}: PostLikeButtonProps): React.ReactElement {
  const supabase = createSupabaseBrowserClient();
  const [isPending, startTransition] = useTransition();
  const [likeCount, setLikeCount] = useState(initialLikes);
  const [userHasLiked, setUserHasLiked] = useState(
    initialUserHasLiked !== undefined ? initialUserHasLiked : false,
  );
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(
    undefined,
  );
  const [isLoadingInitialState, setIsLoadingInitialState] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect((): void => {
    const fetchInitialState = async (): Promise<void> => {
      setIsLoadingInitialState(true); // Ensure loading state is true at start of fetch
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUserId(user?.id ?? undefined);

      if (
        user !== undefined &&
        user !== null &&
        initialUserHasLiked === undefined
      ) {
        const { data: like, error } = await supabase
          .from('post_reactions')
          .select('user_id')
          .eq('post_id', postId)
          .eq('user_id', user.id)
          .eq('type', 'like')
          .maybeSingle();
        if (error) {
          console.error('Error fetching initial like state:', error.message);
        } else {
          setUserHasLiked(like !== undefined && like !== null);
        }
      } else if (initialUserHasLiked !== undefined) {
        setUserHasLiked(initialUserHasLiked);
      }
      setIsLoadingInitialState(false);
    };
    void fetchInitialState();
    // Rerun if the specific post or its initial liked status changes, or if user context might change externally (less likely for this button)
    // Keying on supabase client instance is also good practice if it could change, though unlikely for createSupabaseBrowserClient.
  }, [supabase, postId, initialUserHasLiked]);

  useEffect((): void => {
    setLikeCount(initialLikes);
  }, [initialLikes]);

  const handleLikeToggle = useCallback((): void => {
    if (
      currentUserId === undefined ||
      currentUserId === null ||
      currentUserId.length === 0
    ) {
      setErrorMessage('Please sign in to like posts.');
      return;
    }
    if (isLoadingInitialState) return;

    const previousLikeCount = likeCount;
    const previousUserHasLiked = userHasLiked;

    setUserHasLiked(!userHasLiked);
    setLikeCount(userHasLiked ? likeCount - 1 : likeCount + 1);
    setErrorMessage(''); // Clear any previous errors

    startTransition(async () => {
      const result = await togglePostLike(postId, collectiveSlug);
      if (!result.success) {
        setUserHasLiked(previousUserHasLiked);
        setLikeCount(previousLikeCount);
        setErrorMessage(
          result.message !== undefined &&
            result.message !== null &&
            result.message.length > 0
            ? result.message
            : 'Failed to update like.',
        );
      } else {
        if (result.newLikeCount !== undefined)
          setLikeCount(result.newLikeCount);
        if (result.userHadLiked !== undefined)
          setUserHasLiked(result.userHadLiked);
      }
    });
  }, [
    currentUserId,
    isLoadingInitialState,
    likeCount,
    userHasLiked,
    startTransition,
    postId,
    collectiveSlug,
  ]);

  return (
    <>
      {errorMessage !== undefined &&
        errorMessage !== null &&
        errorMessage.length > 0 && (
          <div className="text-sm text-red-500 mb-2">{errorMessage}</div>
        )}
      <div className="flex items-center space-x-2">
        <Button
          variant="ghost"
          size="lg"
          onClick={handleLikeToggle}
          disabled={
            isPending ||
            isLoadingInitialState ||
            currentUserId === undefined ||
            currentUserId === null ||
            currentUserId.length === 0
          }
          aria-label={userHasLiked ? 'Unlike post' : 'Like post'}
          className="flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-muted"
        >
          <Heart
            className={`w-5 h-5 ${
              userHasLiked
                ? 'fill-destructive text-destructive'
                : 'text-muted-foreground'
            }`}
          />
          <span>{userHasLiked ? 'Liked' : 'Like'}</span>
        </Button>
        <span className="text-base text-muted-foreground tabular-nums">
          {likeCount} {likeCount === 1 ? 'like' : 'likes'}
        </span>
      </div>
    </>
  );
}
