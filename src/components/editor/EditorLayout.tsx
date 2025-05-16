"use client";

import React from "react";
import { Button } from "@/components/ui/button"; // Keep Button for header
// TiptapToolbar is no longer rendered directly by EditorLayout
// import type { Editor } from "@tiptap/react"; // Import Editor type

interface EditorLayoutProps {
  settingsSidebar: React.ReactNode; // For title input, visibility toggle, etc.
  mainContent: React.ReactNode; // For the Tiptap Toolbar + EditorContent component
  pageTitle: string;
  onPublish: () => void;
  isPublishing: boolean;
  publishButtonText?: string; // Optional prop for dynamic button text
  // editor prop is removed, as toolbar is now part of mainContent passed by parent
}

const EditorLayout: React.FC<EditorLayoutProps> = ({
  settingsSidebar,
  mainContent,
  pageTitle,
  onPublish,
  isPublishing,
  publishButtonText, // Destructure the new prop
}) => {
  return (
    <div className="flex flex-col h-full">
      {/* Header specific to the editor layout */}
      <header className="bg-background border-b p-4 flex justify-between items-center sticky top-0 z-10 h-16 flex-shrink-0">
        {/* Changed to top-0, added h-16 and flex-shrink-0 for explicit height */}
        <h1 className="text-xl font-semibold">{pageTitle}</h1>
        <div className="flex space-x-2">
          {/* <Button variant="outline">Preview</Button> */}
          {/* <Button variant="outline">Save Draft</Button> */}
          <Button
            onClick={() => {
              console.log("Publish button clicked in EditorLayout");
              onPublish();
            }}
            disabled={isPublishing}
          >
            {isPublishing
              ? "Processing..."
              : publishButtonText || "Publish Post"}
          </Button>
        </div>
      </header>

      {/* Apply flex-col for mobile and md:flex-row for medium screens and up */}
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        {/* Sidebar: scrolls independently */}
        <aside
          className="w-full md:w-72 lg:w-80 bg-background border-b md:border-b-0 md:border-r p-6 overflow-y-auto 
                       flex flex-col space-y-6 flex-shrink-0"
          // Added w-full for mobile, adjusted md/lg widths, added flex-shrink-0
          // Added border-b for mobile separation, md:border-b-0 to remove it on larger screens
        >
          {settingsSidebar}
        </aside>

        {/* Main Editor Area: scrolls independently */}
        <main className="flex-1 p-6 md:p-8 lg:p-10 overflow-y-auto">
          {/* Removed h-[calc(...)] - should now fill available height */}
          {mainContent}
        </main>
      </div>
    </div>
  );
};

export default EditorLayout;
