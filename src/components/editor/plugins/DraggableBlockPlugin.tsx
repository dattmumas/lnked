/*
 * DraggableBlockPlugin for Lnked - Exact replica of Lexical Playground
 * Shows gray grip handles on the left of blocks for reordering content
 */
'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { JSX } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getNearestNodeFromDOMNode,
  $getNodeByKey,
  LexicalEditor,
  LexicalCommand,
  createCommand,
} from 'lexical';
import { mergeRegister } from '@lexical/utils';
import { GripVertical } from 'lucide-react';
import ReactDOM from 'react-dom';

const DRAG_DATA_FORMAT = 'application/x-lexical-drag-block';

// Create proper command types
const DRAGOVER_COMMAND: LexicalCommand<DragEvent> =
  createCommand('DRAGOVER_COMMAND');
const DROP_COMMAND: LexicalCommand<DragEvent> = createCommand('DROP_COMMAND');

export default function DraggableBlockPlugin(): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const menuRef = useRef<HTMLDivElement>(null);
  const targetLineRef = useRef<HTMLDivElement>(null);
  const isDraggingBlockRef = useRef<boolean>(false);
  const [draggableBlockElem, setDraggableBlockElem] =
    useState<HTMLElement | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Ensure we only render on client side
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const clearHideTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const scheduleHide = useCallback(() => {
    clearHideTimeout();
    timeoutRef.current = setTimeout(() => {
      if (!isDraggingBlockRef.current) {
        setDraggableBlockElem(null);
      }
    }, 750); // Match playground timing
  }, [clearHideTimeout]);

  useEffect(() => {
    function onMouseMove(event: MouseEvent) {
      const target = event.target as HTMLElement;

      if (isDraggingBlockRef.current) {
        return;
      }

      // Clear any existing timeout
      clearHideTimeout();

      // Check if hovering over drag handle itself
      if (target.closest('.draggable-block-menu')) {
        return; // Keep current state
      }

      // Check if we're hovering over a block element in the editor
      const blockElement = getBlockElement(target, editor);
      if (blockElement && isOnMenu(target)) {
        setDraggableBlockElem(blockElement);
      } else {
        scheduleHide();
      }
    }

    function onMouseLeave() {
      if (!isDraggingBlockRef.current) {
        scheduleHide();
      }
    }

    return mergeRegister(
      editor.registerRootListener((rootElement, prevElement) => {
        if (prevElement !== null) {
          prevElement.removeEventListener('mousemove', onMouseMove);
          prevElement.removeEventListener('mouseleave', onMouseLeave);
        }
        if (rootElement !== null) {
          rootElement.addEventListener('mousemove', onMouseMove);
          rootElement.addEventListener('mouseleave', onMouseLeave);
        }
      }),
    );
  }, [editor, clearHideTimeout, scheduleHide]);

  useEffect(() => {
    if (menuRef.current) {
      setMenuPosition(
        draggableBlockElem,
        menuRef.current,
        targetLineRef.current,
      );
    }
  }, [draggableBlockElem]);

  useEffect(() => {
    function onDragover(event: DragEvent): boolean {
      if (!isDraggingBlockRef.current) {
        return false;
      }
      const [isFileTransfer] = eventFiles(event);
      if (isFileTransfer) {
        return false;
      }
      const { pageY, target } = event;
      if (!target) return false;

      const targetBlockElem = getBlockElement(target as HTMLElement, editor);
      const targetLineElem = targetLineRef.current;
      if (targetBlockElem === null || targetLineElem === null) {
        return false;
      }
      setTargetLine(targetBlockElem, targetLineElem, pageY);
      event.preventDefault();
      return true;
    }

    function onDrop(event: DragEvent): boolean {
      if (!isDraggingBlockRef.current) {
        return false;
      }
      const [isFileTransfer] = eventFiles(event);
      if (isFileTransfer) {
        return false;
      }
      const { target, dataTransfer, pageY } = event;
      const dragData = dataTransfer?.getData(DRAG_DATA_FORMAT) || '';
      const draggedNode = $getNodeByKey(dragData);
      if (!draggedNode) {
        return false;
      }
      const targetBlockElem = getBlockElement(target as HTMLElement, editor);
      if (!targetBlockElem) {
        return false;
      }
      const targetNode = $getNearestNodeFromDOMNode(targetBlockElem);
      if (!targetNode) {
        return false;
      }
      if (targetNode === draggedNode) {
        return true;
      }
      const targetBlockElemTop = targetBlockElem.getBoundingClientRect().top;
      if (pageY >= targetBlockElemTop) {
        targetNode.insertAfter(draggedNode);
      } else {
        targetNode.insertBefore(draggedNode);
      }
      setDraggableBlockElem(null);

      return true;
    }

    return mergeRegister(
      editor.registerCommand(DRAGOVER_COMMAND, onDragover, 1),
      editor.registerCommand(DROP_COMMAND, onDrop, 1),
    );
  }, [editor]);

  function onDragStart(event: React.DragEvent<HTMLDivElement>): void {
    const dataTransfer = event.dataTransfer;
    if (!dataTransfer || !draggableBlockElem) {
      return;
    }
    setDraggableBlockElem(null);
    let nodeKey = '';
    editor.update(() => {
      const node = $getNearestNodeFromDOMNode(draggableBlockElem);
      if (node) {
        nodeKey = node.getKey();
      }
    });
    isDraggingBlockRef.current = true;
    dataTransfer.setData(DRAG_DATA_FORMAT, nodeKey);
  }

  function onDragEnd(): void {
    isDraggingBlockRef.current = false;
    hideTargetLine(targetLineRef.current);
  }

  // Only render on client side to avoid SSR issues
  if (!isMounted) {
    return <></>;
  }

  return ReactDOM.createPortal(
    <>
      <div
        className={`draggable-block-menu${draggableBlockElem ? ' visible' : ''}`}
        ref={menuRef}
        draggable="true"
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onMouseEnter={clearHideTimeout}
        onMouseLeave={() => {
          if (!isDraggingBlockRef.current) {
            scheduleHide();
          }
        }}
        style={{
          transition: 'opacity 0.15s ease',
        }}
      >
        <GripVertical className="h-3 w-3" />
      </div>
      <div className="draggable-block-target-line" ref={targetLineRef} />
    </>,
    document.body,
  );
}

