// @ts-nocheck
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { JSX } from 'react';

import './index.css';

import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getNearestNodeFromDOMNode,
  $getNodeByKey,
  $getRoot,
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_LOW,
  DRAGOVER_COMMAND,
  DROP_COMMAND,
  LexicalEditor,
} from 'lexical';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const SPACE = 4;
const TARGET_LINE_HALF_HEIGHT = 2;
const DRAGGABLE_BLOCK_MENU_CLASSNAME = 'draggable-block-menu';
const DRAG_DATA_FORMAT = 'application/x-lexical-drag-block';
const TEXT_BOX_HORIZONTAL_PADDING = 28;

const Downward = 1;
const Upward = -1;
const Indeterminate = 0;

let prevIndex = Infinity;

function getCurrentIndex(keysLength: number): number {
  if (keysLength === 0) {
    return Infinity;
  }
  if (prevIndex >= 0 && prevIndex < keysLength) {
    return prevIndex;
  }

  return Math.floor(keysLength / 2);
}

function getTopLevelNodeKeys(editor: LexicalEditor): string[] {
  return editor.getEditorState().read(() => $getRoot().getChildrenKeys());
}

function getCollapsedMargins(elem: HTMLElement): {
  marginTop: number;
  marginBottom: number;
} {
  const getMargin = (
    element: Element | null,
    margin: 'marginTop' | 'marginBottom',
  ): number =>
    element ? parseFloat(window.getComputedStyle(element)[margin]) : 0;

  const { marginTop, marginBottom } = window.getComputedStyle(elem);
  const prevElemSiblingMarginBottom = getMargin(
    elem.previousElementSibling,
    'marginBottom',
  );
  const nextElemSiblingMarginTop = getMargin(
    elem.nextElementSibling,
    'marginTop',
  );
  const collapsedTopMargin = Math.max(
    parseFloat(marginTop),
    prevElemSiblingMarginBottom,
  );
  const collapsedBottomMargin = Math.max(
    parseFloat(marginBottom),
    nextElemSiblingMarginTop,
  );

  return { marginTop: collapsedTopMargin, marginBottom: collapsedBottomMargin };
}

function getBlockElement(
  anchorElem: HTMLElement,
  editor: LexicalEditor,
  event: MouseEvent,
  useEdgeAsDefault = false,
): HTMLElement | null {
  const anchorElementRect = anchorElem.getBoundingClientRect();
  const topLevelNodeKeys = getTopLevelNodeKeys(editor);

  let blockElem: HTMLElement | null = null;

  editor.getEditorState().read(() => {
    if (useEdgeAsDefault) {
      const [firstNode, lastNode] = [
        editor.getElementByKey(topLevelNodeKeys[0]),
        editor.getElementByKey(topLevelNodeKeys[topLevelNodeKeys.length - 1]),
      ];

      const [firstNodeRect, lastNodeRect] = [
        firstNode?.getBoundingClientRect(),
        lastNode?.getBoundingClientRect(),
      ];

      if (firstNodeRect && lastNodeRect) {
        const firstNodeTop = firstNodeRect.top;
        const lastNodeBottom = lastNodeRect.bottom;

        if (event.y < firstNodeTop) {
          blockElem = firstNode;
        } else if (event.y > lastNodeBottom) {
          blockElem = lastNode;
        }

        if (blockElem) {
          return;
        }
      }
    }

    let index = getCurrentIndex(topLevelNodeKeys.length);
    let direction = Indeterminate;

    while (index >= 0 && index < topLevelNodeKeys.length) {
      const key = topLevelNodeKeys[index];
      const elem = editor.getElementByKey(key);
      if (elem === null) {
        break;
      }
      const point = elem.getBoundingClientRect();
      const domNode = elem;
      const { marginTop, marginBottom } = getCollapsedMargins(domNode);

      const rect = {
        bottom: point.bottom + marginBottom,
        left: anchorElementRect.left - SPACE - TEXT_BOX_HORIZONTAL_PADDING - 20, // Extend left to include handle area
        right: anchorElementRect.right,
        top: point.top - marginTop,
      };

      const {
        result,
        reason: { isOnTopSide, isOnBottomSide },
      } = isMouseOverBlockElem(event, rect);

      if (result) {
        blockElem = elem;
        prevIndex = index;
        break;
      }

      if (direction === Indeterminate) {
        if (isOnTopSide) {
          direction = Upward;
        } else if (isOnBottomSide) {
          direction = Downward;
        } else {
          // stop search block element
          direction = Infinity;
        }
      }

      index += direction;
    }
  });

  return blockElem;
}

function isMouseOverBlockElem(
  event: MouseEvent,
  rect: { top: number; left: number; bottom: number; right: number },
): {
  result: boolean;
  reason: {
    isOnTopSide: boolean;
    isOnBottomSide: boolean;
    isOnLeftSide: boolean;
    isOnRightSide: boolean;
  };
} {
  const { top, left, bottom, right } = rect;
  const { x, y } = event;

  const isOnTopSide = y < top;
  const isOnBottomSide = y > bottom;
  const isOnLeftSide = x < left;
  const isOnRightSide = x > right;

  const result =
    !isOnTopSide && !isOnBottomSide && !isOnLeftSide && !isOnRightSide;

  return {
    reason: {
      isOnBottomSide,
      isOnLeftSide,
      isOnRightSide,
      isOnTopSide,
    },
    result,
  };
}

