"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getSelection,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  SELECTION_CHANGE_COMMAND,
} from "lexical";
import {
  $isHeadingNode,
  $createHeadingNode,
  $createQuoteNode,
} from "@lexical/rich-text";
import { CodeNode } from "@lexical/code";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code2,
  Undo,
  Redo,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link as LinkIcon,
  PictureInPicture2 as ExcalidrawIcon,
  FileImage as GifIcon,
} from "lucide-react";
import type { JSX } from "react";
import { $setBlocksType } from "@lexical/selection";
import { $createParagraphNode, type TextFormatType } from "lexical";
import {
  CAN_UNDO_COMMAND,
  CAN_REDO_COMMAND,
  UNDO_COMMAND,
  REDO_COMMAND,
  FORMAT_ELEMENT_COMMAND,
} from "lexical";
import { TOGGLE_LINK_COMMAND } from "@lexical/link";
import { $isLinkNode } from "@lexical/link";
import { INSERT_EXCALIDRAW_COMMAND } from "./PostEditor";

const BLOCK_TYPES = [
  { type: "paragraph", label: "Paragraph" },
  { type: "h1", label: "Heading 1" },
  { type: "h2", label: "Heading 2" },
  { type: "h3", label: "Heading 3" },
  { type: "quote", label: "Quote" },
  { type: "code", label: "Code Block" },
];

interface ToolbarProps {
  onInsertGif: () => void;
}

function Toolbar({ onInsertGif }: ToolbarProps): JSX.Element {
  const [editor] = useLexicalComposerContext();
  // Local state for active inline formatting and current block type/attributes
  const [blockType, setBlockType] = useState<string>("paragraph");
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [isCode, setIsCode] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [isLink, setIsLink] = useState(false);

  // Listen for undo/redo availability
  useEffect(() => {
    return editor.registerCommand(
      CAN_UNDO_COMMAND,
      (payload) => {
        setCanUndo(payload);
        return false;
      },
      0
    );
  }, [editor]);
  useEffect(() => {
    return editor.registerCommand(
      CAN_REDO_COMMAND,
      (payload) => {
        setCanRedo(payload);
        return false;
      },
      0
    );
  }, [editor]);

  // Update isLink state
  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      // Block type
      const anchorNode = selection.anchor.getNode();
      const blockNode = anchorNode.getTopLevelElementOrThrow();
      let blockType: string = blockNode.getType();
      if ($isHeadingNode(blockNode)) {
        blockType = blockNode.getTag(); // "h1", "h2", etc.
      }
      setBlockType(blockType);
      // Inline styles
      setIsBold(selection.hasFormat("bold"));
      setIsItalic(selection.hasFormat("italic"));
      setIsUnderline(selection.hasFormat("underline"));
      setIsStrikethrough(selection.hasFormat("strikethrough"));
      setIsCode(selection.hasFormat("code"));
      // Link
      let node = selection.anchor.getNode();
      while (node != null) {
        if ($isLinkNode(node)) {
          setIsLink(true);
          return;
        }
        const parent = node.getParent();
        if (!parent) break;
        node = parent;
      }
      setIsLink(false);
    }
  }, []);

  useEffect(() => {
    // Register a listener for selection changes and update toolbar
    return editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        editor.getEditorState().read(updateToolbar);
        return false;
      },
      0 // low priority
    );
  }, [editor, updateToolbar]);

  // Block format change handler
  const formatBlock = React.useCallback(
    (type: string) => {
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
              $setBlocksType(selection, () => new CodeNode());
              break;
            case "paragraph":
            default:
              $setBlocksType(selection, () => $createParagraphNode());
          }
        }
      });
    },
    [editor]
  );

  // Text format handlers
  const toggleFormat = (format: TextFormatType) => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
  };

  // Alignment handlers
  const formatAlign = (align: "left" | "center" | "right") => {
    editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, align);
  };

  // Link handler
  const insertLink = useCallback(() => {
    if (!isLink) {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, "https://");
    } else {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
    }
  }, [editor, isLink]);

  return (
    <div className="toolbar sticky top-0 z-20 flex items-center gap-2 bg-background px-2 py-1 border-b dark:bg-background/80">
      {/* Quick-insert: GIF */}
      <button
        type="button"
        onClick={onInsertGif}
        className="toolbar-item spaced"
        aria-label="Insert GIF"
        title="Insert GIF"
      >
        <GifIcon className="format" />
      </button>
      {/* Quick-insert: Excalidraw */}
      <button
        type="button"
        onClick={() =>
          editor.dispatchCommand(INSERT_EXCALIDRAW_COMMAND, undefined)
        }
        className="toolbar-item spaced"
        aria-label="Insert Excalidraw Canvas"
        title="Insert Excalidraw Canvas"
      >
        <ExcalidrawIcon className="format" />
      </button>
      {/* Undo/Redo */}
      <button
        type="button"
        onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
        className="toolbar-item spaced"
        aria-label="Undo"
        disabled={!canUndo}
      >
        <Undo className="format" />
      </button>
      <button
        type="button"
        onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
        className="toolbar-item spaced"
        aria-label="Redo"
        disabled={!canRedo}
      >
        <Redo className="format" />
      </button>
      <div className="divider" />
      {/* Block format dropdown */}
      <select
        value={blockType}
        onChange={(e) => formatBlock(e.target.value)}
        className="toolbar-item block-controls"
      >
        {BLOCK_TYPES.map((option) => (
          <option key={option.type} value={option.type}>
            {option.label}
          </option>
        ))}
      </select>
      {/* Alignment buttons */}
      <button
        type="button"
        onClick={() => formatAlign("left")}
        className="toolbar-item spaced"
        aria-label="Align Left"
      >
        <AlignLeft className="format" />
      </button>
      <button
        type="button"
        onClick={() => formatAlign("center")}
        className="toolbar-item spaced"
        aria-label="Align Center"
      >
        <AlignCenter className="format" />
      </button>
      <button
        type="button"
        onClick={() => formatAlign("right")}
        className="toolbar-item spaced"
        aria-label="Align Right"
      >
        <AlignRight className="format" />
      </button>
      <div className="divider" />
      {/* Inline formatting buttons */}
      <button
        type="button"
        onClick={() => toggleFormat("bold")}
        className={"toolbar-item spaced " + (isBold ? "active" : "")}
        aria-label="Format Bold"
      >
        <Bold className="format" />
      </button>
      <button
        type="button"
        onClick={() => toggleFormat("italic")}
        className={"toolbar-item spaced " + (isItalic ? "active" : "")}
        aria-label="Format Italic"
      >
        <Italic className="format" />
      </button>
      <button
        type="button"
        onClick={() => toggleFormat("underline")}
        className={"toolbar-item spaced " + (isUnderline ? "active" : "")}
        aria-label="Format Underline"
      >
        <UnderlineIcon className="format" />
      </button>
      <button
        type="button"
        onClick={() => toggleFormat("strikethrough")}
        className={"toolbar-item spaced " + (isStrikethrough ? "active" : "")}
        aria-label="Format Strikethrough"
      >
        <Strikethrough className="format" />
      </button>
      <button
        type="button"
        onClick={() => toggleFormat("code")}
        className={"toolbar-item spaced " + (isCode ? "active" : "")}
        aria-label="Format Inline Code"
      >
        <Code2 className="format" />
      </button>
      {/* Link button */}
      <button
        type="button"
        onClick={insertLink}
        className={"toolbar-item spaced " + (isLink ? "active" : "")}
        aria-label="Insert link"
      >
        <LinkIcon className="format" />
      </button>
    </div>
  );
}

export default Toolbar;
