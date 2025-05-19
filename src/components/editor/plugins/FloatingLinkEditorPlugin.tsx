/*
 * FloatingLinkEditorPlugin for Lnked, inspired by Lexical Playground (MIT License)
 * Shows a floating popover for editing/removing a link when selection is inside a LinkNode.
 */
"use client";
import React, { useEffect, useRef, useState } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getSelection,
  $isRangeSelection,
  SELECTION_CHANGE_COMMAND,
} from "lexical";
import { TOGGLE_LINK_COMMAND } from "@lexical/link";
import { $isLinkNode, LinkNode } from "@lexical/link";
import ReactDOM from "react-dom";

const FloatingLinkEditorPlugin: React.FC = () => {
  const [editor] = useLexicalComposerContext();
  const popupRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [editing, setEditing] = useState(false);
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(
    null
  );

  // Update popup state/position on selection change
  useEffect(() => {
    const updatePopup = () => {
      editor.getEditorState().read(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection) && !selection.isCollapsed()) {
          const anchorNode = selection.anchor.getNode();
          const linkNode = anchorNode.getParent();
          if (linkNode && $isLinkNode(linkNode)) {
            setLinkUrl((linkNode as LinkNode).getURL());
            setVisible(true);
            // Use Lexical's DOM util for position
            const domElem = editor.getElementByKey(linkNode.getKey());
            if (domElem) {
              const rect = domElem.getBoundingClientRect();
              setPosition({ x: rect.left, y: rect.bottom });
            } else {
              setPosition(null);
            }
            return;
          }
        }
        setVisible(false);
        setPosition(null);
      });
    };
    const removeListener = editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        updatePopup();
        return false;
      },
      0
    );
    // Also update on mount
    updatePopup();
    return () => removeListener();
  }, [editor]);

  // Auto-focus input when editing
  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
    }
  }, [editing]);

  const applyLink = () => {
    if (linkUrl === "") {
      // Remove link
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
    } else {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, { url: linkUrl });
    }
    setEditing(false);
  };

  if (!visible || !position) return null;

  const popup = (
    <div
      ref={popupRef}
      className="link-editor-popup p-2 bg-card border shadow rounded flex items-center"
      style={{
        position: "absolute",
        left: position.x,
        top: position.y,
        zIndex: 1000,
      }}
    >
      {editing ? (
        <>
          <input
            ref={inputRef}
            className="border px-1 mr-2"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyLink();
              } else if (e.key === "Escape") {
                e.preventDefault();
                setEditing(false);
              }
            }}
          />
          <button
            onClick={applyLink}
            className="px-2 py-1 bg-primary text-primary-foreground rounded"
          >
            Save
          </button>
        </>
      ) : (
        <>
          <a
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline mr-2"
          >
            {linkUrl.length > 30 ? linkUrl.slice(0, 30) + "..." : linkUrl}
          </a>
          <button onClick={() => setEditing(true)} className="text-sm mr-2">
            Edit
          </button>
          <button
            onClick={() => {
              setLinkUrl("");
              applyLink();
            }}
            className="text-sm text-destructive"
          >
            Remove
          </button>
        </>
      )}
    </div>
  );

  return ReactDOM.createPortal(popup, document.body);
};

export default FloatingLinkEditorPlugin;
