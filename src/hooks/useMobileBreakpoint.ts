'use client';

import { useEffect, useState } from 'react';

/**
 * Returns `true` when the viewport width is below the given breakpoint.
 * Client-side only; safe to call from any React component.
 */
export function useMobileBreakpoint(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = (): void => {
      setIsMobile(window.innerWidth < breakpoint);
    };

    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [breakpoint]);

  return isMobile;
}
