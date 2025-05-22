"use client";
import React from "react";
import Link from "next/link";
import type { Database } from "@/lib/database.types";

// Basic post type with optional audioUrl
export type AudioPost = Database["public"]["Tables"]["posts"]["Row"] & {
  audio_url?: string | null;
};

interface AudioSliderProps {
  posts: (AudioPost & { collective_slug?: string | null })[];
}
export default function AudioSlider({ posts }: AudioSliderProps) {
  if (!posts.length) return null;

  return (
    <div className="mb-6 overflow-x-auto">
      <div className="flex space-x-4 pb-2">
        {posts.map((post) => (
          <Link
            key={post.id}
            href={post.slug ? `/posts/${post.slug}` : (post.collective_slug ? `/collectives/${post.collective_slug}/${post.id}` : `/posts/${post.id}`)}
            className="shrink-0 w-48 bg-card rounded-xl shadow p-3 hover:ring-2 hover:ring-primary transition"
          >
            <div className="h-24 bg-muted rounded mb-2" />
            <p className="text-sm font-medium line-clamp-2">{post.title}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
