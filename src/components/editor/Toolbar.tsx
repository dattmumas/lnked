'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getSelection,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  SELECTION_CHANGE_COMMAND,
} from 'lexical';
import {
  $isHeadingNode,
  $createHeadingNode,
  $createQuoteNode,
} from '@lexical/rich-text';
import { CodeNode } from '@lexical/code';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code2,
  Undo,
  Redo,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link as LinkIcon,
  PictureInPicture2 as ExcalidrawIcon,
  Image as ImageIcon,
} from 'lucide-react';
import type { JSX } from 'react';
import { $setBlocksType } from '@lexical/selection';
import { $createParagraphNode, type TextFormatType } from 'lexical';
import {
  CAN_UNDO_COMMAND,
  CAN_REDO_COMMAND,
  UNDO_COMMAND,
  REDO_COMMAND,
  FORMAT_ELEMENT_COMMAND,
} from 'lexical';
import { TOGGLE_LINK_COMMAND } from '@lexical/link';
import { $isLinkNode } from '@lexical/link';
import { INSERT_EXCALIDRAW_COMMAND } from './PostEditor';
import { clsx } from 'clsx';
import { CollapsibleContainerNode } from './nodes/CollapsibleContainerNode';
import { HashtagNode } from './nodes/HashtagNode';
import { InlineImageNode } from './nodes/InlineImageNode';
import { LayoutContainerNode } from './nodes/LayoutContainerNode';
import { LayoutItemNode } from './nodes/LayoutItemNode';
import { PageBreakNode } from './nodes/PageBreakNode';
import { StickyNode, STICKY_COLORS } from './nodes/StickyNode';
import { TweetNode } from './nodes/TweetNode';
import { YouTubeNode } from './nodes/YouTubeNode';
import { $insertNodeToNearestRoot } from '@lexical/utils';
import { $createImageNode } from './nodes/ImageNode';
import { $createPollNode } from './nodes/PollNode';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

const BLOCK_TYPES = [
  { type: 'paragraph', label: 'Paragraph' },
  { type: 'h1', label: 'Heading 1' },
  { type: 'h2', label: 'Heading 2' },
  { type: 'h3', label: 'Heading 3' },
  { type: 'quote', label: 'Quote' },
  { type: 'code', label: 'Code Block' },
];

