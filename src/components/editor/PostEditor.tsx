"use client";

import React, { useEffect } from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
// import LexicalErrorBoundary from "@lexical/react/LexicalErrorBoundary"; // Keep commented: type issue
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import type { EditorState, LexicalEditor } from "lexical";

// Node imports
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { ListItemNode, ListNode } from "@lexical/list";
import { CodeHighlightNode, CodeNode } from "@lexical/code";
import { TableCellNode, TableNode, TableRowNode } from "@lexical/table";
import { AutoLinkNode, LinkNode } from "@lexical/link";

const editorTheme = {
  ltr: "text-left",
  rtl: "text-right",
  paragraph: "mb-2",
  quote: "border-l-4 border-primary pl-4 italic",
  heading: {
    h1: "text-3xl font-bold mb-4",
    h2: "text-2xl font-semibold mb-3",
    h3: "text-xl font-semibold mb-2",
  },
  list: {
    ol: "list-decimal list-inside",
    ul: "list-disc list-inside",
    listitem: "mb-1",
  },
  link: "text-primary hover:underline",
  text: {
    bold: "font-bold",
    italic: "italic",
    underline: "underline",
    strikethrough: "line-through",
    code: "font-mono bg-muted text-muted-foreground px-1 py-0.5 rounded text-sm",
  },
  code: "bg-muted p-4 rounded font-mono text-sm overflow-x-auto",
};

function lexicalEditorOnError(error: Error, editor: LexicalEditor) {
  console.error("[Lexical PostEditor Global ErrorHandler]:", error, editor);
}

function LoadInitialStatePlugin({
  editorStateJSON,
}: {
  editorStateJSON: string | null | undefined;
}) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    if (editorStateJSON) {
      try {
        const initialEditorState = editor.parseEditorState(editorStateJSON);
        editor.setEditorState(initialEditorState);
      } catch (e) {
        console.error("Error parsing initial editor state:", e);
      }
    }
  }, [editor, editorStateJSON]);
  return null;
}

interface PostEditorProps {
  initialContentJSON?: string;
  onContentChange?: (editorStateJSON: string) => void;
  placeholder?: string;
}

export default function PostEditor({
  initialContentJSON,
  onContentChange,
  placeholder = "Share your thoughts...",
}: PostEditorProps) {
  const initialConfig = {
    namespace: "LnkedPostEditor",
    theme: editorTheme,
    onError: lexicalEditorOnError,
    nodes: [
      HeadingNode,
      ListNode,
      ListItemNode,
      QuoteNode,
      CodeNode,
      CodeHighlightNode,
      TableNode,
      TableCellNode,
      TableRowNode,
      AutoLinkNode,
      LinkNode,
    ],
  };

  const handleOnChange = (editorState: EditorState) => {
    if (onContentChange) {
      onContentChange(JSON.stringify(editorState.toJSON()));
    }
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="relative prose dark:prose-invert max-w-none w-full editor-container rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-within:outline-none focus-within:ring-1 focus-within:ring-ring">
        {/* TODO: ErrorBoundary prop is required by RichTextPlugin and needs a compatible component. */}
        {/* Current LexicalErrorBoundary import causes type issues. Needs local debugging. */}
        <RichTextPlugin
          contentEditable={
            <ContentEditable className="editor-input min-h-[300px] focus:outline-none resize-none" />
          }
          placeholder={
            <div className="editor-placeholder absolute top-2 left-3 text-muted-foreground pointer-events-none">
              {placeholder}
            </div>
          }
          // ErrorBoundary={...} // This prop is required
        />
        <HistoryPlugin />
        <LinkPlugin />
        <ListPlugin />
        {onContentChange && (
          <OnChangePlugin onChange={handleOnChange} ignoreSelectionChange />
        )}
        {initialContentJSON && (
          <LoadInitialStatePlugin editorStateJSON={initialContentJSON} />
        )}
      </div>
    </LexicalComposer>
  );
}
