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
        "relative bg-card border border-border rounded-xl shadow-sm p-6 transition-all duration-700 group hover:ring-2 hover:ring-primary hover:scale-[1.02] flex items-start",
        visible ? "opacity-100 translate-x-0" : `opacity-0 ${direction}`
      )}
    >
      <span className="absolute left-0 top-6 h-10 w-1 rounded-full bg-primary" />
      <div className="pl-4">
        <h3 className="font-bold text-lg mb-1 group-hover:text-accent transition-colors">
          {title}
        </h3>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
    </div>
  );
}
