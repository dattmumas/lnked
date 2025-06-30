// @ts-nocheck
'use client';

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getSelection, $isRangeSelection, $isTextNode } from 'lexical';
import { Plus } from 'lucide-react';
import { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';

export default function PlusButtonPlugin() {
  const [editor] = useLexicalComposerContext();
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const currentNodeKey = useRef<string | null>(null);

  const updateButtonPosition = useCallback(() => {
    editor.getEditorState().read(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) {
        setIsVisible(false);
        return;
      }

      const anchorNode = selection.anchor.getNode();
      const element = editor.getElementByKey(anchorNode.getKey());

      if (!element) {
        setIsVisible(false);
        return;
      }

      // Check if this is an empty paragraph or line
      const nodeText = anchorNode.getTextContent();
      const parentText = anchorNode.getParent()?.getTextContent() || '';

      const shouldShowButton =
        nodeText.trim() === '' && // Current node is empty
        parentText.trim() === ''; // Parent is also empty

      if (!shouldShowButton) {
        setIsVisible(false);
        return;
      }

      // Don't show multiple buttons for the same node
      if (currentNodeKey.current === anchorNode.getKey()) {
        return;
      }

      currentNodeKey.current = anchorNode.getKey();

      const rect = element.getBoundingClientRect();
      const newPos = {
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX - 40, // Position to the left of the line
      };

      setPos(newPos);
      setIsVisible(true);
    });
  }, [editor]);

  const handleSlashCommand = useCallback(() => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        selection.insertText('/');
      }
    });
    setIsVisible(false);
  }, [editor]);

  useEffect(() => {
    return editor.registerUpdateListener(() => {
      updateButtonPosition();
    });
  }, [editor, updateButtonPosition]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsVisible(false);
        currentNodeKey.current = null;
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isVisible || !pos) {
    return null;
  }

  return createPortal(
    <button
      ref={buttonRef}
      type="button"
      className="floating-add-button-plugin visible"
      title="Insert content (type / for menu)"
      aria-label="Insert content"
      onClick={handleSlashCommand}
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
      }}
    >
      <Plus className="w-4 h-4" aria-hidden="true" />
    </button>,
    document.body,
  );
}
