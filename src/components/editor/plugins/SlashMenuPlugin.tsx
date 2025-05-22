/*
 * SlashMenuPlugin for Lnked, inspired by Lexical Playground (MIT License)
 * Shows a floating menu when '/' is typed at the start of a new line.
 */
import React, { useEffect, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getSelection,
  $isRangeSelection,
  $getNodeByKey,
  $isTextNode,
  TextNode,
  COMMAND_PRIORITY_LOW,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_ESCAPE_COMMAND,
  KEY_DOWN_COMMAND,
} from 'lexical';
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
  INSERT_TABLE_COMMAND,
  INSERT_HR_COMMAND,
} from '../PostEditor';
import ReactDOM from 'react-dom';
import type { LexicalEditor } from 'lexical';
import { $setBlocksType } from '@lexical/selection';
import { $createHeadingNode, $createQuoteNode } from '@lexical/rich-text';
import { $createParagraphNode } from 'lexical';
import { CodeNode } from '@lexical/code';
import {
  Pilcrow,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Code,
  Table,
  ListChecks,
  SeparatorHorizontal,
  Image as ImageIcon,
  ImagePlus,
  PenTool,
  StickyNote,
  Youtube,
  Twitter,
  SquareSplitVertical,
  LayoutTemplate,
  type LucideIcon,
} from 'lucide-react';

interface MenuOption {
  label: string;
  description?: string;
  icon: LucideIcon;
  action: (editor: LexicalEditor) => void;
}

const SLASH_OPTIONS: MenuOption[] = [
  {
    label: 'Paragraph',
    icon: Pilcrow,
    action: (editor) => {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          $setBlocksType(selection, () => $createParagraphNode());
        }
      });
    },
  },
  {
    label: 'Heading 1',
    icon: Heading1,
    action: (editor) => {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          $setBlocksType(selection, () => $createHeadingNode('h1'));
        }
      });
    },
  },
  {
    label: 'Heading 2',
    icon: Heading2,
    action: (editor) => {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          $setBlocksType(selection, () => $createHeadingNode('h2'));
        }
      });
    },
  },
  {
    label: 'Heading 3',
    icon: Heading3,
    action: (editor) => {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          $setBlocksType(selection, () => $createHeadingNode('h3'));
        }
      });
    },
  },
  {
    label: 'Quote',
    icon: Quote,
    action: (editor) => {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          $setBlocksType(selection, () => $createQuoteNode());
        }
      });
    },
  },
  {
    label: 'Code Block',
    icon: Code,
    action: (editor) => {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          $setBlocksType(selection, () => new CodeNode());
        }
      });
    },
  },
  {
    label: 'Table',
    icon: Table,
    action: (editor) => editor.dispatchCommand(INSERT_TABLE_COMMAND, undefined),
  },
  {
    label: 'Poll',
    icon: ListChecks,
    action: (editor) => editor.dispatchCommand(INSERT_POLL_COMMAND, undefined),
  },
  {
    label: 'Horizontal Rule',
    icon: SeparatorHorizontal,
    action: (editor) => editor.dispatchCommand(INSERT_HR_COMMAND, undefined),
  },
  {
    label: 'Image',
    icon: ImageIcon,
    action: (editor) => editor.dispatchCommand(INSERT_IMAGE_COMMAND, undefined),
  },
  {
    label: 'Inline Image',
    icon: ImagePlus,
    action: (editor) =>
      editor.dispatchCommand(INSERT_INLINE_IMAGE_COMMAND, undefined),
  },
  {
    label: 'Excalidraw',
    icon: PenTool,
    action: (editor) =>
      editor.dispatchCommand(INSERT_EXCALIDRAW_COMMAND, undefined),
  },
  {
    label: 'Sticky Note',
    icon: StickyNote,
    action: (editor) =>
      editor.dispatchCommand(INSERT_STICKY_COMMAND, undefined),
  },
  {
    label: 'YouTube Video',
    icon: Youtube,
    action: (editor) =>
      editor.dispatchCommand(INSERT_YOUTUBE_COMMAND, undefined),
  },
  {
    label: 'Tweet',
    icon: Twitter,
    action: (editor) => editor.dispatchCommand(INSERT_TWEET_COMMAND, undefined),
  },
  {
    label: 'Page Break',
    icon: SquareSplitVertical,
    action: (editor) =>
      editor.dispatchCommand(INSERT_PAGE_BREAK_COMMAND, undefined),
  },
  {
    label: 'Columns Layout',
    icon: LayoutTemplate,
    action: (editor) =>
      editor.dispatchCommand(INSERT_LAYOUT_COMMAND, undefined),
  },
];

