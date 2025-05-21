"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";

export interface FileExplorerProps {
  personalPosts: { id: string; title: string; status: string }[];
  collectives: {
    id: string;
    name: string;
    posts: { id: string; title: string; status: string }[];
  }[];
}

export function FileExplorer({
  personalPosts,
  collectives,
}: FileExplorerProps) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const isActive = (postId: string) => pathname.includes(postId);

  return (
    <nav className="flex flex-col gap-8 py-8 px-4 w-full">
      {/* Personal newsletter section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="uppercase text-xs font-bold tracking-wider text-foreground/80">
            Personal Newsletter
          </span>
          <Link
            href="/posts/new"
            className="ml-2 text-primary hover:underline flex items-center gap-1"
            aria-label="Create new personal post"
          >
            <Plus size={16} />
            <span className="sr-only">New Post</span>
          </Link>
        </div>
        <ul className="ml-2 space-y-1">
          {personalPosts.length === 0 && (
            <li className="text-xs text-muted-foreground italic">No posts</li>
          )}
          {personalPosts.map((post) => (
            <li key={post.id}>
              <Link
                href={`/posts/${post.id}/edit`}
                className={`block px-2 py-1 rounded-md transition-colors text-sm ${
                  isActive(post.id)
                    ? "bg-sidebar-accent/10 text-sidebar-accent font-medium"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/5 hover:text-sidebar-foreground"
                }`}
                aria-current={isActive(post.id) ? "page" : undefined}
              >
                {post.title}
              </Link>
            </li>
          ))}
        </ul>
      </div>
      {/* Divider */}
      <div className="border-t border-border my-2" />
      {/* Collectives section */}
      <div>
        <span className="uppercase text-xs font-bold tracking-wider text-foreground/80 mb-2 block">
          Collectives
        </span>
        <ul className="space-y-4">
          {collectives.length === 0 && (
            <li className="text-xs text-muted-foreground italic ml-2">
              No collectives
            </li>
          )}
          {collectives.map((col) => {
            const isColExpanded = expanded[col.id] ?? true;
            return (
              <li key={col.id}>
                <button
                  type="button"
                  className="flex items-center w-full text-left px-2 py-1 rounded hover:bg-muted/40 focus:outline-none"
                  onClick={() =>
                    setExpanded((prev) => ({
                      ...prev,
                      [col.id]: !isColExpanded,
                    }))
                  }
                  aria-expanded={isColExpanded}
                  aria-controls={`collective-posts-${col.id}`}
                >
                  {isColExpanded ? (
                    <ChevronDown size={16} className="mr-1" />
                  ) : (
                    <ChevronRight size={16} className="mr-1" />
                  )}
                  <span className="font-semibold text-sidebar-foreground">
                    {col.name}
                  </span>
                </button>
                {isColExpanded && (
                  <ul
                    id={`collective-posts-${col.id}`}
                    className="ml-6 mt-1 space-y-1"
                  >
                    {col.posts.length === 0 && (
                      <li className="text-xs text-muted-foreground italic">
                        No posts
                      </li>
                    )}
                    {col.posts.map((post) => (
                      <li key={post.id}>
                        <Link
                          href={`/posts/${post.id}/edit`}
                          className={`block px-2 py-1 rounded-md transition-colors text-sm ${
                            isActive(post.id)
                              ? "bg-sidebar-accent/10 text-sidebar-accent font-medium"
                              : "text-sidebar-foreground/80 hover:bg-sidebar-accent/5 hover:text-sidebar-foreground"
                          }`}
                          aria-current={isActive(post.id) ? "page" : undefined}
                        >
                          {post.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}

export default FileExplorer;
