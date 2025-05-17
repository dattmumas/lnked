"use client";

import * as React from "react";
import { useCallback, useEffect } from "react";
import {
  LexicalComposer,
  type InitialConfigType,
} from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { TRANSFORMERS } from "@lexical/markdown";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import {
  FORMAT_TEXT_COMMAND,
  $getSelection,
  $isRangeSelection,
  $createParagraphNode,
  LexicalEditor,
  EditorState,
} from "lexical";
import { $setBlocksType } from "@lexical/selection";
import {
  HeadingNode,
  $createHeadingNode,
  $createQuoteNode,
  QuoteNode,
} from "@lexical/rich-text";
import {
  ListNode,
  ListItemNode,
  INSERT_UNORDERED_LIST_COMMAND,
  INSERT_ORDERED_LIST_COMMAND,
} from "@lexical/list";
import { CodeNode, CodeHighlightNode, $createCodeNode } from "@lexical/code";
import { TableNode, TableRowNode, TableCellNode } from "@lexical/table";
import { LinkNode, AutoLinkNode, TOGGLE_LINK_COMMAND } from "@lexical/link";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  List as ListIcon,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  Link2Off,
  Image as ImageIcon,
  Table as TableIcon,
  Redo2,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const editorNodes = [
  HeadingNode,
  ListNode,
  ListItemNode,
  QuoteNode,
  CodeNode,
  CodeHighlightNode,
  TableNode,
  TableRowNode,
  TableCellNode,
  LinkNode,
  AutoLinkNode,
];

function lexicalEditorOnError(error: Error) {
  console.error("Lexical editor error:", error);
}

interface PostEditorProps {
  initialContentHTML?: string;
  placeholder?: string;
  onContentChange?: (html: string) => void;
}

function LoadInitialHtmlPlugin({ html }: { html: string }) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    if (!html) return;
    try {
      // Insert HTML directly into the root node
      editor.update(() => {
        const root = editor.getRootElement();
        if (root) root.innerHTML = html;
      });
    } catch (error) {
      console.error("Error parsing initial HTML content:", error);
    }
  }, [editor, html]);
  return null;
}