function setMenuPosition(
  targetElem: HTMLElement | null,
  floatingElem: HTMLElement,
  targetLineElem: HTMLElement | null,
) {
  if (!targetElem) {
    floatingElem.style.opacity = '0';
    floatingElem.style.transform = 'translate(-10000px, -10000px)';
    if (targetLineElem) {
      targetLineElem.style.opacity = '0';
      targetLineElem.style.transform = 'translate(-10000px, -10000px)';
    }
    return;
  }

  const targetRect = targetElem.getBoundingClientRect();
  const floatingElemRect = floatingElem.getBoundingClientRect();

  // Position exactly like playground - left side with proper spacing
  const left = targetRect.left - floatingElemRect.width - 12;
  const top = targetRect.top + 2;

  floatingElem.style.opacity = '1';
  floatingElem.style.transform = `translate(${left}px, ${top}px)`;
  floatingElem.style.position = 'fixed';
}

function setTargetLine(
  targetBlockElem: HTMLElement,
  targetLineElem: HTMLElement,
  mouseY: number,
) {
  const { top: targetBlockElemTop, height: targetBlockElemHeight } =
    targetBlockElem.getBoundingClientRect();
  const { top: targetLineElemTop, height: targetLineElemHeight } =
    targetLineElem.getBoundingClientRect();

  let lineTop = targetBlockElemTop;
  if (mouseY >= targetBlockElemTop + targetBlockElemHeight / 2) {
    lineTop += targetBlockElemHeight + 4;
  } else {
    lineTop -= 4;
  }

  const top = lineTop - targetLineElemTop - targetLineElemHeight / 2;
  const left =
    targetBlockElem.getBoundingClientRect().left -
    targetLineElem.getBoundingClientRect().left;

  targetLineElem.style.transform = `translate(${left}px, ${top}px)`;
  targetLineElem.style.width = `${targetBlockElem.offsetWidth}px`;
  targetLineElem.style.opacity = '.4';
}

function hideTargetLine(targetLineElem: HTMLElement | null) {
  if (targetLineElem) {
    targetLineElem.style.opacity = '0';
    targetLineElem.style.transform = 'translate(-10000px, -10000px)';
  }
}

function getBlockElement(
  anchorElem: HTMLElement,
  editor: LexicalEditor,
): HTMLElement | null {
  let blockElem: HTMLElement | null = anchorElem;
  while (blockElem) {
    if (blockElem.dataset.lexicalEditor === editor._key) {
      return null;
    }
    if (isBlock(blockElem)) {
      return blockElem;
    }
    blockElem = blockElem.parentElement;
  }
  return null;
}

function isBlock(element: HTMLElement): boolean {
  const display = window.getComputedStyle(element).display;
  return display === 'block' || display === 'list-item';
}

function isOnMenu(element: HTMLElement): boolean {
  const editorElement = element.closest('[data-lexical-editor]');
  return editorElement !== null && !element.closest('.draggable-block-menu');
}

function eventFiles(event: DragEvent): [boolean, Array<File>, boolean] {
  let dataTransfer = event.dataTransfer;
  if (!dataTransfer) {
    const eventWithClipboard = event as unknown as {
      clipboardData?: DataTransfer;
    };
    dataTransfer = eventWithClipboard.clipboardData ?? null;
  }
  if (!dataTransfer) {
    return [false, [], false];
  }
  const types = dataTransfer.types;
  const hasFiles = types.includes('Files');
  const hasContent =
    types.includes('text/html') || types.includes('text/plain');
  return [hasFiles, Array.from(dataTransfer.files), hasContent];
}
