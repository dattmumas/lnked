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
  LexicalEditor,
  EditorState,
  createCommand,
} from "lexical";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { ListNode, ListItemNode } from "@lexical/list";
import { CodeNode, CodeHighlightNode } from "@lexical/code";
import { TableNode, TableRowNode, TableCellNode } from "@lexical/table";
import { LinkNode, AutoLinkNode } from "@lexical/link";
import {
  AutoLinkPlugin,
  createLinkMatcherWithRegExp,
} from "@lexical/react/LexicalAutoLinkPlugin";
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
import CodeHighlightPlugin from "./plugins/CodeHighlightPlugin";
import { GIFNode, GifPicker } from "./nodes/GIFNode";
import SlashMenuPlugin from "./plugins/SlashMenuPlugin";

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
  HorizontalRuleNode,
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
  GIFNode, // GIF block
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

// URL and email matchers for AutoLinkPlugin
const URL_MATCHER = createLinkMatcherWithRegExp(
  /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi
);
const EMAIL_MATCHER = createLinkMatcherWithRegExp(
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi,
  (text: string) => `mailto:${text}`
);
const MATCHERS = [URL_MATCHER, EMAIL_MATCHER];

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

export default function PostEditor({
  initialContentHTML,
  placeholder = "Share your thoughts...",
  onContentChange,
}: PostEditorProps) {
  const [showGifPicker, setShowGifPicker] = React.useState(false);
  const gifInsertRef = React.useRef<
    ((url: string, alt: string) => void) | null
  >(null);

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

  // CustomCommandPlugin with GIF picker integration
  function CustomCommandPluginWithGif() {
    const [editor] = useLexicalComposerContext();
    React.useEffect(() => {
      const removeGIF = editor.registerCommand(
        INSERT_GIF_COMMAND,
        () => {
          setShowGifPicker(true);
          gifInsertRef.current = (url: string, alt: string) => {
            setShowGifPicker(false);
            editor.update(() => {
              const selection = $getSelection();
              if (selection) {
                const node = new GIFNode(url, alt);
                selection.insertNodes([node]);
              }
            });
          };
          return true;
        },
        0
      );
      return () => {
        removeGIF();
      };
    }, [editor]);
    return null;
  }

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="flex flex-col h-full">
        <Toolbar onInsertGif={() => setShowGifPicker(true)} />
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
          <AutoLinkPlugin matchers={MATCHERS} />
          <CodeHighlightPlugin />
          <OnChangePlugin onChange={handleOnChange} ignoreSelectionChange />
          <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
          {initialContentHTML && (
            <LoadInitialHtmlPlugin html={initialContentHTML} />
          )}
          <CustomCommandPluginWithGif />
          <FloatingLinkEditorPlugin />
          <SlashMenuPlugin />
          {showGifPicker && (
            <GifPicker
              onSelect={(url, alt) => gifInsertRef.current?.(url, alt)}
              onClose={() => setShowGifPicker(false)}
            />
          )}
        </div>
      </div>
    </LexicalComposer>
  );
}
