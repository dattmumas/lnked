"use client";

import { useEffect, useRef } from "react";
import Lenis from "lenis";

const SmoothScroll = () => {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    lenisRef.current = new Lenis({
      // lerp: 0.1, // Optional: Adjust smoothness (0.05 to 0.1 is common)
      // duration: 1.2, // Optional: Adjust scroll duration
      // smoothWheel: true, // Optional: Might be useful but can interfere with some trackpads
    });

    function raf(time: number) {
      lenisRef.current?.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    return () => {
      lenisRef.current?.destroy();
      lenisRef.current = null;
    };
  }, []);

  return null; // This component does not render anything itself
};

export default SmoothScroll;
