"use client";

import Link from "next/link";
import type { Database } from "@/lib/database.types"; // Assuming this path is correct
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react"; // Using lucide-react for icons
import { useState, useTransition, useEffect } from "react";
import { togglePostLike } from "@/app/actions/likeActions"; // Adjust path if it moves
import { createSupabaseBrowserClient } from "@/lib/supabase";

// Infer Post type from your Database types if possible, or define explicitly
// This is a simplified version based on what CollectivePage fetches.
// You'll want to refine this based on your actual 'posts' table structure from database.types.ts
type PostWithLikes = Database["public"]["Tables"]["posts"]["Row"] & {
  // These would be fetched additionally when loading posts for the card
  like_count?: number;
  current_user_has_liked?: boolean;
};
// If posts table is not yet in Database type, use a more generic placeholder:
// type Post = {
//   id: string;
//   title: string;
//   content: string | null;
//   created_at: string;
//   // add other fields that CollectivePage selects and PostCard needs
// };

interface PostCardProps {
  post: PostWithLikes;
  collectiveSlug: string | null;
  // Optional: pass current user ID if easily available, otherwise action will get it
  // currentUserId?: string | null;
}

// Function to truncate content for a preview
const truncateText = (text: string | null, maxLength: number = 150): string => {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
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

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    fetchUser();
    // Initialize optimistic state from props when component mounts or post changes
    setOptimisticLikeCount(post.like_count || 0);
    setOptimisticUserHasLiked(post.current_user_has_liked || false);
  }, [post.like_count, post.current_user_has_liked, supabase.auth]);

  // Ensure created_at is valid and format it
  const formattedDate = post.created_at
    ? new Date(post.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Date not available";

  const postUrl = collectiveSlug
    ? `/collectives/${collectiveSlug}/${post.id}`
    : `/posts/${post.id}`; // Fallback for individual posts (assuming /posts/[postId] route)

  const handleLikeToggle = async () => {
    if (!currentUserId) {
      // Optionally redirect to sign-in or show a message
      alert("Please sign in to like posts.");
      return;
    }

    // Optimistic update
    const previousLikeCount = optimisticLikeCount;
    const previousUserHasLiked = optimisticUserHasLiked;

    setOptimisticUserHasLiked(!optimisticUserHasLiked);
    setOptimisticLikeCount(
      optimisticUserHasLiked ? optimisticLikeCount - 1 : optimisticLikeCount + 1
    );

    startTransition(async () => {
      const result = await togglePostLike(
        post.id,
        collectiveSlug,
        post.author_id
      );
      if (!result.success) {
        // Revert optimistic update on error
        setOptimisticUserHasLiked(previousUserHasLiked);
        setOptimisticLikeCount(previousLikeCount);
        alert(result.message || "Failed to update like.");
      } else {
        // Optionally update with server-confirmed state if different
        if (result.newLikeCount !== undefined) {
          setOptimisticLikeCount(result.newLikeCount);
        }
        if (result.userHadLiked !== undefined) {
          setOptimisticUserHasLiked(result.userHadLiked);
        }
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
        {/* For simplicity, rendering truncated text. For actual HTML/Markdown content, use a proper renderer */}
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
                  ? "fill-red-500 text-red-500"
                  : "text-muted-foreground"
              }`}
            />
          </Button>
          <span className="text-sm text-muted-foregroundtabular-nums">
            {optimisticLikeCount} {optimisticLikeCount === 1 ? "like" : "likes"}
          </span>
        </div>
      </div>
    </article>
  );
}
