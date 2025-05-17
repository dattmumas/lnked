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
  $getSelection,
  $createParagraphNode,
  LexicalEditor,
  EditorState,
  createCommand,
  TextNode,
  RangeSelection,
} from "lexical";
import { $setBlocksType } from "@lexical/selection";
import {
  HeadingNode,
  $createHeadingNode,
  $createQuoteNode,
  QuoteNode,
  HeadingTagType,
} from "@lexical/rich-text";
import { ListNode, ListItemNode } from "@lexical/list";
import { CodeNode, CodeHighlightNode, $createCodeNode } from "@lexical/code";
import { TableNode, TableRowNode, TableCellNode } from "@lexical/table";
import { LinkNode, AutoLinkNode } from "@lexical/link";
// Import custom nodes
import { PollNode } from "./nodes/PollNode";
import { ExcalidrawNode } from "./nodes/ExcalidrawNode";
import { StickyNode } from "./nodes/StickyNode";
import { ImageNode } from "./nodes/ImageNode";
import { InlineImageNode } from "./nodes/InlineImageNode";
import { TweetNode } from "./nodes/TweetNode";
import { YouTubeNode } from "./nodes/YouTubeNode";
import { PageBreakNode } from "./nodes/PageBreakNode";
import { LayoutContainerNode } from "./nodes/LayoutContainerNode";
import { LayoutItemNode } from "./nodes/LayoutItemNode";
import { HorizontalRuleNode } from "@lexical/react/LexicalHorizontalRuleNode";
import Toolbar from "./Toolbar";
import FloatingLinkEditorPlugin from "./plugins/FloatingLinkEditorPlugin";

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
  // Custom nodes
  PollNode, // Poll block
  ExcalidrawNode, // Excalidraw drawing
  StickyNode, // Sticky note
  ImageNode, // Block image
  InlineImageNode, // Inline image
  TweetNode, // Tweet embed
  YouTubeNode, // YouTube embed
  PageBreakNode, // Page break
  LayoutContainerNode, // Columns container
  LayoutItemNode, // Column item
];

// Custom insert commands
export const INSERT_POLL_COMMAND = createCommand("INSERT_POLL_COMMAND");
export const INSERT_EXCALIDRAW_COMMAND = createCommand(
  "INSERT_EXCALIDRAW_COMMAND"
);
export const INSERT_STICKY_COMMAND = createCommand("INSERT_STICKY_COMMAND");
export const INSERT_IMAGE_COMMAND = createCommand("INSERT_IMAGE_COMMAND");
export const INSERT_INLINE_IMAGE_COMMAND = createCommand(
  "INSERT_INLINE_IMAGE_COMMAND"
);
export const INSERT_TWEET_COMMAND = createCommand("INSERT_TWEET_COMMAND");
export const INSERT_YOUTUBE_COMMAND = createCommand("INSERT_YOUTUBE_COMMAND");
export const INSERT_PAGE_BREAK_COMMAND = createCommand(
  "INSERT_PAGE_BREAK_COMMAND"
);
export const INSERT_LAYOUT_COMMAND = createCommand("INSERT_LAYOUT_COMMAND");
export const INSERT_HEADING_COMMAND = createCommand("INSERT_HEADING_COMMAND");
export const INSERT_PARAGRAPH_COMMAND = createCommand(
  "INSERT_PARAGRAPH_COMMAND"
);
export const INSERT_QUOTE_COMMAND = createCommand("INSERT_QUOTE_COMMAND");
export const INSERT_CODE_COMMAND = createCommand("INSERT_CODE_COMMAND");
export const INSERT_TABLE_COMMAND = createCommand("INSERT_TABLE_COMMAND");
export const INSERT_HR_COMMAND = createCommand("INSERT_HR_COMMAND");
export const INSERT_GIF_COMMAND = createCommand("INSERT_GIF_COMMAND");

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

