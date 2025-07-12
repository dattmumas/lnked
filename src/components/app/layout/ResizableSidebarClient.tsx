'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

interface Props {
  initialWidth: number;
  minWidth?: number;
  maxWidth?: number;
  children: React.ReactNode;
}

export default function ResizableSidebarClient({
  initialWidth,
  minWidth = 384, // 24rem
  maxWidth = 896, // 56rem
  children,
}: Props): React.ReactElement {
  // Use initialWidth during server-side render to avoid hydration mismatch.
  const [width, setWidth] = useState<number>(initialWidth);
  const startX = useRef(0);
  const startWidth = useRef(0);

  // rAF throttling for width updates
  const frame = useRef<number | null>(null);
  const pending = useRef<number>(initialWidth);

  const clamp = useCallback(
    (value: number): number => Math.min(maxWidth, Math.max(minWidth, value)),
    [minWidth, maxWidth],
  );

  const applyWidthNow = useCallback((w: number): void => {
    setWidth(w);
    pending.current = w;
    // Update CSS variable on root so grid track picks up new width
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--rsb-width', `${w}px`);
    }
  }, []);

  // schedule update via rAF to coalesce pointermove
  const scheduleApply = useCallback(
    (w: number): void => {
      pending.current = w;
      if (frame.current !== null) return;
      frame.current = window.requestAnimationFrame(() => {
        frame.current = null;
        applyWidthNow(pending.current);
      });
    },
    [applyWidthNow],
  );

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      const delta = e.clientX - startX.current; // positive when dragging right
      // Dragging right (positive delta) should decrease sidebar width
      const next = clamp(startWidth.current - delta);
      scheduleApply(next);
    },
    [clamp, scheduleApply],
  );

  const stopDragging = useCallback(() => {
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', stopDragging);
    window.removeEventListener('pointercancel', stopDragging);

    window.localStorage.setItem('rsb-width', String(width));
  }, [onPointerMove, width]);

  const startDragging = useCallback(
    (e: React.PointerEvent<HTMLDivElement>): void => {
      startX.current = e.clientX;
      startWidth.current = width;
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', stopDragging);
      window.addEventListener('pointercancel', stopDragging);
    },
    [width, onPointerMove, stopDragging],
  );

  // On mount, read any persisted width from localStorage so the first
  // client render matches the server markup and we update after hydration.
  useEffect(() => {
    const stored = Number(window.localStorage.getItem('rsb-width'));
    if (!Number.isNaN(stored) && stored >= minWidth && stored <= maxWidth) {
      applyWidthNow(stored);
    } else if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty(
        '--rsb-width',
        `${initialWidth}px`,
      );
    }
  }, [minWidth, maxWidth, applyWidthNow, initialWidth]);

  return (
    <aside className="relative hidden xl:block flex-shrink-0 sticky top-16 h-[calc(100vh_-_4rem)] overflow-y-auto bg-background/[0.92] border-l border-border/30">
      {children}
      {/* Drag handle */}
      <div
        className="group absolute inset-y-0 left-0 w-4 z-40 cursor-col-resize flex items-center justify-center select-none hover:bg-foreground/5 transition-colors"
        onPointerDown={startDragging}
      >
        {/* drag indicator */}
        <svg
          className="h-4 w-4 text-gray-400/50 opacity-0 group-hover:opacity-50 transition-opacity"
          xmlns="http://www.w3.org/2000/svg"
          fill="currentColor"
          viewBox="0 0 4 20"
          aria-hidden="true"
        >
          <circle cx="2" cy="2" r="2" />
          <circle cx="2" cy="10" r="2" />
          <circle cx="2" cy="18" r="2" />
        </svg>
      </div>
    </aside>
  );
}
