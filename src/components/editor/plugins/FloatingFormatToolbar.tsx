'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getSelection,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  SELECTION_CHANGE_COMMAND,
} from 'lexical';
import { TOGGLE_LINK_COMMAND } from '@lexical/link';
import { $setBlocksType } from '@lexical/selection';
import { $createQuoteNode } from '@lexical/rich-text';
import {
  Bold,
  Italic,
  Quote as QuoteIcon,
  Link as LinkIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import ReactDOM from 'react-dom';

export default function FloatingFormatToolbarPlugin() {
  const [editor] = useLexicalComposerContext();
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const update = () => {
      editor.getEditorState().read(() => {
        const selection = $getSelection();
        const domSelection = window.getSelection();
        if (
          $isRangeSelection(selection) &&
          !selection.isCollapsed() &&
          domSelection &&
          domSelection.rangeCount > 0
        ) {
          const range = domSelection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          setPosition({ x: rect.left + rect.width / 2, y: rect.top });
          setVisible(true);
        } else {
          setVisible(false);
          setPosition(null);
        }
      });
    };

    const removeSelectionListener = editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        update();
        return false;
      },
      0,
    );

    window.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    update();
    return () => {
      removeSelectionListener();
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [editor]);

  if (!visible || !position) return null;

  const style = {
    left: position.x,
    top: position.y,
    transform: 'translate(-50%, -110%)',
    position: 'absolute' as const,
    zIndex: 1000,
  };

  return ReactDOM.createPortal(
    <div
      ref={toolbarRef}
      aria-label="Text formatting options"
      aria-live="polite"
      className="bg-card shadow-md p-1 rounded flex gap-1 animate-in fade-in zoom-in-95"
      style={style}
    >
      <Button
        variant="ghost"
        size="icon"
        onMouseDown={(e) => {
          e.preventDefault();
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold');
        }}
        title="Bold"
        aria-label="Bold"
      >
        <Bold className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onMouseDown={(e) => {
          e.preventDefault();
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic');
        }}
        title="Italic"
        aria-label="Italic"
      >
        <Italic className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onMouseDown={(e) => {
          e.preventDefault();
          editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
              $setBlocksType(selection, () => $createQuoteNode());
            }
          });
        }}
        title="Quote"
        aria-label="Quote"
      >
        <QuoteIcon className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onMouseDown={(e) => {
          e.preventDefault();
          editor.dispatchCommand(TOGGLE_LINK_COMMAND, 'https://');
        }}
        title="Link"
        aria-label="Link"
      >
        <LinkIcon className="size-4" />
      </Button>
    </div>,
    document.body,
  );
}
