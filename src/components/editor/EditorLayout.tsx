"use client";

import React from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface EditorLayoutProps {
  pageTitle: string;
  settingsSidebar: ReactNode;
  mainContent: ReactNode;
  onPublish?: () => void;
  isPublishing?: boolean;
  publishButtonText?: string;
}

/**
 * New EditorLayout: simple two column layout with an optional right sidebar
 * for post settings. A header displays the page title and publish button.
 */
function EditorLayout({
  pageTitle,
  settingsSidebar,
  mainContent,
  onPublish,
  isPublishing = false,
  publishButtonText = "Publish",
}: EditorLayoutProps) {
  return (
    <div className="flex h-screen bg-background">
      {/* Main content area */}
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex items-center justify-between border-b border-border px-8 py-4">
          <h1 className="text-lg font-semibold">{pageTitle}</h1>
          {onPublish && (
            <Button
              type="button"
              onClick={onPublish}
              disabled={isPublishing}
              size="sm"
            >
              {isPublishing ? "Publishing..." : publishButtonText}
            </Button>
          )}
        </div>
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 overflow-y-auto px-8 py-6">{mainContent}</div>
          <aside className="hidden md:block w-80 border-l border-border px-6 py-6 overflow-y-auto">
            {settingsSidebar}
          </aside>
        </div>
      </div>
    </div>
  );
}

export default EditorLayout;
