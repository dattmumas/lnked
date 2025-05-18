/*
 * SlashMenuPlugin for Lnked, inspired by Lexical Playground (MIT License)
 * Shows a floating menu when '/' is typed at the start of a new line.
 */
import React, { useEffect, useRef, useState } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getSelection,
  $isRangeSelection,
  TextNode,
  COMMAND_PRIORITY_LOW,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_ESCAPE_COMMAND,
} from "lexical";
import {
  INSERT_POLL_COMMAND,
  INSERT_EXCALIDRAW_COMMAND,
  INSERT_STICKY_COMMAND,
  INSERT_IMAGE_COMMAND,
  INSERT_INLINE_IMAGE_COMMAND,
  INSERT_TWEET_COMMAND,
  INSERT_YOUTUBE_COMMAND,
  INSERT_PAGE_BREAK_COMMAND,
  INSERT_LAYOUT_COMMAND,
  INSERT_HEADING_COMMAND,
  INSERT_PARAGRAPH_COMMAND,
  INSERT_QUOTE_COMMAND,
  INSERT_CODE_COMMAND,
  INSERT_TABLE_COMMAND,
  INSERT_HR_COMMAND,
  INSERT_GIF_COMMAND,
} from "../PostEditor";
import ReactDOM from "react-dom";
import type { LexicalEditor } from "lexical";

interface MenuOption {
  label: string;
  description?: string;
  action: (editor: LexicalEditor) => void;
}

const SLASH_OPTIONS: MenuOption[] = [
  {
    label: "Paragraph",
    action: (editor) =>
      editor.dispatchCommand(INSERT_PARAGRAPH_COMMAND, undefined),
  },
  {
    label: "Heading 1",
    action: (editor) =>
      editor.dispatchCommand(INSERT_HEADING_COMMAND, { level: 1 }),
  },
  {
    label: "Heading 2",
    action: (editor) =>
      editor.dispatchCommand(INSERT_HEADING_COMMAND, { level: 2 }),
  },
  {
    label: "Heading 3",
    action: (editor) =>
      editor.dispatchCommand(INSERT_HEADING_COMMAND, { level: 3 }),
  },
  {
    label: "Quote",
    action: (editor) => editor.dispatchCommand(INSERT_QUOTE_COMMAND, undefined),
  },
  {
    label: "Code Block",
    action: (editor) => editor.dispatchCommand(INSERT_CODE_COMMAND, undefined),
  },
  {
    label: "Table",
    action: (editor) => editor.dispatchCommand(INSERT_TABLE_COMMAND, undefined),
  },
  {
    label: "Poll",
    action: (editor) => editor.dispatchCommand(INSERT_POLL_COMMAND, undefined),
  },
  {
    label: "Horizontal Rule",
    action: (editor) => editor.dispatchCommand(INSERT_HR_COMMAND, undefined),
  },
  {
    label: "Image",
    action: (editor) => editor.dispatchCommand(INSERT_IMAGE_COMMAND, undefined),
  },
  {
    label: "Inline Image",
    action: (editor) =>
      editor.dispatchCommand(INSERT_INLINE_IMAGE_COMMAND, undefined),
  },
  {
    label: "GIF",
    action: (editor) => editor.dispatchCommand(INSERT_GIF_COMMAND, undefined),
  },
  {
    label: "Excalidraw",
    action: (editor) =>
      editor.dispatchCommand(INSERT_EXCALIDRAW_COMMAND, undefined),
  },
  {
    label: "Sticky Note",
    action: (editor) =>
      editor.dispatchCommand(INSERT_STICKY_COMMAND, undefined),
  },
  {
    label: "YouTube Video",
    action: (editor) =>
      editor.dispatchCommand(INSERT_YOUTUBE_COMMAND, undefined),
  },
  {
    label: "Tweet",
    action: (editor) => editor.dispatchCommand(INSERT_TWEET_COMMAND, undefined),
  },
  {
    label: "Page Break",
    action: (editor) =>
      editor.dispatchCommand(INSERT_PAGE_BREAK_COMMAND, undefined),
  },
  {
    label: "Columns Layout",
    action: (editor) =>
      editor.dispatchCommand(INSERT_LAYOUT_COMMAND, undefined),
  },
];

