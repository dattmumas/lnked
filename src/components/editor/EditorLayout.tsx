"use client";

import React from "react";
import type { ReactNode } from "react";

interface EditorLayoutProps {
  toolbar?: ReactNode;
  settingsSidebar?: ReactNode;
  pageTitle?: string;
  children: ReactNode; // canvas/content
}

// Wire-frame layout:
// ┌ fileExplorer | ┌ metadataBar
// |              | ├ toolbar
// |              | └ canvas (children)
export default function EditorLayout({
  toolbar,
  settingsSidebar,
  pageTitle,
  children,
}: EditorLayoutProps) {
  return (
    <div className="flex h-screen bg-background">
      <main className="flex-1 flex flex-col min-w-0">
        {pageTitle && (
          <div className="border-b border-border px-6 py-3">
            <h1 className="text-xl font-semibold">{pageTitle}</h1>
          </div>
        )}

        {toolbar && (
          <div className="border-b border-border px-6 py-2">{toolbar}</div>
        )}

        <div className="flex flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
          {settingsSidebar && (
            <aside className="w-72 shrink-0 border-l border-border px-6 py-4 overflow-y-auto">
              {settingsSidebar}
            </aside>
          )}
        </div>
      </main>
    </div>
  );
}
