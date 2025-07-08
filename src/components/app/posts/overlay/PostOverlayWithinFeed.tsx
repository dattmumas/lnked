// src/components/app/posts/overlay/PostOverlayWithinFeed.tsx
'use client';

import { X } from 'lucide-react';
import dynamic from 'next/dynamic';
import React, { Suspense, useEffect, useLayoutEffect, useState } from 'react';

import { CenteredSpinner } from '@/components/ui/CenteredSpinner';


const PostOverlay = dynamic(() => import('./PostOverlay'));

interface Props {
  postId: string;
  onClose: () => void;
}

export default function PostOverlayWithinFeed({ postId, onClose }: Props) {
  const [style, setStyle] = useState<React.CSSProperties>({
    opacity: 0, // Start hidden until position is calculated
  });

  // Add the body class for scroll locking
  useEffect(() => {
    document.body.classList.add('center-feed-overlay-open');
    return () => {
      document.body.classList.remove('center-feed-overlay-open');
    };
  }, []);

  // Calculate the position of the overlay based on the main feed container
  useLayoutEffect(() => {
    const targetElement = document.getElementById(
      'center-feed-scroll-container',
    );
    if (!targetElement) return;

    // This function will be called whenever the target's size changes.
    const calculateStyle = () => {
      const rect = targetElement.getBoundingClientRect();
      const availableHeight = window.innerHeight - rect.top;

      setStyle({
        left: rect.left,
        width: rect.width,
        top: rect.top,
        height: availableHeight,
        opacity: 1,
        transition: 'opacity 0.1s ease-in, left 0.1s, width 0.1s', // Smoother transition
      });
    };

    // Use a ResizeObserver to react to layout changes of the target element.
    const observer = new ResizeObserver(calculateStyle);
    observer.observe(targetElement);

    // Initial calculation in case the observer doesn't fire immediately.
    calculateStyle();

    // Clean up by disconnecting the observer when the component unmounts.
    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    // The overlay is fixed but its position is dynamically calculated
    <div
      style={style}
      className="fixed z-50 p-2 pointer-events-none flex justify-center"
    >
      <div
        className="relative pointer-events-auto w-full h-full overflow-y-auto 
                   bg-surface-elevated-2 shadow-xl rounded-lg border border-border"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close overlay"
          className="absolute top-3 right-3 z-50 p-2 rounded-full bg-background/80 hover:bg-background transition-colors"
        >
          <X className="h-4 w-4 text-foreground" />
        </button>

        <Suspense fallback={<CenteredSpinner />}>
          <PostOverlay postId={postId} />
        </Suspense>
      </div>
    </div>
  );
}
