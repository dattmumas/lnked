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
  // editor prop is removed, as toolbar is now part of mainContent passed by parent
}

const EditorLayout: React.FC<EditorLayoutProps> = ({
  settingsSidebar,
  mainContent,
  pageTitle,
  onPublish,
  isPublishing,
}) => {
  return (
    <div className="flex flex-col h-full">
      {/* Header specific to the editor layout */}
      <header className="bg-background border-b p-4 flex justify-between items-center sticky top-16 z-10">
        {/* Assuming main navbar is h-16 (4rem), so this editor header is sticky below it */}
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
            {isPublishing ? "Publishing..." : "Publish Post"}
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar: fixed width, scrolls independently. Height calculation assumes it starts below the editor header. */}
        <aside
          className="w-72 md:w-80 bg-background border-r p-6 overflow-y-auto 
                       flex flex-col space-y-6 
                       h-[calc(100vh-theme(space.16)-theme(space.16))] "
        >
          {settingsSidebar}
        </aside>

        {/* Main Editor Area: takes remaining space, scrolls independently */}
        <main className="flex-1 p-6 md:p-8 lg:p-10 overflow-y-auto h-[calc(100vh-theme(space.16)-theme(space.16))]">
          {mainContent}
        </main>
      </div>
    </div>
  );
};

export default EditorLayout;
