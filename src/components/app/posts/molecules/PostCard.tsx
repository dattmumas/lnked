// moved from src/components/PostCard.tsx
// Atom → Molecule: displays a single post preview card.

"use client";

// Molecule: displays a single post preview card.

import Link from "next/link";
import type { Database } from "@/lib/database.types";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { useState, useTransition, useEffect } from "react";
import { togglePostLike } from "@/app/actions/likeActions";
import { createSupabaseBrowserClient } from "@/lib/supabase";

type PostWithLikes = Database["public"]["Tables"]["posts"]["Row"] & {
  like_count?: number;
  current_user_has_liked?: boolean;
};

interface PostCardProps {
  post: PostWithLikes;
  collectiveSlug: string | null;
}

const truncateText = (text: string | null, maxLength = 150): string => {
  if (!text) return "";
  return text.length <= maxLength ? text : text.substring(0, maxLength) + "...";
};

export default function PostCard({ post, collectiveSlug }: PostCardProps) {
  const supabase = createSupabaseBrowserClient();
  const [isPending, startTransition] = useTransition();
  const [optimisticLikeCount, setOptimisticLikeCount] = useState(
    post.like_count || 0
  );
  const [optimisticUserHasLiked, setOptimisticUserHasLiked] = useState(
    post.current_user_has_liked || false
  );
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Fetch current user once on mount
  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    fetchUser();

    // Re-sync optimistic state if parent props update
    setOptimisticLikeCount(post.like_count || 0);
    setOptimisticUserHasLiked(post.current_user_has_liked || false);
  }, [post.like_count, post.current_user_has_liked, supabase.auth]);

  const formattedDate = post.created_at
    ? new Date(post.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Date not available";

  const postUrl = collectiveSlug
    ? `/collectives/${collectiveSlug}/${post.id}`
    : `/posts/${post.id}`;

  const handleLikeToggle = async () => {
    if (!currentUserId) {
      alert("Please sign in to like posts.");
      return;
    }

    const prevCount = optimisticLikeCount;
    const prevLiked = optimisticUserHasLiked;

    setOptimisticUserHasLiked(!prevLiked);
    setOptimisticLikeCount(prevLiked ? prevCount - 1 : prevCount + 1);

    startTransition(async () => {
      const result = await togglePostLike(
        post.id,
        collectiveSlug,
        post.author_id
      );
      if (!result.success) {
        setOptimisticUserHasLiked(prevLiked);
        setOptimisticLikeCount(prevCount);
      } else {
        if (result.newLikeCount !== undefined)
          setOptimisticLikeCount(result.newLikeCount);
        if (result.userHadLiked !== undefined)
          setOptimisticUserHasLiked(result.userHadLiked);
      }
    });
  };

  return (
    <article className="bg-card p-4 sm:p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow duration-200 flex flex-col">
      <Link href={postUrl} className="group mb-auto">
        <h2 className="text-xl sm:text-2xl font-semibold mb-2 group-hover:text-primary transition-colors">
          {post.title}
        </h2>
      </Link>

      <p className="text-xs sm:text-sm text-muted-foreground mb-3">
        Published on {formattedDate}
      </p>

      <div className="prose dark:prose-invert max-w-none mb-4 text-sm sm:text-base flex-grow">
        <p>{truncateText(post.content)}</p>
      </div>

      <div className="flex items-center justify-between mt-auto pt-4 border-t">
        <Link
          href={postUrl}
          className="text-sm font-medium text-primary hover:underline"
        >
          Read more &rarr;
        </Link>

        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLikeToggle}
            disabled={isPending || !currentUserId}
            aria-label={optimisticUserHasLiked ? "Unlike post" : "Like post"}
            className="rounded-full"
          >
            <Heart
              className={`w-5 h-5 ${
                optimisticUserHasLiked
                  ? "fill-destructive text-destructive"
                  : "text-muted-foreground"
              }`}
            />
          </Button>
          <span className="text-sm text-muted-foreground tabular-nums">
            {optimisticLikeCount} {optimisticLikeCount === 1 ? "like" : "likes"}
          </span>
        </div>
      </div>
    </article>
  );
}
