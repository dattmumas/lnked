'use client';

import { usePathname } from 'next/navigation';
import nprogress from 'nprogress';
import React, { useEffect, useRef } from 'react';
import 'nprogress/nprogress.css';

// Constants
const PROGRESS_COMPLETE_DELAY = 300;

// Minimal nprogress config: thin bar, no spinner
nprogress.configure({ showSpinner: false, trickleSpeed: 120 });

export default function RouteProgress(): React.ReactElement | undefined {
  const pathname = usePathname();
  const previousPath = useRef<string>(pathname);

  useEffect((): (() => void) | void => {
    if (pathname !== previousPath.current) {
      nprogress.start();
      previousPath.current = pathname;
      // Simulate complete when component re-renders on new path
      // Give the page a tiny delay to ensure layout paint
      const timer = setTimeout(() => {
        nprogress.done();
      }, PROGRESS_COMPLETE_DELAY);
      return (): void => clearTimeout(timer);
    }
    return undefined;
  }, [pathname]);

  return undefined; // This component doesn't render anything visible
}
