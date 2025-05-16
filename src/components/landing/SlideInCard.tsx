"use client";

import { useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface SlideInCardProps {
  index: number;
  title: string;
  description: string;
}

export default function SlideInCard({
  index,
  title,
  description,
}: SlideInCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setVisible(true),
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const direction = index % 2 === 0 ? "-translate-x-10" : "translate-x-10";

  return (
    <div
      ref={ref}
      className={cn(
        "rounded-md border bg-card text-card-foreground p-6 transition-all duration-700",
        visible ? "opacity-100 translate-x-0" : `opacity-0 ${direction}`
      )}
    >
      <h3 className="font-medium mb-1">{title}</h3>
      <p className="text-muted-foreground text-sm">{description}</p>
    </div>
  );
}
