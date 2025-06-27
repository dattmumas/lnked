// @ts-nocheck
'use client';

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getSelection, $isRangeSelection } from 'lexical';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export default function PlusButtonPlugin() {
  const [editor] = useLexicalComposerContext();
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection) && selection.isCollapsed()) {
          const anchorNode = selection.anchor.getNode();
          if (anchorNode.getTextContent() === '') {
            const element = editor.getElementByKey(anchorNode.getKey());
            const root = editor.getRootElement();
            if (element && root) {
              const rect = element.getBoundingClientRect();
              const rootRect = root.getBoundingClientRect();
              setPos({ top: rect.top - rootRect.top, left: -32 });
              return;
            }
          }
        }
        setPos(null);
      });
    });
  }, [editor]);

  const handleClick = () => {
    editor.focus();
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        selection.insertText('/');
      }
    });
  };

  if (!pos) return null;
  const root = editor.getRootElement();
  if (!root) return null;

  return createPortal(
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        handleClick();
      }}
      style={{ position: 'absolute', top: pos.top, left: pos.left }}
      className="p-2 sm:p-1 opacity-80 hover:opacity-100 text-muted-foreground"
    >
      <Image
        src="/plus-slash-minus.svg"
        alt="add"
        width={20}
        height={20}
        className="w-5 h-5 sm:w-4 sm:h-4"
      />
    </button>,
    root.parentElement || root,
  );
}
