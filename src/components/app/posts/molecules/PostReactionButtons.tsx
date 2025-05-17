"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown } from "lucide-react";

interface PostReactionButtonsProps {
  postId: string;
  initialLikeCount: number;
  initialDislikeCount: number;
  initialUserReaction: "like" | "dislike" | null;
  disabled?: boolean;
}

export default function PostReactionButtons({
  postId,
  initialLikeCount,
  initialDislikeCount,
  initialUserReaction,
  disabled = false,
}: PostReactionButtonsProps) {
  const [isPending, startTransition] = useTransition();
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [dislikeCount, setDislikeCount] = useState(initialDislikeCount);
  const [userReaction, setUserReaction] = useState<"like" | "dislike" | null>(
    initialUserReaction
  );

  const handleReaction = (type: "like" | "dislike") => {
    if (disabled || isPending) return;
    const prevReaction = userReaction;
    let newLikeCount = likeCount;
    let newDislikeCount = dislikeCount;
    if (type === "like") {
      if (userReaction === "like") {
        newLikeCount -= 1;
        setUserReaction(null);
      } else {
        newLikeCount += 1;
        if (userReaction === "dislike") newDislikeCount -= 1;
        setUserReaction("like");
      }
    } else {
      if (userReaction === "dislike") {
        newDislikeCount -= 1;
        setUserReaction(null);
      } else {
        newDislikeCount += 1;
        if (userReaction === "like") newLikeCount -= 1;
        setUserReaction("dislike");
      }
    }
    setLikeCount(newLikeCount);
    setDislikeCount(newDislikeCount);
    startTransition(async () => {
      const res = await fetch(`/api/posts/${postId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      if (res.ok) {
        const data = await res.json();
        setLikeCount(data.likeCount ?? 0);
        setDislikeCount(data.dislikeCount ?? 0);
        setUserReaction(data.userReaction);
      } else {
        // revert optimistic update
        setLikeCount(likeCount);
        setDislikeCount(dislikeCount);
        setUserReaction(prevReaction);
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={userReaction === "like" ? "default" : "ghost"}
        size="icon"
        aria-label={userReaction === "like" ? "Unlike post" : "Like post"}
        onClick={() => handleReaction("like")}
        disabled={disabled || isPending}
        className="rounded-full"
      >
        <ThumbsUp
          className={
            userReaction === "like" ? "text-primary" : "text-muted-foreground"
          }
        />
      </Button>
      <span className="text-sm tabular-nums w-6 text-center">{likeCount}</span>
      <Button
        variant={userReaction === "dislike" ? "destructive" : "ghost"}
        size="icon"
        aria-label={
          userReaction === "dislike" ? "Remove dislike" : "Dislike post"
        }
        onClick={() => handleReaction("dislike")}
        disabled={disabled || isPending}
        className="rounded-full"
      >
        <ThumbsDown
          className={
            userReaction === "dislike"
              ? "text-destructive"
              : "text-muted-foreground"
          }
        />
      </Button>
      <span className="text-sm tabular-nums w-6 text-center">
        {dislikeCount}
      </span>
    </div>
  );
}