function Toolbar(): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const supabase = createSupabaseBrowserClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Local state for active inline formatting and current block type/attributes
  const [blockType, setBlockType] = useState<string>('paragraph');
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [isCode, setIsCode] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [isLink, setIsLink] = useState(false);
  const uploadImage = async (file: File) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const ext = file.name.split('.').pop() || 'png';
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const path = `public/${user.id}/${filename}`;
    const { error } = await supabase.storage
      .from('posts')
      .upload(path, file, { cacheControl: '3600', upsert: false });

    if (error) {
      // Supabase StorageError's properties are non-enumerable, so spread it to retain message
      console.error('Error uploading image:', {
        message: (error as Error).message,
        statusCode: (error as { statusCode?: number }).statusCode,
        name: (error as Error).name,
      });
      // TODO: replace with a proper toast component
      alert((error as Error).message || 'Failed to upload image');
      return;
    }
    const { data } = supabase.storage.from('posts').getPublicUrl(path);
    const url = data.publicUrl;
    if (!url) return;
    editor.update(() => {
      $insertNodeToNearestRoot($createImageNode(url, file.name));
    });
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadImage(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Listen for undo/redo availability
  useEffect(() => {
    return editor.registerCommand(
      CAN_UNDO_COMMAND,
      (payload) => {
        setCanUndo(payload);
        return false;
      },
      0,
    );
  }, [editor]);
  useEffect(() => {
    return editor.registerCommand(
      CAN_REDO_COMMAND,
      (payload) => {
        setCanRedo(payload);
        return false;
      },
      0,
    );
  }, [editor]);

  // Update isLink state
  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      // Block type
      const anchorNode = selection.anchor.getNode();
      const blockNode = anchorNode.getTopLevelElementOrThrow();
      let blockType: string = blockNode.getType();
      if ($isHeadingNode(blockNode)) {
        blockType = blockNode.getTag(); // "h1", "h2", etc.
      }
      setBlockType(blockType);
      // Inline styles
      setIsBold(selection.hasFormat('bold'));
      setIsItalic(selection.hasFormat('italic'));
      setIsUnderline(selection.hasFormat('underline'));
      setIsStrikethrough(selection.hasFormat('strikethrough'));
      setIsCode(selection.hasFormat('code'));
      // Link
      let node = selection.anchor.getNode();
      while (node != null) {
        if ($isLinkNode(node)) {
          setIsLink(true);
          return;
        }
        const parent = node.getParent();
        if (!parent) break;
        node = parent;
      }
      setIsLink(false);
    }
  }, []);

  useEffect(() => {
    // Register a listener for selection changes and update toolbar
    return editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        editor.getEditorState().read(updateToolbar);
        return false;
      },
      0, // low priority
    );
  }, [editor, updateToolbar]);

  // Block format change handler
  const formatBlock = useCallback(
    (type: string) => {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          switch (type) {
            case 'h1':
              $setBlocksType(selection, () => $createHeadingNode('h1'));
              break;
            case 'h2':
              $setBlocksType(selection, () => $createHeadingNode('h2'));
              break;
            case 'h3':
              $setBlocksType(selection, () => $createHeadingNode('h3'));
              break;
            case 'quote':
              $setBlocksType(selection, () => $createQuoteNode());
              break;
            case 'code':
              $setBlocksType(selection, () => new CodeNode());
              break;
            default:
              $setBlocksType(selection, () => $createParagraphNode());
          }
        }
      });
    },
    [editor],
  );

  // Text format handlers
  const toggleFormat = (format: TextFormatType) => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
  };

  // Alignment handlers
  const formatAlign = (align: 'left' | 'center' | 'right') => {
    editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, align);
  };

  // Link handler
  const insertLink = useCallback(() => {
    if (!isLink) {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, 'https://');
    } else {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
    }
  }, [editor, isLink]);

  // Insert custom node handler
  const handleInsertNode = useCallback(
    (type: string) => {
      editor.update(() => {
        switch (type) {
          case 'collapsible-container':
            $insertNodeToNearestRoot(new CollapsibleContainerNode(false));
            break;
          case 'hashtag':
            $insertNodeToNearestRoot(new HashtagNode('#hashtag'));
            break;
          case 'image':
            $insertNodeToNearestRoot(
              $createImageNode(
                'https://placehold.co/500x300/png',
                'Placeholder image',
                500,
                300,
                500,
                true,
                'Placeholder caption',
              ),
            );
            break;
          case 'inlineimage':
            $insertNodeToNearestRoot(
              new InlineImageNode(
                'https://placehold.co/300x300/png',
                'Inline image',
              ),
            );
            break;
          case 'layoutcontainer':
            $insertNodeToNearestRoot(new LayoutContainerNode(2));
            break;
          case 'layoutitem':
            $insertNodeToNearestRoot(new LayoutItemNode());
            break;
          case 'pagebreak':
            $insertNodeToNearestRoot(new PageBreakNode());
            break;
          case 'poll':
            $insertNodeToNearestRoot(
              $createPollNode('Sample poll question', [
                {
                  text: 'Option 1',
                  uid: Math.random().toString(36).slice(2),
                  votes: [],
                },
                {
                  text: 'Option 2',
                  uid: Math.random().toString(36).slice(2),
                  votes: [],
                },
              ]),
            );
            break;
          case 'sticky':
            $insertNodeToNearestRoot(
              new StickyNode('Sticky note', STICKY_COLORS[0]),
            );
            break;
          case 'tweet':
            $insertNodeToNearestRoot(
              new TweetNode('https://twitter.com/jack/status/20'),
            );
            break;
          case 'youtube':
            $insertNodeToNearestRoot(
              new YouTubeNode('https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
            );
            break;
          default:
            break;
        }
      });
    },
    [editor],
  );

  return (
    <div className="toolbar sticky top-0 z-20 flex items-center gap-2 bg-background px-2 py-1 border-b dark:bg-background/80">
      {/* Quick-insert: GIF */}
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        onChange={onFileChange}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="toolbar-item spaced"
        aria-label="Insert Image"
        title="Insert Image"
      >
        <ImageIcon className="format" />
      </button>
      {/* Quick-insert: Excalidraw */}
      <button
        type="button"
        onClick={() =>
          editor.dispatchCommand(INSERT_EXCALIDRAW_COMMAND, undefined)
        }
        className="toolbar-item spaced"
        aria-label="Insert Excalidraw Canvas"
        title="Insert Excalidraw Canvas"
      >
        <ExcalidrawIcon className="format" />
      </button>
      {/* Undo/Redo */}
      <button
        type="button"
        onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
        className="toolbar-item spaced"
        aria-label="Undo"
        disabled={!canUndo}
      >
        <Undo className="format" />
      </button>
      <button
        type="button"
        onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
        className="toolbar-item spaced"
        aria-label="Redo"
        disabled={!canRedo}
      >
        <Redo className="format" />
      </button>
      <div className="divider" />
      {/* Block format dropdown */}
      <select
        value={blockType}
        onChange={(e) => formatBlock(e.target.value)}
        className="toolbar-item block-controls"
      >
        {BLOCK_TYPES.map((option) => (
          <option key={option.type} value={option.type}>
            {option.label}
          </option>
        ))}
      </select>
      {/* Insert Block Dropdown */}
      <select
        defaultValue=""
        onChange={(e) => {
          if (e.target.value) {
            handleInsertNode(e.target.value);
            e.target.value = ''; // reset dropdown
          }
        }}
        className="toolbar-item block-controls"
        aria-label="Insert Block"
        style={{ minWidth: 120 }}
      >
        <option value="" disabled>
          Insert Block
        </option>
        <option value="collapsible-container">Collapsible Container</option>
        <option value="hashtag">Hashtag</option>
        <option value="image">Image</option>
        <option value="inlineimage">Inline Image</option>
        <option value="layoutcontainer">Layout Container</option>
        <option value="layoutitem">Layout Item</option>
        <option value="pagebreak">Page Break</option>
        <option value="poll">Poll</option>
        <option value="sticky">Sticky Note</option>
        <option value="tweet">Tweet</option>
        <option value="youtube">YouTube</option>
      </select>
      <div className="divider" />
      {/* Alignment buttons */}
      <button
        type="button"
        onClick={() => formatAlign('left')}
        className="toolbar-item spaced"
        aria-label="Align Left"
      >
        <AlignLeft className="format" />
      </button>
      <button
        type="button"
        onClick={() => formatAlign('center')}
        className="toolbar-item spaced"
        aria-label="Align Center"
      >
        <AlignCenter className="format" />
      </button>
      <button
        type="button"
        onClick={() => formatAlign('right')}
        className="toolbar-item spaced"
        aria-label="Align Right"
      >
        <AlignRight className="format" />
      </button>
      <div className="divider" />
      {/* Inline formatting buttons */}
      <button
        type="button"
        onClick={() => toggleFormat('bold')}
        className={clsx('toolbar-item spaced', isBold && 'bg-muted')}
        aria-label="Bold"
      >
        <Bold className="format" />
      </button>
      <button
        type="button"
        onClick={() => toggleFormat('italic')}
        className={clsx('toolbar-item spaced', isItalic && 'bg-muted')}
        aria-label="Italic"
      >
        <Italic className="format" />
      </button>
      <button
        type="button"
        onClick={() => toggleFormat('underline')}
        className={clsx('toolbar-item spaced', isUnderline && 'bg-muted')}
        aria-label="Underline"
      >
        <UnderlineIcon className="format" />
      </button>
      <button
        type="button"
        onClick={() => toggleFormat('strikethrough')}
        className={clsx('toolbar-item spaced', isStrikethrough && 'bg-muted')}
        aria-label="Strikethrough"
      >
        <Strikethrough className="format" />
      </button>
      <button
        type="button"
        onClick={() => toggleFormat('code')}
        className={'toolbar-item spaced ' + (isCode ? 'active' : '')}
        aria-label="Format Inline Code"
      >
        <Code2 className="format" />
      </button>
      {/* Link button */}
      <button
        type="button"
        onClick={insertLink}
        className={'toolbar-item spaced ' + (isLink ? 'active' : '')}
        aria-label="Insert link"
      >
        <LinkIcon className="format" />
      </button>
    </div>
  );
}

export default Toolbar;
