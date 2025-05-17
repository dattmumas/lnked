"use client";
import { useRef, useState, useEffect } from "react";
import Image, { ImageProps } from "next/image";
import { cn } from "@/lib/utils";

interface FadeInImageProps extends ImageProps {
  className?: string;
  alt: string;
}

export default function FadeInImage({ className, ...props }: FadeInImageProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => e.isIntersecting && setVisible(true),
      { threshold: 0.25 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        "transition-opacity duration-700",
        visible ? "opacity-100" : "opacity-0",
        className
      )}
    >
      <Image {...props} alt={props.alt} />
    </div>
  );
}
