"use client";

import { usePathname } from "next/navigation";
import nprogress from "nprogress";
import { useEffect, useRef } from "react";
import "nprogress/nprogress.css";

// Minimal nprogress config: thin bar, no spinner
nprogress.configure({ showSpinner: false, trickleSpeed: 120 });

export default function RouteProgress() {
  const pathname = usePathname();
  const previousPath = useRef<string>(pathname);

  useEffect((): void => {
    if (pathname !== previousPath.current) {
      nprogress.start();
      previousPath.current = pathname;
      // Simulate complete when component re-renders on new path
      // Give the page a tiny delay to ensure layout paint
      const timer = setTimeout(() => {
        nprogress.done();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [pathname]);

  return null; // This component doesn't render anything visible
}
