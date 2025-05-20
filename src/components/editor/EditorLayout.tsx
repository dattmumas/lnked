"use client";

import React from "react";
import type { ReactNode } from "react";

interface EditorLayoutProps {
  fileExplorer?: ReactNode;
  metadataBar?: ReactNode;
  toolbar?: ReactNode;
  children: ReactNode; // canvas/content
}

// Wire-frame layout:
// ┌ fileExplorer | ┌ metadataBar
// |              | ├ toolbar
// |              | └ canvas (children)
export default function EditorLayout({
  fileExplorer,
  metadataBar,
  toolbar,
  children,
}: EditorLayoutProps) {
  return (
    <div className="flex h-screen bg-background divide-x divide-border">
      {/* Left sidebar */}
      {fileExplorer && (
        <aside className="w-64 shrink-0 overflow-y-auto">{fileExplorer}</aside>
      )}

      {/* Main column */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Metadata bar */}
        {metadataBar && (
          <div className="border-b border-border px-6 py-3 flex items-center gap-4">
            {metadataBar}
          </div>
        )}

        {/* Toolbar */}
        {toolbar && (
          <div className="border-b border-border px-6 py-2">{toolbar}</div>
        )}

        {/* Canvas / Editor */}
        <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
      </main>
    </div>
  );
}
