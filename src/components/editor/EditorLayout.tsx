"use client";

import React from "react";
import type { ReactNode } from "react";
// TiptapToolbar is no longer rendered directly by EditorLayout
// import type { Editor } from "@tiptap/react"; // Import Editor type

interface EditorLayoutProps {
  sidebar: ReactNode;
  metadataBar: ReactNode;
  children: ReactNode;
}

/**
 * EditorLayout: left sidebar (file explorer), top metadata bar, and main editor area (toolbar + content).
 * Sidebar is hidden on mobile. Top bar is sticky. Main area scrolls independently.
 * No card/container for the main area. Everything is grid-aligned and symmetrical.
 */
function EditorLayout({ sidebar, metadataBar, children }: EditorLayoutProps) {
  return (
    <div className="flex h-screen bg-background">
      {/* Left sidebar: file explorer */}
      <aside className="hidden md:flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border w-64 min-w-64 max-w-64 h-full overflow-y-auto">
        {sidebar}
      </aside>
      {/* Main content area: flex column for top bar + editor */}
      <div className="flex flex-col flex-1 min-h-0">
        {/* Top metadata bar */}
        <div className="sticky top-0 z-10 bg-background border-b border-border px-8 py-4 flex-shrink-0">
          {metadataBar}
        </div>
        {/* Editor canvas + toolbar region, no card/container */}
        <div className="flex-1 flex flex-col min-h-0 px-8 py-6">{children}</div>
      </div>
    </div>
  );
}

export default EditorLayout;