const SlashMenuPlugin: React.FC = () => {
  const [editor] = useLexicalComposerContext();
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const [menuPosition, setMenuPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Helper to get caret position in viewport
  const getCaretPosition = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    const range = selection.getRangeAt(0).cloneRange();
    if (range.getClientRects) {
      range.collapse(true);
      const rects = range.getClientRects();
      if (rects.length > 0) {
        const rect = rects[0];
        return { x: rect.left, y: rect.bottom };
      }
    }
    return null;
  };

  // Detect '/' at start of a new line and set menu position
  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection) && selection.isCollapsed()) {
          const anchor = selection.anchor;
          const node = anchor.getNode();
          if (
            node instanceof TextNode &&
            node.getTextContent() === "/" &&
            anchor.offset === 1 &&
            node.getPreviousSibling() == null
          ) {
            const caret = getCaretPosition();
            setOpen(true);
            setHighlighted(0);
            setMenuPosition(caret);
            return;
          }
        }
        setOpen(false);
        setMenuPosition(null);
      });
    });
  }, [editor]);

  // Update menu position if selection changes while open
  useEffect(() => {
    if (!open) return;
    const update = () => {
      setMenuPosition(getCaretPosition());
    };
    document.addEventListener("selectionchange", update);
    return () => document.removeEventListener("selectionchange", update);
  }, [open]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const removeEscape = editor.registerCommand(
      KEY_ESCAPE_COMMAND,
      () => {
        setOpen(false);
        return true;
      },
      COMMAND_PRIORITY_LOW
    );
    const removeDown = editor.registerCommand(
      KEY_ARROW_DOWN_COMMAND,
      () => {
        setHighlighted((i) => (i + 1) % SLASH_OPTIONS.length);
        return true;
      },
      COMMAND_PRIORITY_LOW
    );
    const removeUp = editor.registerCommand(
      KEY_ARROW_UP_COMMAND,
      () => {
        setHighlighted(
          (i) => (i - 1 + SLASH_OPTIONS.length) % SLASH_OPTIONS.length
        );
        return true;
      },
      COMMAND_PRIORITY_LOW
    );
    const removeEnter = editor.registerCommand(
      KEY_ENTER_COMMAND,
      () => {
        if (open) {
          SLASH_OPTIONS[highlighted].action(editor);
          setOpen(false);
          // TODO: Remove the '/' node after insert
          return true;
        }
        return false;
      },
      COMMAND_PRIORITY_LOW
    );
    return () => {
      removeEscape();
      removeDown();
      removeUp();
      removeEnter();
    };
  }, [editor, open, highlighted]);

  if (!open || !menuPosition) return null;

  // Render menu at caret position
  return ReactDOM.createPortal(
    <div
      ref={menuRef}
      className="absolute z-50 bg-card border shadow rounded-md mt-2 w-64"
      style={{
        left: menuPosition.x,
        top: menuPosition.y,
        position: "absolute",
      }}
    >
      {SLASH_OPTIONS.map((opt, i) => (
        <div
          key={opt.label}
          className={`px-4 py-2 cursor-pointer ${
            i === highlighted ? "bg-muted" : ""
          }`}
          onMouseEnter={() => setHighlighted(i)}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            opt.action(editor);
            setOpen(false);
          }}
        >
          <strong>{opt.label}</strong>
          {opt.description && (
            <span className="ml-2 text-muted-foreground text-xs">
              {opt.description}
            </span>
          )}
        </div>
      ))}
    </div>,
    document.body
  );
};

export default SlashMenuPlugin;
