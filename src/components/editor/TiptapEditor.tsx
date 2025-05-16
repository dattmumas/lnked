"use client";

import { EditorContent, type Editor } from "@tiptap/react";
import React from "react";

interface TiptapEditorDisplayProps {
  editor: Editor | null;
  className?: string; // Optional className for the direct wrapper of EditorContent
}

const TiptapEditorDisplay: React.FC<TiptapEditorDisplayProps> = ({
  editor,
  className = "", // Default classes removed to make it borderless by default
}) => {
  if (!editor) {
    // Optionally render a skeleton or loading state if editor is null initially
    return (
      <div
        className={`${className} min-h-[200px] animate-pulse bg-muted rounded-md`}
      ></div>
    );
  }

  return (
    // Removed default min-height and padding from here.
    // The .ProseMirror class itself (set in editorProps) will determine content styling.
    <div className={className}>
      <EditorContent editor={editor} />
    </div>
  );
};

export default TiptapEditorDisplay;
