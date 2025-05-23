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

export const SLASH_OPTIONS: MenuOption[] = [
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

export function filterSlashOptions(query: string): MenuOption[] {
  if (!query) return SLASH_OPTIONS;
  return SLASH_OPTIONS.filter((opt) =>
    opt.label.toLowerCase().includes(query.toLowerCase()),
  );
}

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

  const repositionMenu = React.useCallback(() => {
    if (!open || !triggerNodeKey) return;
    const domElem = editor.getElementByKey(triggerNodeKey);
    if (!domElem) return;
    const rect = domElem.getBoundingClientRect();
    let x = rect.left;
    let y = rect.bottom;
    const menuEl = menuRef.current;
    if (menuEl) {
      const { offsetHeight, offsetWidth } = menuEl;
      if (y + offsetHeight > window.innerHeight) {
        y = rect.top - offsetHeight - 4;
      } else {
        y += 4;
      }
      if (x + offsetWidth > window.innerWidth) {
        x = rect.right - offsetWidth;
      }
    }
    setMenuPosition({ x, y });
  }, [editor, open, triggerNodeKey]);

  // Use KEY_DOWN_COMMAND to trigger slash menu
  useEffect(() => {
    return editor.registerCommand(
      KEY_DOWN_COMMAND,
      (event) => {
        if (event.key === '/') {
          editor.getEditorState().read(() => {
            const selection = $getSelection();
            if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
              return;
            }

            const anchor = selection.anchor;
            const node = anchor.getNode();

            // Check if we're at the beginning of a line
            const isAtBeginning = anchor.offset === 0;
            const isInEmptyParagraph =
              node.getType() === 'paragraph' &&
              node.getTextContent().trim() === '';
            const isInEmptyTextNode =
              $isTextNode(node) && node.getTextContent() === '';

            if (isAtBeginning || isInEmptyParagraph || isInEmptyTextNode) {
              // Set up the slash menu trigger
              setTimeout(() => {
                setTriggerNodeKey(node.getKey());
                setOpen(true);
                setHighlighted(0);
                setInputString('');
                repositionMenu();
              }, 0);
            }
          });
        }
        return false;
      },
      COMMAND_PRIORITY_LOW,
    );
  }, [editor, repositionMenu]);

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
        repositionMenu();
      });
    });
  }, [editor, open, triggerNodeKey, repositionMenu]);

  // Reposition on scroll/resize
  useEffect(() => {
    if (!open) return;
    const handler = () => repositionMenu();
    window.addEventListener('scroll', handler, true);
    window.addEventListener('resize', handler);
    return () => {
      window.removeEventListener('scroll', handler, true);
      window.removeEventListener('resize', handler);
    };
  }, [open, repositionMenu]);

  // Filter options based on inputString
  const filteredOptions = filterSlashOptions(inputString);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const removeEscape = editor.registerCommand(
      KEY_ESCAPE_COMMAND,
      () => {
        setOpen(false);
        setTriggerNodeKey(null);
        setInputString('');
        editor.focus();
        return true;
      },
      4, // Higher priority than default
    );
    const removeDown = editor.registerCommand(
      KEY_ARROW_DOWN_COMMAND,
      () => {
        if (open && filteredOptions.length > 0) {
          setHighlighted((i: number) => (i + 1) % filteredOptions.length);
          return true;
        }
        return false;
      },
      4, // Higher priority than default
    );
    const removeUp = editor.registerCommand(
      KEY_ARROW_UP_COMMAND,
      () => {
        if (open && filteredOptions.length > 0) {
          setHighlighted(
            (i: number) =>
              (i - 1 + filteredOptions.length) % filteredOptions.length,
          );
          return true;
        }
        return false;
      },
      4, // Higher priority than default
    );
    const removeEnter = editor.registerCommand(
      KEY_ENTER_COMMAND,
      () => {
        if (open && filteredOptions.length > 0) {
          // Run the selected action
          filteredOptions[highlighted].action(editor);
          // Remove the trigger '/' character and any typed text
          if (triggerNodeKey) {
            editor.update(() => {
              const node = $getNodeByKey(triggerNodeKey);
              if (node && $isTextNode(node)) {
                const text = node.getTextContent();
                if (text.startsWith('/')) {
                  node.setTextContent('');
                }
              }
            });
          }
          setOpen(false);
          setTriggerNodeKey(null);
          setInputString('');
          return true;
        }
        return false;
      },
      4, // Higher priority than default
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
              // Execute the action
              opt.action(editor);

              // Clean up the trigger text
              if (triggerNodeKey) {
                editor.update(() => {
                  const node = $getNodeByKey(triggerNodeKey);
                  if (node && $isTextNode(node)) {
                    const text = node.getTextContent();
                    if (text.startsWith('/')) {
                      node.setTextContent('');
                    }
                  }
                });
              }

              // Close menu and cleanup
              setOpen(false);
              setTriggerNodeKey(null);
              setInputString('');

              // Refocus editor
              setTimeout(() => editor.focus(), 0);
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
