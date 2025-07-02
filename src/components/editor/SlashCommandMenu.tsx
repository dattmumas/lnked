'use client';

import { Editor } from '@tiptap/core';
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Code,
  Quote,
  Minus,
  Image,
  Youtube,
  Table,
  Type,
  Hash,
} from 'lucide-react';
import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  forwardRef,
  useImperativeHandle,
} from 'react';

type Range = { from: number; to: number };

interface SlashCommandItem {
  title: string;
  description: string;
  icon: React.ReactNode;
  command: (editor: Editor, range: Range) => void;
}

const commands: SlashCommandItem[] = [
  {
    title: 'Heading 1',
    description: 'Big section heading',
    icon: <Heading1 className="w-4 h-4" />,
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run();
    },
  },
  {
    title: 'Heading 2',
    description: 'Medium section heading',
    icon: <Heading2 className="w-4 h-4" />,
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run();
    },
  },
  {
    title: 'Heading 3',
    description: 'Small section heading',
    icon: <Heading3 className="w-4 h-4" />,
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run();
    },
  },
  {
    title: 'Bullet List',
    description: 'Create a simple bullet list',
    icon: <List className="w-4 h-4" />,
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    title: 'Numbered List',
    description: 'Create a numbered list',
    icon: <ListOrdered className="w-4 h-4" />,
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    title: 'Task List',
    description: 'Create a list with checkboxes',
    icon: <CheckSquare className="w-4 h-4" />,
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleTaskList().run();
    },
  },
  {
    title: 'Code Block',
    description: 'Add a code block with syntax highlighting',
    icon: <Code className="w-4 h-4" />,
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
    },
  },
  {
    title: 'Blockquote',
    description: 'Add a blockquote',
    icon: <Quote className="w-4 h-4" />,
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run();
    },
  },
  {
    title: 'Divider',
    description: 'Add a horizontal divider',
    icon: <Minus className="w-4 h-4" />,
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run();
    },
  },
  {
    title: 'Image',
    description: 'Add an image from URL',
    icon: <Image className="w-4 h-4" />,
    command: (editor, range) => {
      const url = window.prompt('Enter image URL:');
      if (url) {
        editor.chain().focus().deleteRange(range).setImage({ src: url }).run();
      }
    },
  },
  {
    title: 'YouTube Video',
    description: 'Embed a YouTube video',
    icon: <Youtube className="w-4 h-4" />,
    command: (editor, range) => {
      const url = window.prompt('Enter YouTube URL:');
      if (url) {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .setYoutubeVideo({ src: url })
          .run();
      }
    },
  },
  {
    title: 'Table',
    description: 'Insert a table',
    icon: <Table className="w-4 h-4" />,
    command: (editor, range) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run();
    },
  },
  {
    title: 'Text',
    description: 'Plain paragraph text',
    icon: <Type className="w-4 h-4" />,
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).setParagraph().run();
    },
  },
  {
    title: 'Tag',
    description: 'Add a hashtag',
    icon: <Hash className="w-4 h-4" />,
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).insertContent('#').run();
    },
  },
];

interface SlashCommandMenuProps {
  items: Array<{
    title: string;
    description: string;
    icon: React.ReactNode;
    command: () => void;
  }>;
  command: (item: {
    title: string;
    description: string;
    icon: React.ReactNode;
    command: () => void;
  }) => void;
}

const SlashCommandMenu = forwardRef<
  { onKeyDown: (params: { event: KeyboardEvent }) => boolean },
  SlashCommandMenuProps
>(({ items, command }, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const selectItem = useCallback(
    (index: number) => {
      const item = items[index];
      if (item) {
        command(item);
      }
    },
    [command, items],
  );

  const scrollToItem = useCallback((index: number) => {
    const item = itemRefs.current[index];
    if (item && containerRef.current) {
      item.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, []);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        const newIndex =
          selectedIndex === 0 ? items.length - 1 : selectedIndex - 1;
        setSelectedIndex(newIndex);
        scrollToItem(newIndex);
        return true;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        const newIndex =
          selectedIndex === items.length - 1 ? 0 : selectedIndex + 1;
        setSelectedIndex(newIndex);
        scrollToItem(newIndex);
        return true;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        selectItem(selectedIndex);
        return true;
      }

      return false;
    },
  }));

  useEffect(() => {
    setSelectedIndex(0);
    // Reset refs array when items change
    itemRefs.current = itemRefs.current.slice(0, items.length);
  }, [items]);

  // Scroll to selected item when selection changes
  useEffect(() => {
    scrollToItem(selectedIndex);
  }, [selectedIndex, scrollToItem]);

  if (items.length === 0) {
    return null;
  }

  return (
    <div ref={containerRef} className="slash-command-menu">
      {items.map((item, index) => (
        <button
          key={item.title}
          ref={(el) => {
            itemRefs.current[index] = el;
          }}
          onClick={() => selectItem(index)}
          onMouseDown={(e) => e.preventDefault()}
          className={`slash-command-item ${
            index === selectedIndex ? 'is-selected' : ''
          }`}
          onMouseEnter={() => setSelectedIndex(index)}
          aria-label={item.title}
          role="option"
          aria-selected={index === selectedIndex}
        >
          <div className="slash-command-item-icon" aria-hidden="true">
            {item.icon}
          </div>
          <div className="slash-command-item-content">
            <div className="slash-command-item-title">{item.title}</div>
            <div className="slash-command-item-description">
              {item.description}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
});

SlashCommandMenu.displayName = 'SlashCommandMenu';

export default SlashCommandMenu;
