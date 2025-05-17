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
import { TOGGLE_LINK_COMMAND } from "@lexical/link";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code2,
  Link as LinkIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { JSX } from "react";
import { $setBlocksType } from "@lexical/selection";
import { $createParagraphNode, type TextFormatType } from "lexical";

const BLOCK_TYPES = [
  { type: "paragraph", label: "Paragraph" },
  { type: "h1", label: "Heading 1" },
  { type: "h2", label: "Heading 2" },
  { type: "h3", label: "Heading 3" },
  { type: "quote", label: "Quote" },
  { type: "code", label: "Code Block" },
];

const FONT_FAMILIES = ["Arial", "Serif", "Monospace"];
const FONT_SIZES = [12, 14, 16, 18, 24, 32];
const ALIGN_OPTIONS = [
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
];

function Toolbar(): JSX.Element {
  const [editor] = useLexicalComposerContext();
  // Local state for active inline formatting and current block type/attributes
  const [blockType, setBlockType] = useState<string>("paragraph");
  const [fontFamily, setFontFamily] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState<number | null>(null);
  const [align, setAlign] = useState<string>("left");
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [isCode, setIsCode] = useState(false);

  // Helper: update toolbar state based on selection
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
      // Font family/size: placeholder for now
      setFontFamily(null);
      setFontSize(null);
      // Alignment: placeholder for now
      setAlign("left");
    }
  }, [editor]);

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
  const formatBlock = useCallback(
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
              $setBlocksType(selection, () => $createQuoteNode());
              break;
            default:
              // Use paragraph node if available, else fallback to h1
              if (typeof $createParagraphNode !== "undefined") {
                $setBlocksType(selection, () => $createParagraphNode());
              } else {
                $setBlocksType(selection, () => $createHeadingNode("h1"));
              }
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

  // Alignment handler (placeholder)
  const applyAlignment = (align: string) => {
    setAlign(align);
    // TODO: implement alignment logic
  };

  // Font family and size handlers (placeholder)
  const applyFontFamily = (family: string) => {
    setFontFamily(family);
    // TODO: implement font family logic
  };
  const applyFontSize = (size: number) => {
    setFontSize(size);
    // TODO: implement font size logic
  };

  return (
    <div className="flex flex-wrap items-center gap-2 p-2 border-b bg-gray-50 sticky top-0 z-10">
      {/* Block format dropdown */}
      <select
        value={blockType}
        onChange={(e) => formatBlock(e.target.value)}
        className="border rounded px-2 py-1 mr-2"
      >
        {BLOCK_TYPES.map((option) => (
          <option key={option.type} value={option.type}>
            {option.label}
          </option>
        ))}
      </select>
      {/* Font family dropdown (placeholder) */}
      <select
        value={fontFamily || ""}
        onChange={(e) => applyFontFamily(e.target.value)}
        className="border rounded px-2 py-1 mr-2"
      >
        <option value="">Font</option>
        {FONT_FAMILIES.map((font) => (
          <option key={font} value={font} style={{ fontFamily: font }}>
            {font}
          </option>
        ))}
      </select>
      {/* Font size dropdown (placeholder) */}
      <select
        value={fontSize || ""}
        onChange={(e) => applyFontSize(Number(e.target.value))}
        className="border rounded px-2 py-1 mr-2"
      >
        <option value="">Size</option>
        {FONT_SIZES.map((size) => (
          <option key={size} value={size}>
            {size}px
          </option>
        ))}
      </select>
      {/* Alignment dropdown (placeholder) */}
      <select
        value={align}
        onChange={(e) => applyAlignment(e.target.value)}
        className="border rounded px-2 py-1 mr-2"
      >
        {ALIGN_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {/* Inline formatting buttons */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => toggleFormat("bold")}
        title="Bold"
        className={isBold ? "bg-gray-300" : ""}
      >
        <Bold size={16} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => toggleFormat("italic")}
        title="Italic"
        className={isItalic ? "bg-gray-300" : ""}
      >
        <Italic size={16} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => toggleFormat("underline")}
        title="Underline"
        className={isUnderline ? "bg-gray-300" : ""}
      >
        <UnderlineIcon size={16} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => toggleFormat("strikethrough")}
        title="Strikethrough"
        className={isStrikethrough ? "bg-gray-300" : ""}
      >
        <Strikethrough size={16} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => toggleFormat("code")}
        title="Inline Code"
        className={isCode ? "bg-gray-300" : ""}
      >
        <Code2 size={16} />
      </Button>
      {/* Link insert button (optional) */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          const url = prompt("Enter URL:");
          if (url) editor.dispatchCommand(TOGGLE_LINK_COMMAND, url);
        }}
        title="Insert Link"
      >
        <LinkIcon size={16} />
      </Button>
      {/* Image, table insert are now via slash menu, so not included here */}
    </div>
  );
}

export default Toolbar;
