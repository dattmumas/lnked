'use client';
import { useEffect, useRef } from 'react';

import { incrementPostViewCount } from '@/app/actions/postActions';

// Constants
const RETRY_BASE_DELAY = 2;
const DELAY_MULTIPLIER = 1000;
const INITIAL_TRACKING_DELAY = 1000;

interface PostViewTrackerProps {
  postId: string;
}

export default function PostViewTracker({
  postId,
}: PostViewTrackerProps): null {
  const hasTracked = useRef(false);
  const retryCount = useRef(0);
  const maxRetries = 3;

  useEffect((): void => {
    if (
      postId === undefined ||
      postId === null ||
      postId.length === 0 ||
      hasTracked.current
    )
      return;

    const trackingKey = `post_view_tracked_${postId}`;
    let sessionTracked = false;

    try {
      // Use sessionStorage to track if view was counted in this session
      sessionTracked = Boolean(sessionStorage.getItem(trackingKey));
    } catch (error: unknown) {
      console.warn('sessionStorage not available for view tracking:', error);
    }

    if (!sessionTracked) {
      const trackView = async (): Promise<void> => {
        try {
          const result = await incrementPostViewCount(postId);

          if (result.success) {
            hasTracked.current = true;
            try {
              sessionStorage.setItem(trackingKey, 'true');
            } catch (error: unknown) {
              console.warn('Failed to set sessionStorage item:', error);
            }
          } else if (
            result.error !== undefined &&
            result.error !== null &&
            retryCount.current < maxRetries
          ) {
            // Retry with exponential backoff
            retryCount.current++;
            const delay =
              Math.pow(RETRY_BASE_DELAY, retryCount.current) * DELAY_MULTIPLIER; // 2s, 4s, 8s

            console.warn(
              `View tracking failed, retrying in ${delay}ms:`,
              result.error,
            );
            setTimeout((): void => {
              void trackView();
            }, delay);
          } else {
            console.error(
              'Failed to increment post view count after retries:',
              result.error,
            );
          }
        } catch (error: unknown) {
          console.error('Unexpected error tracking post view:', error);
        }
      };

      // Track with a small delay to avoid blocking initial render
      setTimeout((): void => {
        void trackView();
      }, INITIAL_TRACKING_DELAY);
    }
  }, [postId]);

  return null; // This component does not render anything visually
}