function CustomCommandPlugin() {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    function removeSlashNode(selection: RangeSelection | null) {
      if (!selection) return;
      const anchor = selection.anchor;
      const node = anchor.getNode();
      if (
        node instanceof TextNode &&
        node.getTextContent() === "/" &&
        anchor.offset === 1
      ) {
        node.remove();
      }
    }
    // Register Poll
    const removePoll = editor.registerCommand(
      INSERT_POLL_COMMAND,
      () => {
        editor.update(() => {
          const selection = $getSelection();
          removeSlashNode(selection as RangeSelection);
          const pollNode = new PollNode("Poll question", [
            { text: "Option 1", uid: "1", votes: [] },
            { text: "Option 2", uid: "2", votes: [] },
          ]);
          selection?.insertNodes([pollNode]);
        });
        return true;
      },
      0
    );
    // Register Excalidraw
    const removeExcalidraw = editor.registerCommand(
      INSERT_EXCALIDRAW_COMMAND,
      () => {
        editor.update(() => {
          const selection = $getSelection();
          removeSlashNode(selection as RangeSelection);
          const node = new ExcalidrawNode();
          selection?.insertNodes([node]);
        });
        return true;
      },
      0
    );
    // Register Sticky
    const removeSticky = editor.registerCommand(
      INSERT_STICKY_COMMAND,
      () => {
        editor.update(() => {
          const selection = $getSelection();
          removeSlashNode(selection as RangeSelection);
          const node = new StickyNode();
          selection?.insertNodes([node]);
        });
        return true;
      },
      0
    );
    // Register Image
    const removeImage = editor.registerCommand(
      INSERT_IMAGE_COMMAND,
      () => {
        const url = window.prompt("Image URL:");
        if (!url) return true;
        editor.update(() => {
          const selection = $getSelection();
          removeSlashNode(selection as RangeSelection);
          const node = new ImageNode(url, "Image");
          selection?.insertNodes([node]);
        });
        return true;
      },
      0
    );
    // Register Inline Image
    const removeInlineImage = editor.registerCommand(
      INSERT_INLINE_IMAGE_COMMAND,
      () => {
        const url = window.prompt("Inline Image URL:");
        if (!url) return true;
        editor.update(() => {
          const selection = $getSelection();
          removeSlashNode(selection as RangeSelection);
          const node = new InlineImageNode(url, "Inline Image");
          selection?.insertNodes([node]);
        });
        return true;
      },
      0
    );
    // Register Tweet
    const removeTweet = editor.registerCommand(
      INSERT_TWEET_COMMAND,
      () => {
        const url = window.prompt("Tweet URL:");
        if (!url) return true;
        editor.update(() => {
          const selection = $getSelection();
          removeSlashNode(selection as RangeSelection);
          const node = new TweetNode(url); // To be implemented
          selection?.insertNodes([node]);
        });
        return true;
      },
      0
    );
    // Register YouTube
    const removeYouTube = editor.registerCommand(
      INSERT_YOUTUBE_COMMAND,
      () => {
        const url = window.prompt("YouTube URL:");
        if (!url) return true;
        editor.update(() => {
          const selection = $getSelection();
          removeSlashNode(selection as RangeSelection);
          const node = new YouTubeNode(url); // To be implemented
          selection?.insertNodes([node]);
        });
        return true;
      },
      0
    );
    // Register Page Break
    const removePageBreak = editor.registerCommand(
      INSERT_PAGE_BREAK_COMMAND,
      () => {
        editor.update(() => {
          const selection = $getSelection();
          removeSlashNode(selection as RangeSelection);
          const node = new PageBreakNode();
          selection?.insertNodes([node]);
        });
        return true;
      },
      0
    );
    // Register Layout (Columns)
    const removeLayout = editor.registerCommand(
      INSERT_LAYOUT_COMMAND,
      () => {
        editor.update(() => {
          const selection = $getSelection();
          removeSlashNode(selection as RangeSelection);
          const container = new LayoutContainerNode();
          // TODO: add LayoutItemNode children to container
          selection?.insertNodes([container]);
        });
        return true;
      },
      0
    );
    // Register Headings, Paragraph, Quote, Code, Table, HR, GIF
    const removeHeading = editor.registerCommand(
      INSERT_HEADING_COMMAND,
      (payload: { level: 1 | 2 | 3 }) => {
        editor.update(() => {
          const selection = $getSelection();
          removeSlashNode(selection as RangeSelection);
          const tag: HeadingTagType = `h${payload.level}` as HeadingTagType;
          if (selection) {
            $setBlocksType(selection, () => $createHeadingNode(tag));
          }
        });
        return true;
      },
      0
    );
    const removeParagraph = editor.registerCommand(
      INSERT_PARAGRAPH_COMMAND,
      () => {
        editor.update(() => {
          const selection = $getSelection();
          removeSlashNode(selection as RangeSelection);
          if (selection) {
            $setBlocksType(selection, () => $createParagraphNode());
          }
        });
        return true;
      },
      0
    );
    const removeQuote = editor.registerCommand(
      INSERT_QUOTE_COMMAND,
      () => {
        editor.update(() => {
          const selection = $getSelection();
          removeSlashNode(selection as RangeSelection);
          if (selection) {
            $setBlocksType(selection, () => $createQuoteNode());
          }
        });
        return true;
      },
      0
    );
    const removeCode = editor.registerCommand(
      INSERT_CODE_COMMAND,
      () => {
        editor.update(() => {
          const selection = $getSelection();
          removeSlashNode(selection as RangeSelection);
          if (selection) {
            $setBlocksType(selection, () => $createCodeNode());
          }
        });
        return true;
      },
      0
    );
    const removeTable = editor.registerCommand(
      INSERT_TABLE_COMMAND,
      () => {
        editor.update(() => {
          const selection = $getSelection();
          removeSlashNode(selection as RangeSelection);
          const node = new TableNode();
          selection?.insertNodes([node]);
        });
        return true;
      },
      0
    );
    const removeHR = editor.registerCommand(
      INSERT_HR_COMMAND,
      () => {
        editor.update(() => {
          const selection = $getSelection();
          removeSlashNode(selection as RangeSelection);
          const node = new HorizontalRuleNode();
          selection?.insertNodes([node]);
        });
        return true;
      },
      0
    );
    const removeGIF = editor.registerCommand(
      INSERT_GIF_COMMAND,
      () => {
        const url = window.prompt("GIF URL:");
        if (!url) return true;
        editor.update(() => {
          const selection = $getSelection();
          removeSlashNode(selection as RangeSelection);
          const node = new ImageNode(url, "GIF");
          selection?.insertNodes([node]);
        });
        return true;
      },
      0
    );
    return () => {
      removePoll();
      removeExcalidraw();
      removeSticky();
      removeImage();
      removeInlineImage();
      removeTweet();
      removeYouTube();
      removePageBreak();
      removeLayout();
      removeHeading();
      removeParagraph();
      removeQuote();
      removeCode();
      removeTable();
      removeHR();
      removeGIF();
    };
  }, [editor]);
  return null;
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
    theme: {
      paragraph: "editor-paragraph",
      quote: "editor-quote",
      heading: {
        h1: "editor-heading-h1",
        h2: "editor-heading-h2",
        h3: "editor-heading-h3",
      },
      code: "editor-code",
      list: {
        ul: "editor-list-ul",
        ol: "editor-list-ol",
        listitem: "editor-list-item",
      },
      link: "link",
      placeholder: "editor-placeholder",
    },
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
      <div className="flex flex-col h-full">
        <Toolbar />
        <div className="relative flex-1">
          <RichTextPlugin
            contentEditable={<ContentEditable className="editor-input" />}
            placeholder={
              <div className="editor-placeholder">{placeholder}</div>
            }
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
          <CustomCommandPlugin />
          <FloatingLinkEditorPlugin />
        </div>
      </div>
    </LexicalComposer>
  );
}
