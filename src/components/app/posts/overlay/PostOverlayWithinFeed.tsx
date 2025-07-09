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

      // Ensure overlay never goes above the navbar (64px height)
      const navbarHeight = 64;
      const minTop = navbarHeight;
      const actualTop = Math.max(rect.top, minTop);

      // Calculate available height from the adjusted top position
      const availableHeight = window.innerHeight - actualTop;

      setStyle({
        left: rect.left,
        width: rect.width,
        top: actualTop,
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
      {/* overlay shell -- provides relative anchor for the button */}
      <div className="relative w-full h-full shadow-xl shadow-[inset_0_6px_8px_-6px_rgba(0,0,0,0.15)] rounded-lg border border-border bg-surface-elevated-2">
        {/* 1️⃣ close button stays pinned to the shell */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close overlay"
          className="absolute top-3 left-3 z-10 p-2 rounded-full transition-colors bg-red-500/10 hover:bg-red-500/20 focus:outline-none focus:ring-2 focus:ring-red-500/50 pointer-events-auto"
        >
          <X className="h-4 w-4 text-red-700" />
        </button>

        {/* scrolling content lives in its own div */}
        <div
          className="h-full overflow-y-auto pointer-events-auto pt-2"
          style={{
            WebkitMaskImage:
              'linear-gradient(to bottom, transparent 0, #000 12px, #000 calc(100% - 12px), transparent 100%)',
            maskImage:
              'linear-gradient(to bottom, transparent 0, #000 12px, #000 calc(100% - 12px), transparent 100%)',
          }}
        >
          <Suspense fallback={<CenteredSpinner />}>
            <PostOverlay postId={postId} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
