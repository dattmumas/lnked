"use client";

import React from "react";
// TiptapToolbar is no longer rendered directly by EditorLayout
// import type { Editor } from "@tiptap/react"; // Import Editor type

interface EditorLayoutProps {
  children: React.ReactNode;
}

/**
 * Unified card layout for the editor page. Expects children in this order:
 * 1. Top row controls (title, status, etc.)
 * 2. Toolbar
 * 3. Editor canvas
 */
const EditorLayout: React.FC<EditorLayoutProps> = ({ children }) => {
  return (
    <div className="bg-background">
      <div className="max-w-3xl mx-auto mt-12">
        <div className="bg-card rounded-xl shadow-lg p-8 flex flex-col gap-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export default EditorLayout;
