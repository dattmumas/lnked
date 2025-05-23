/*
 * LayoutPlugin for Lnked, adapted from Lexical Playground (MIT License)
 * Provides layout selection modal and visual column indicators
 */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { JSX } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getSelection,
  $isRangeSelection,
  createCommand,
  COMMAND_PRIORITY_EDITOR,
} from 'lexical';
import { $insertNodeToNearestRoot } from '@lexical/utils';
import { $createLayoutContainerNode } from '../nodes/LayoutContainerNode';
import { $createLayoutItemNode } from '../nodes/LayoutItemNode';
import { $createParagraphNode } from 'lexical';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Columns2, Columns3, Columns4, Grid2X2 } from 'lucide-react';

export const INSERT_LAYOUT_COMMAND = createCommand('INSERT_LAYOUT_COMMAND');

const LAYOUT_OPTIONS = [
  {
    key: 'two-column',
    columns: 2,
    icon: Columns2,
    label: 'Two Columns',
    description: 'Side by side layout',
    preview: 'grid-cols-2',
  },
  {
    key: 'three-column',
    columns: 3,
    icon: Columns3,
    label: 'Three Columns',
    description: 'Triple column layout',
    preview: 'grid-cols-3',
  },
  {
    key: 'four-column',
    columns: 4,
    icon: Columns4,
    label: 'Four Columns',
    description: 'Quad column layout',
    preview: 'grid-cols-4',
  },
  {
    key: 'sidebar-main',
    columns: 2,
    icon: Grid2X2,
    label: 'Sidebar + Main',
    description: '1:2 ratio layout',
    preview: 'grid-cols-[1fr_2fr]',
  },
];

export default function LayoutPlugin(): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const insertLayout = useCallback(
    (columns: number, variant?: string) => {
      editor.update(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return;

        // Create layout container
        const layoutContainer = $createLayoutContainerNode(columns);

        // Create layout items based on variant
        if (variant === 'sidebar-main' && columns === 2) {
          // 1:2 ratio layout
          const sidebarItem = $createLayoutItemNode();
          sidebarItem.append($createParagraphNode());

          const mainItem = $createLayoutItemNode();
          mainItem.append($createParagraphNode());

          layoutContainer.append(sidebarItem, mainItem);
        } else {
          // Equal columns
          for (let i = 0; i < columns; i++) {
            const layoutItem = $createLayoutItemNode();
            layoutItem.append($createParagraphNode());
            layoutContainer.append(layoutItem);
          }
        }

        $insertNodeToNearestRoot(layoutContainer);
      });

      setIsModalOpen(false);

      // Refocus editor
      setTimeout(() => editor.focus(), 0);
    },
    [editor],
  );

  useEffect(() => {
    return editor.registerCommand(
      INSERT_LAYOUT_COMMAND,
      (payload: number | undefined) => {
        if (typeof payload === 'number') {
          // Direct insertion with column count
          insertLayout(payload);
        } else {
          // Show modal for layout selection
          setIsModalOpen(true);
        }
        return true;
      },
      COMMAND_PRIORITY_EDITOR,
    );
  }, [editor, insertLayout]);

  return (
    <Sheet open={isModalOpen} onOpenChange={setIsModalOpen}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Choose Layout</SheetTitle>
          <SheetDescription>
            Select a layout structure for your content
          </SheetDescription>
        </SheetHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          {LAYOUT_OPTIONS.map((option) => {
            const Icon = option.icon;
            return (
              <Button
                key={option.key}
                variant="outline"
                className="h-auto p-4 flex-col space-y-2"
                onClick={() =>
                  insertLayout(
                    option.columns,
                    option.key.includes('sidebar') ? 'sidebar-main' : undefined,
                  )
                }
              >
                <Icon className="h-8 w-8" />
                <div className="text-center">
                  <div className="font-medium">{option.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {option.description}
                  </div>
                </div>

                {/* Visual preview */}
                <div className={`grid ${option.preview} gap-1 w-full h-6 mt-2`}>
                  {Array.from({ length: option.columns }).map((_, i) => (
                    <div
                      key={i}
                      className="bg-muted border border-border rounded-sm"
                    />
                  ))}
                </div>
              </Button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// CSS for layout visual indicators (to be added to global styles)
export const LAYOUT_STYLES = `
/* Layout container with visual guides */
.layout-container {
  position: relative;
  margin: 1rem 0;
}

.layout-container::before {
  content: '';
  position: absolute;
  top: -4px;
  left: -4px;
  right: -4px;
  bottom: -4px;
  border: 2px dashed hsl(var(--border));
  border-radius: 6px;
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
}

.layout-container:hover::before,
.layout-container:focus-within::before {
  opacity: 0.6;
}

/* Layout items with guides */
.layout-item {
  position: relative;
  min-height: 100px;
  padding: 1rem;
  border: 1px dashed transparent;
  transition: border-color 0.2s ease;
}

.layout-item:hover,
.layout-item:focus-within {
  border-color: hsl(var(--border));
  background-color: hsl(var(--muted) / 0.3);
}

.layout-item:empty::before {
  content: 'Click to add content...';
  color: hsl(var(--muted-foreground));
  font-style: italic;
  pointer-events: none;
}

/* Draggable block styling */
.draggable-block-menu {
  opacity: 0;
  position: absolute;
  left: 0;
  top: 0;
  cursor: grab;
  user-select: none;
  width: 24px;
  height: 24px;
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.2s ease;
}

.draggable-block-menu:hover {
  background: hsl(var(--accent));
}

.draggable-block-menu:active {
  cursor: grabbing;
}

/* Target line for drag operations */
.draggable-block-target-line {
  pointer-events: none;
  background: hsl(var(--primary));
  height: 2px;
  position: absolute;
  left: 0;
  top: 0;
  opacity: 0;
  will-change: transform;
}

/* Floating add button positioning */
.floating-add-button {
  pointer-events: auto;
}
`;
