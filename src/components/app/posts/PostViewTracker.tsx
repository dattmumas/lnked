"use client";
import { useEffect } from "react";
import { incrementPostViewCount } from "@/app/actions/postActions"; // Will be uncommented after action creation

interface PostViewTrackerProps {
  postId: string;
}

export default function PostViewTracker({ postId }: PostViewTrackerProps) {
  useEffect(() => {
    let hasTracked = false;
    const trackingKey = `post_view_tracked_${postId}`;

    try {
      // Use sessionStorage to track if view was counted in this session
      // to prevent multiple increments on client-side navigation or refresh.
      if (sessionStorage.getItem(trackingKey)) {
        hasTracked = true;
      }
    } catch {
      // sessionStorage might not be available (e.g., SSR or restrictions).
      // console.warn("sessionStorage not available for view tracking");
    }

    if (!hasTracked && postId) {
      incrementPostViewCount(postId)
        .then(() => {
          try {
            sessionStorage.setItem(trackingKey, "true");
          } catch {
            // Could not set sessionStorage
            // console.warn("Failed to set sessionStorage item for view tracking");
          }
        })
        .catch((error: unknown) => {
          if (error instanceof Error) {
            console.error(
              "Failed to increment post view count:",
              error.message
            );
          } else {
            console.error(
              "Failed to increment post view count: An unknown error occurred",
              error
            );
          }
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  return null; // This component does not render anything visually
}
