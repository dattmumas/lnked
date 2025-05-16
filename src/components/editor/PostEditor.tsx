"use client";

import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import LexicalErrorBoundary from "@lexical/react/LexicalErrorBoundary";

// Import default nodes (or specific ones as needed)
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { ListItemNode, ListNode } from "@lexical/list";
import { CodeHighlightNode, CodeNode } from "@lexical/code";
import { TableCellNode, TableNode, TableRowNode } from "@lexical/table";
import { AutoLinkNode, LinkNode } from "@lexical/link";

// Placeholder for editor theme - will be customized with Tailwind classes
const editorTheme = {
  ltr: "text-left",
  rtl: "text-right",
  paragraph: "mb-2", // Prose will handle base paragraph style
  quote: "border-l-4 border-primary pl-4 italic", // Custom quote style
  heading: {
    // Prose will apply font-serif from our tailwind.config.ts customization (once that's fixed)
    // We can add specific size/margin overrides if prose defaults aren't enough.
    h1: "text-3xl font-bold mb-4", // These sizes might be overridden by prose, or combine
    h2: "text-2xl font-semibold mb-3",
    h3: "text-xl font-semibold mb-2",
  },
  list: {
    ol: "list-decimal list-inside",
    ul: "list-disc list-inside",
    listitem: "mb-1",
    // nested.listitem will be inherited or can be styled if needed
  },
  link: "text-primary hover:underline",
  text: {
    bold: "font-bold",
    italic: "italic",
    underline: "underline",
    strikethrough: "line-through",
    code: "font-mono bg-muted text-muted-foreground px-1 py-0.5 rounded text-sm",
  },
  code: "bg-muted p-4 rounded font-mono text-sm overflow-x-auto", // For code blocks (prose might also style this)
};

// Catch any Lexical errors
function onError(error: Error) {
  console.error("[Lexical PostEditor]:", error);
}

interface PostEditorProps {
  initialEditorState?: string; // For loading existing content (JSON stringified editor state)
  onChange?: (editorStateJSON: string) => void;
  placeholder?: string;
}

export default function PostEditor({
  initialEditorState,
  onChange,
  placeholder = "Share your thoughts...",
}: PostEditorProps) {
  const initialConfig = {
    namespace: "LnkedPostEditor",
    theme: editorTheme,
    onError,
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
    editorState: initialEditorState || null, // Initialize with passed state or null for new editor
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="relative prose dark:prose-invert max-w-none w-full editor-container rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-within:outline-none focus-within:ring-1 focus-within:ring-ring">
        <RichTextPlugin
          contentEditable={
            <ContentEditable className="editor-input min-h-[300px] focus:outline-none resize-none" />
          }
          placeholder={
            <div className="editor-placeholder absolute top-2 left-3 text-muted-foreground pointer-events-none">
              {placeholder}
            </div>
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
        <HistoryPlugin />
        <LinkPlugin />
        <ListPlugin />
        {/* <AutoFocusPlugin /> */}
        {/* Other essential plugins will be added here: Markdown, Slash commands, Embeds, etc. */}
      </div>
      {/* Toolbar would go here - floating or fixed */}
    </LexicalComposer>
  );
}