function DraggableBlockMenu({
  anchorElem,
  editor,
  isVisible,
  blockElem,
}: {
  anchorElem: HTMLElement;
  editor: LexicalEditor;
  isVisible: boolean;
  blockElem: HTMLElement | null;
}): JSX.Element {
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);

  useEffect(() => {
    if (!blockElem || !isVisible) {
      setMenuPosition(null);
      return;
    }

    const anchorElementRect = anchorElem.getBoundingClientRect();
    const blockElemRect = blockElem.getBoundingClientRect();
    const { marginTop } = getCollapsedMargins(blockElem);

    setMenuPosition({
      left: anchorElementRect.left - SPACE - TEXT_BOX_HORIZONTAL_PADDING,
      top: blockElemRect.top - marginTop,
    });
  }, [anchorElem, blockElem, isVisible]);

  const handleDragStart = (event: React.DragEvent) => {
    if (!blockElem) return;

    const nodeKey = blockElem.getAttribute('data-lexical-editor-key');
    if (!nodeKey) return;

    event.dataTransfer.setData(DRAG_DATA_FORMAT, nodeKey);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleMouseEnter = () => {
    // Ensure handle stays visible when hovering over it
  };

  const handleMouseLeave = () => {
    // Handle will be hidden by the main mouse leave logic
  };

  if (!isVisible || !menuPosition) {
    return (
      <div
        ref={menuRef}
        className={DRAGGABLE_BLOCK_MENU_CLASSNAME}
        style={{ opacity: 0 }}
      />
    );
  }

  return (
    <div
      ref={menuRef}
      className={DRAGGABLE_BLOCK_MENU_CLASSNAME}
      style={{
        left: menuPosition.left,
        top: menuPosition.top,
        opacity: 1,
      }}
      draggable
      onDragStart={handleDragStart}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="icon" />
    </div>
  );
}

export default function DraggableBlockPlugin(): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const [anchorElem, setAnchorElem] = useState<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [blockElem, setBlockElem] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const editorElement = editor.getRootElement();
    if (editorElement) {
      setAnchorElem(editorElement);
    }
  }, [editor]);

  useEffect(() => {
    if (!anchorElem) return;

    let hideTimer: NodeJS.Timeout | null = null;

    const clearHideTimer = () => {
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
    };

    const scheduleHide = () => {
      clearHideTimer();
      hideTimer = setTimeout(() => {
        setIsVisible(false);
        setBlockElem(null);
      }, 300); // 300ms delay before hiding
    };

    const handleMouseMove = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      // Check if mouse is over the draggable handle or editor
      const isOverHandle = target.closest('.draggable-block-menu');
      const isOverEditor = target.closest('.editor-container');

      if (!isOverEditor && !isOverHandle) {
        scheduleHide();
        return;
      }

      // Clear any pending hide timer since we're in a valid area
      clearHideTimer();

      // If we're over the handle, keep current state
      if (isOverHandle) {
        return;
      }

      // Handle editor mouse movement
      const _blockElem = getBlockElement(anchorElem, editor, event);
      if (_blockElem) {
        setBlockElem(_blockElem);
        setIsVisible(true);
      } else {
        setIsVisible(false);
        setBlockElem(null);
      }
    };

    const handleMouseLeave = (event: MouseEvent) => {
      const relatedTarget = event.relatedTarget as HTMLElement;

      // Don't hide if moving to the draggable handle
      if (relatedTarget?.closest('.draggable-block-menu')) {
        return;
      }

      scheduleHide();
    };

    // Listen on document to catch all mouse movements
    document.addEventListener('mousemove', handleMouseMove);
    anchorElem.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      clearHideTimer();
      document.removeEventListener('mousemove', handleMouseMove);
      anchorElem.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [anchorElem, editor]);

  useEffect(() => {
    return editor.registerCommand(
      DRAGOVER_COMMAND,
      (event: DragEvent) => {
        if (!event.dataTransfer?.types.includes(DRAG_DATA_FORMAT)) {
          return false;
        }
        event.preventDefault();
        return true;
      },
      COMMAND_PRIORITY_LOW,
    );
  }, [editor]);

  useEffect(() => {
    return editor.registerCommand(
      DROP_COMMAND,
      (event: DragEvent) => {
        if (!event.dataTransfer?.types.includes(DRAG_DATA_FORMAT)) {
          return false;
        }

        const draggedNodeKey = event.dataTransfer.getData(DRAG_DATA_FORMAT);
        if (!draggedNodeKey) return false;

        const targetBlockElem = getBlockElement(
          anchorElem!,
          editor,
          event as any,
          true,
        );
        if (!targetBlockElem) return false;

        event.preventDefault();

        editor.update(() => {
          const draggedNode = $getNodeByKey(draggedNodeKey);
          const targetNode = $getNearestNodeFromDOMNode(targetBlockElem);

          if (draggedNode && targetNode) {
            draggedNode.remove();
            targetNode.insertAfter(draggedNode);
          }
        });

        return true;
      },
      COMMAND_PRIORITY_HIGH,
    );
  }, [anchorElem, editor]);

  if (!anchorElem) {
    return <></>;
  }

  return createPortal(
    <DraggableBlockMenu
      anchorElem={anchorElem}
      editor={editor}
      isVisible={isVisible}
      blockElem={blockElem}
    />,
    document.body,
  );
}