const SlashMenuPlugin = () => {
  const [editor] = useLexicalComposerContext();
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const [menuPosition, setMenuPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [triggerNodeKey, setTriggerNodeKey] = useState<string | null>(null);
  const [inputString, setInputString] = useState('');
  const menuRef = React.useRef<HTMLUListElement>(null);

  // Use KEY_DOWN_COMMAND to trigger slash menu
  useEffect(() => {
    return editor.registerCommand(
      KEY_DOWN_COMMAND,
      (event) => {
        if (
          event.key === '/' &&
          $isRangeSelection($getSelection()) &&
          $getSelection() &&
          $getSelection()!.isCollapsed()
        ) {
          const selection = $getSelection();
          if (!selection || !$isRangeSelection(selection)) return false;
          const anchor = selection.anchor;
          if (!anchor) return false;
          const node = anchor.getNode();
          // Allow menu if at start of empty paragraph or empty text node
          const isEmptyText =
            node instanceof TextNode &&
            node.getTextContent() === '' &&
            anchor.offset === 0;
          const isEmptyParagraph =
            node.getType &&
            node.getType() === 'paragraph' &&
            node.getTextContent() === '' &&
            anchor.offset === 0;
          if (isEmptyText || isEmptyParagraph) {
            // Get caret position
            const domElem = editor.getElementByKey(node.getKey());
            if (domElem) {
              const rect = domElem.getBoundingClientRect();
              setMenuPosition({ x: rect.left, y: rect.bottom });
            } else {
              setMenuPosition(null);
            }
            setOpen(true);
            setHighlighted(0);
            setTriggerNodeKey(node.getKey());
            setInputString('');
            // Do NOT prevent default so the '/' character is inserted.
            return false;
          }
        }
        setOpen(false);
        setMenuPosition(null);
        setTriggerNodeKey(null);
        setInputString('');
        return false;
      },
      COMMAND_PRIORITY_LOW,
    );
  }, [editor]);

  // While menu is open, track input and close if selection leaves trigger node or '/' is deleted
  useEffect(() => {
    if (!open || !triggerNodeKey) return;
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
          setOpen(false);
          setTriggerNodeKey(null);
          setInputString('');
          return;
        }
        const anchor = selection.anchor;
        const node = anchor.getNode();
        if (!node || node.getKey() !== triggerNodeKey) {
          setOpen(false);
          setTriggerNodeKey(null);
          setInputString('');
          return;
        }
        const text = node.getTextContent();
        if (!text.startsWith('/')) {
          setOpen(false);
          setTriggerNodeKey(null);
          setInputString('');
          return;
        }
        setInputString(text.slice(1));
        // Update menu position
        const domElem = editor.getElementByKey(node.getKey());
        if (domElem) {
          const rect = domElem.getBoundingClientRect();
          setMenuPosition({ x: rect.left, y: rect.bottom });
        }
      });
    });
  }, [editor, open, triggerNodeKey]);

  // Filter options based on inputString
  const filteredOptions = inputString
    ? SLASH_OPTIONS.filter((opt) =>
        opt.label.toLowerCase().includes(inputString.toLowerCase()),
      )
    : SLASH_OPTIONS;

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const removeEscape = editor.registerCommand(
      KEY_ESCAPE_COMMAND,
      () => {
        setOpen(false);
        editor.focus();
        return true;
      },
      COMMAND_PRIORITY_LOW,
    );
    const removeDown = editor.registerCommand(
      KEY_ARROW_DOWN_COMMAND,
      () => {
        setHighlighted((i: number) => (i + 1) % filteredOptions.length);
        return true;
      },
      COMMAND_PRIORITY_LOW,
    );
    const removeUp = editor.registerCommand(
      KEY_ARROW_UP_COMMAND,
      () => {
        setHighlighted(
          (i: number) =>
            (i - 1 + filteredOptions.length) % filteredOptions.length,
        );
        return true;
      },
      COMMAND_PRIORITY_LOW,
    );
    const removeEnter = editor.registerCommand(
      KEY_ENTER_COMMAND,
      () => {
        if (open) {
          if (filteredOptions.length > 0) {
            // Run the selected action
            filteredOptions[highlighted].action(editor);
            // Remove the trigger '/' character
            if (triggerNodeKey) {
              editor.update(() => {
                const node = $getNodeByKey(triggerNodeKey);
                if (
                  node &&
                  $isTextNode(node) &&
                  node.getTextContent().startsWith('/')
                ) {
                  node.setTextContent('');
                }
              });
            }
          }
          setOpen(false);
          return true;
        }
        return false;
      },
      COMMAND_PRIORITY_LOW,
    );
    return () => {
      removeEscape();
      removeDown();
      removeUp();
      removeEnter();
    };
  }, [editor, open, highlighted, filteredOptions, triggerNodeKey]);

  if (!open || !menuPosition) return null;

  // Render menu at caret position
  return ReactDOM.createPortal(
    <ul
      ref={menuRef}
      role="listbox"
      aria-label="Insert block menu"
      className="fixed z-50 bg-popover text-foreground border border-border shadow rounded-md p-1 max-w-sm w-full"
      style={{
        left: menuPosition.x,
        top: menuPosition.y,
        position: 'fixed',
      }}
    >
      {filteredOptions.length === 0 ? (
        <li className="px-4 py-2 text-muted-foreground">No results</li>
      ) : (
        filteredOptions.map((opt, i) => (
          <li
            key={opt.label}
            role="option"
            aria-selected={i === highlighted}
            className={`px-4 py-2 cursor-pointer flex items-center gap-2 rounded-sm ${
              i === highlighted ? 'bg-accent text-accent-foreground' : ''
            }`}
            onMouseEnter={() => setHighlighted(i)}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              opt.action(editor);
              if (triggerNodeKey) {
                editor.update(() => {
                  const node = $getNodeByKey(triggerNodeKey);
                  if (
                    node &&
                    $isTextNode(node) &&
                    node.getTextContent().startsWith('/')
                  ) {
                    node.setTextContent('');
                  }
                });
              }
              setOpen(false);
            }}
          >
            <opt.icon className="size-4" aria-hidden="true" />
            <span className="font-medium">{opt.label}</span>
            {opt.description && (
              <span className="ml-2 text-muted-foreground text-xs">
                {opt.description}
              </span>
            )}
          </li>
        ))
      )}
    </ul>,
    document.body,
  );
};

export default SlashMenuPlugin;