function Toolbar() {
  const [editor] = useLexicalComposerContext();
  // Helper to dispatch block type changes
  const setBlockType = useCallback(
    (type: "paragraph" | "h1" | "h2" | "h3" | "quote" | "code") => {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          switch (type) {
            case "h1":
              $setBlocksType(selection, () => $createHeadingNode("h1"));
              break;
            case "h2":
              $setBlocksType(selection, () => $createHeadingNode("h2"));
              break;
            case "h3":
              $setBlocksType(selection, () => $createHeadingNode("h3"));
              break;
            case "quote":
              $setBlocksType(selection, () => $createQuoteNode());
              break;
            case "code":
              $setBlocksType(selection, () => $createCodeNode());
              break;
            default:
              $setBlocksType(selection, () => $createParagraphNode());
          }
        }
      });
    },
    [editor]
  );

  // Insert image by URL
  const insertImage = useCallback(() => {
    const url = window.prompt("Enter image URL:");
    if (!url) return;
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        // Insert as HTML (Lexical will treat as generic element)
        const img = document.createElement("img");
        img.src = url;
        img.alt = "Image";
        const root = editor.getRootElement();
        if (root) {
          root.appendChild(img);
        }
      }
    });
  }, [editor]);

  // Insert a basic 2x2 table
  const insertTable = useCallback(() => {
    editor.update(() => {
      // This is a minimal approach; for full-featured tables, a custom node/plugin is needed
      const root = editor.getRootElement();
      if (root) {
        const table = document.createElement("table");
        table.className = "table-auto border border-border my-2";
        for (let i = 0; i < 2; i++) {
          const row = document.createElement("tr");
          for (let j = 0; j < 2; j++) {
            const cell = document.createElement("td");
            cell.className = "border border-border px-2 py-1";
            cell.innerText = "";
            row.appendChild(cell);
          }
          table.appendChild(row);
        }
        root.appendChild(table);
      }
    });
  }, [editor]);

  // Insert horizontal rule
  const insertHorizontalRule = useCallback(() => {
    editor.update(() => {
      const root = editor.getRootElement();
      if (root) {
        const hr = document.createElement("hr");
        hr.className = "my-4 border-t border-border";
        root.appendChild(hr);
      }
    });
  }, [editor]);

  // Insert link
  const insertLink = useCallback(() => {
    const url = window.prompt("Enter URL for link:");
    if (url) {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, { url });
    }
  }, [editor]);

  // Remove link
  const removeLink = useCallback(() => {
    editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
  }, [editor]);

  // Undo/Redo
  const undo = useCallback(() => {
    // @ts-expect-error: Lexical allows string commands for built-in undo
    editor.dispatchCommand("history-undo", undefined);
  }, [editor]);
  const redo = useCallback(() => {
    // @ts-expect-error: Lexical allows string commands for built-in redo
    editor.dispatchCommand("history-redo", undefined);
  }, [editor]);

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 border-b bg-background rounded-t-md sticky top-0 z-10">
      <Button variant="ghost" size="icon" onClick={undo} title="Undo">
        <Undo2 size={18} />
      </Button>
      <Button variant="ghost" size="icon" onClick={redo} title="Redo">
        <Redo2 size={18} />
      </Button>
      <div className="h-6 w-px bg-border mx-1" />
      <Button
        variant="ghost"
        size="icon"
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")}
        title="Bold"
      >
        <Bold size={18} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")}
        title="Italic"
      >
        <Italic size={18} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline")}
        title="Underline"
      >
        <UnderlineIcon size={18} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() =>
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough")
        }
        title="Strikethrough"
      >
        <Strikethrough size={18} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "code")}
        title="Inline Code"
      >
        <Code2 size={18} />
      </Button>
      <div className="h-6 w-px bg-border mx-1" />
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setBlockType("h1")}
        title="Heading 1"
      >
        <Heading1 size={18} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setBlockType("h2")}
        title="Heading 2"
      >
        <Heading2 size={18} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setBlockType("h3")}
        title="Heading 3"
      >
        <Heading3 size={18} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setBlockType("paragraph")}
        title="Paragraph"
      >
        P
      </Button>
      <div className="h-6 w-px bg-border mx-1" />
      <Button
        variant="ghost"
        size="icon"
        onClick={() =>
          editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)
        }
        title="Bullet List"
      >
        <ListIcon size={18} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() =>
          editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)
        }
        title="Ordered List"
      >
        <ListOrdered size={18} />
      </Button>
      <div className="h-6 w-px bg-border mx-1" />
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setBlockType("quote")}
        title="Blockquote"
      >
        <Quote size={18} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setBlockType("code")}
        title="Code Block"
      >
        <Code2 size={18} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={insertHorizontalRule}
        title="Horizontal Rule"
      >
        ─
      </Button>
      <div className="h-6 w-px bg-border mx-1" />
      <Button
        variant="ghost"
        size="icon"
        onClick={insertLink}
        title="Insert Link"
      >
        <LinkIcon size={18} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={removeLink}
        title="Remove Link"
      >
        <Link2Off size={18} />
      </Button>
      <div className="h-6 w-px bg-border mx-1" />
      <Button
        variant="ghost"
        size="icon"
        onClick={insertImage}
        title="Insert Image"
      >
        <ImageIcon size={18} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={insertTable}
        title="Insert Table"
      >
        <TableIcon size={18} />
      </Button>
    </div>
  );
}

export default function PostEditor({
  initialContentHTML,
  placeholder = "Share your thoughts...",
  onContentChange,
}: PostEditorProps) {
  const initialConfig: InitialConfigType = {
    namespace: "LnkedPostEditor",
    onError: lexicalEditorOnError,
    nodes: editorNodes,
  };

  const handleOnChange = useCallback(
    (editorState: EditorState, editor: LexicalEditor) => {
      editorState.read(() => {
        const html = editor.getRootElement()?.innerHTML || "";
        onContentChange?.(html);
      });
    },
    [onContentChange]
  );

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div>
        <Toolbar />
        <div>
          <RichTextPlugin
            contentEditable={<ContentEditable />}
            placeholder={<div>{placeholder}</div>}
            ErrorBoundary={LexicalErrorBoundary}
          />
          <HistoryPlugin />
          <ListPlugin />
          <LinkPlugin />
          <OnChangePlugin onChange={handleOnChange} ignoreSelectionChange />
          <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
          {initialContentHTML && (
            <LoadInitialHtmlPlugin html={initialContentHTML} />
          )}
        </div>
      </div>
    </LexicalComposer>
  );
}
