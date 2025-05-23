'use client';
import { useEffect, useRef } from 'react';
import { incrementPostViewCount } from '@/app/actions/postActions';

interface PostViewTrackerProps {
  postId: string;
}

export default function PostViewTracker({ postId }: PostViewTrackerProps) {
  const hasTracked = useRef(false);
  const retryCount = useRef(0);
  const maxRetries = 3;

  useEffect(() => {
    if (!postId || hasTracked.current) return;

    const trackingKey = `post_view_tracked_${postId}`;
    let sessionTracked = false;

    try {
      // Use sessionStorage to track if view was counted in this session
      sessionTracked = !!sessionStorage.getItem(trackingKey);
    } catch (error) {
      console.warn('sessionStorage not available for view tracking:', error);
    }

    if (!sessionTracked) {
      const trackView = async () => {
        try {
          const result = await incrementPostViewCount(postId);

          if (result.success) {
            hasTracked.current = true;
            try {
              sessionStorage.setItem(trackingKey, 'true');
            } catch (error) {
              console.warn('Failed to set sessionStorage item:', error);
            }
          } else if (result.error && retryCount.current < maxRetries) {
            // Retry with exponential backoff
            retryCount.current++;
            const delay = Math.pow(2, retryCount.current) * 1000; // 2s, 4s, 8s

            console.warn(
              `View tracking failed, retrying in ${delay}ms:`,
              result.error,
            );
            setTimeout(trackView, delay);
          } else {
            console.error(
              'Failed to increment post view count after retries:',
              result.error,
            );
          }
        } catch (error) {
          console.error('Unexpected error tracking post view:', error);
        }
      };

      // Track with a small delay to avoid blocking initial render
      setTimeout(trackView, 1000);
    }
  }, [postId]);

  return null; // This component does not render anything visually
}
