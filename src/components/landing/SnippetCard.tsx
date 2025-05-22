"use client"; // Mark as a Client Component

import React from "react"; // Removed useEffect, useRef, useState
import {
  ArrowUpRight,
  Brain,
  Globe,
  Feather,
  Code as CodeIcon,
  Leaf,
  Lightbulb,
  Network,
  BookOpen,
  type LucideIcon,
} from "lucide-react"; // Import used icons and LucideIcon type

// Icon mapping
const iconMap: Record<string, LucideIcon> = {
  Brain,
  Globe,
  Feather,
  Code: CodeIcon, // Rename Code to CodeIcon to avoid conflict with HTML element
  Leaf,
  Lightbulb,
  Network,
  BookOpen,
};

interface SnippetCardProps {
  headline: string;
  iconName?: string; // Changed from icon: React.ElementType
  categoryHint?: string;
  abstract?: string;
  className?: string;
  // animationDelay?: string; // Removed animationDelay prop
}

export default function SnippetCard({
  headline,
  iconName,
  categoryHint,
  abstract,
  className,
}: // animationDelay, // Removed animationDelay prop
SnippetCardProps) {
  // Removed cardRef, isVisible state, and useEffect for IntersectionObserver

  const IconComponent = iconName ? iconMap[iconName] : null;

  return (
    <div
      // ref={cardRef} // Removed ref
      className={`
        bg-card text-card-foreground border border-border rounded-lg p-4 md:p-6 
        flex flex-col justify-between space-y-3 
        hover:border-primary/60 hover:shadow-lg hover:shadow-muted/30 
        transition-all duration-300 ease-in-out group 
        transform hover:-translate-y-1 hover:scale-[1.02]
        opacity-100 
        ${className || ""}
      `}
      // style={isVisible ? { animationDelay: animationDelay || "0s" } : {}} // Removed style for animationDelay
    >
      <div>
        {IconComponent && (
          <IconComponent className="w-6 h-6 mb-2 text-muted-foreground group-hover:text-foreground transition-colors" />
        )}
        <h3 className="text-lg md:text-xl font-semibold font-sans leading-tight group-hover:text-accent transition-colors">
          {headline}
        </h3>
        {/* Placeholder for abstract text lines */}
        {abstract ? (
          <p className="mt-2 text-sm text-muted-foreground group-hover:text-foreground transition-colors line-clamp-2">
            {abstract}
          </p>
        ) : (
          <div className="mt-2 space-y-1.5">
            <div className="h-2 w-3/4 bg-muted rounded group-hover:bg-muted-foreground/30 transition-colors"></div>
            <div className="h-2 w-1/2 bg-muted rounded group-hover:bg-muted-foreground/30 transition-colors"></div>
          </div>
        )}
      </div>

      <div className="flex justify-between items-end pt-2">
        {categoryHint && (
          <span className="text-xs text-muted-foreground font-mono group-hover:text-foreground transition-colors">
            {categoryHint}
          </span>
        )}
        <ArrowUpRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:text-accent transition-all duration-300 transform group-hover:rotate-[360deg]" />
      </div>
    </div>
  );
}
