'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import {
  LexicalComposer,
  type InitialConfigType,
} from '@lexical/react/LexicalComposer';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { TRANSFORMERS } from '@lexical/markdown';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import {
  $getSelection,
  $isRangeSelection,
  createCommand,
  FORMAT_TEXT_COMMAND,
  UNDO_COMMAND,
  REDO_COMMAND,
  CAN_UNDO_COMMAND,
  CAN_REDO_COMMAND,
  SELECTION_CHANGE_COMMAND,
  $createParagraphNode,
  type TextFormatType,
} from 'lexical';
import {
  HeadingNode,
  QuoteNode,
  $createHeadingNode,
  $isHeadingNode,
} from '@lexical/rich-text';
import { ListNode, ListItemNode } from '@lexical/list';
import { CodeNode, CodeHighlightNode } from '@lexical/code';
import { TableNode, TableRowNode, TableCellNode } from '@lexical/table';
import { LinkNode, AutoLinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link';
import { $setBlocksType } from '@lexical/selection';
import {
  INSERT_UNORDERED_LIST_COMMAND,
  INSERT_ORDERED_LIST_COMMAND,
} from '@lexical/list';
import {
  AutoLinkPlugin,
  createLinkMatcherWithRegExp,
} from '@lexical/react/LexicalAutoLinkPlugin';
// Import custom nodes
import { PollNode, $createPollNode } from './nodes/PollNode';
import { ExcalidrawNode, $createExcalidrawNode } from './nodes/ExcalidrawNode';
import { STICKY_COLORS, StickyNode } from './nodes/StickyNode';
import { ImageNode } from './nodes/ImageNode';
import { InlineImageNode } from './nodes/InlineImageNode';
import { TweetNode } from './nodes/TweetNode';
import { YouTubeNode } from './nodes/YouTubeNode';
import { PageBreakNode } from './nodes/PageBreakNode';
import {
  LayoutContainerNode,
  $createLayoutContainerNode,
} from './nodes/LayoutContainerNode';
import { LayoutItemNode, $createLayoutItemNode } from './nodes/LayoutItemNode';
import { HorizontalRuleNode } from '@lexical/react/LexicalHorizontalRuleNode';
import FloatingLinkEditorPlugin from './plugins/FloatingLinkEditorPlugin';
import CodeHighlightPlugin from './plugins/CodeHighlightPlugin';
import DragDropUploadPlugin from './plugins/DragDropUploadPlugin';
import { CollapsibleContainerNode } from './nodes/CollapsibleContainerNode';
import { HashtagNode } from './nodes/HashtagNode';
import EmbedUrlModal from './EmbedUrlModal';
import { $insertNodeToNearestRoot } from '@lexical/utils';
import { TablePlugin } from '@lexical/react/LexicalTablePlugin';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Undo,
  Redo,
  Bold,
  Italic,
  Strikethrough,
  Code,
  Link as LinkIcon,
  Image as ImageIcon,
  Video,
  FileText,
  List,
  ListOrdered,
  X,
  Plus,
  ChevronDown,
} from 'lucide-react';
import SlashMenuPlugin from './plugins/SlashMenuPlugin';

const editorNodes = [
  HeadingNode,
  ListNode,
  ListItemNode,
  QuoteNode,
  CodeNode,
  CodeHighlightNode,
  TableNode,
  TableRowNode,
  TableCellNode,
  HorizontalRuleNode,
  LinkNode,
  AutoLinkNode,
  // Custom nodes
  PollNode,
  ExcalidrawNode,
  StickyNode,
  ImageNode,
  InlineImageNode,
  TweetNode,
  YouTubeNode,
  PageBreakNode,
  LayoutContainerNode,
  LayoutItemNode,
  CollapsibleContainerNode,
  HashtagNode,
];

// Custom insert commands
export const INSERT_POLL_COMMAND = createCommand('INSERT_POLL_COMMAND');
export const INSERT_EXCALIDRAW_COMMAND = createCommand(
  'INSERT_EXCALIDRAW_COMMAND',
);
export const INSERT_STICKY_COMMAND = createCommand('INSERT_STICKY_COMMAND');
export const INSERT_IMAGE_COMMAND = createCommand('INSERT_IMAGE_COMMAND');
export const INSERT_INLINE_IMAGE_COMMAND = createCommand(
  'INSERT_INLINE_IMAGE_COMMAND',
);
export const INSERT_TWEET_COMMAND = createCommand('INSERT_TWEET_COMMAND');
export const INSERT_YOUTUBE_COMMAND = createCommand('INSERT_YOUTUBE_COMMAND');
export const INSERT_PAGE_BREAK_COMMAND = createCommand(
  'INSERT_PAGE_BREAK_COMMAND',
);
export const INSERT_LAYOUT_COMMAND = createCommand('INSERT_LAYOUT_COMMAND');
export const INSERT_HEADING_COMMAND = createCommand('INSERT_HEADING_COMMAND');
export const INSERT_PARAGRAPH_COMMAND = createCommand(
  'INSERT_PARAGRAPH_COMMAND',
);
export const INSERT_QUOTE_COMMAND = createCommand('INSERT_QUOTE_COMMAND');
export const INSERT_CODE_COMMAND = createCommand('INSERT_CODE_COMMAND');
export const INSERT_TABLE_COMMAND = createCommand('INSERT_TABLE_COMMAND');
export const INSERT_HR_COMMAND = createCommand('INSERT_HR_COMMAND');

// URL and email matchers for AutoLinkPlugin
const URL_MATCHER = createLinkMatcherWithRegExp(
  /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi,
);
const EMAIL_MATCHER = createLinkMatcherWithRegExp(
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi,
  (text: string) => `mailto:${text}`,
);
const MATCHERS = [URL_MATCHER, EMAIL_MATCHER];

function lexicalEditorOnError(error: Error) {
  console.error('Lexical editor error:', error);
}

interface PostEditorProps {
  initialContentJSON?: string;
  placeholder?: string;
  onContentChange?: (json: string) => void;
  title?: string;
  onTitleChange?: (title: string) => void;
  titlePlaceholder?: string;
  subtitle?: string;
  onSubtitleChange?: (subtitle: string) => void;
  author?: string;
  onAuthorChange?: (author: string) => void;
}

function LoadInitialJsonPlugin({ json }: { json: string }) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    if (!json) return;
    setTimeout(() => {
      try {
        editor.setEditorState(editor.parseEditorState(json));
      } catch (error) {
        console.error('Error parsing initial JSON content:', error);
      }
    }, 0);
  }, [editor, json]);
  return null;
}

// Command handlers for slash menu
function CommandsPlugin({
  openEmbedModal,
}: {
  openEmbedModal: (
    type: 'tweet' | 'youtube' | 'image' | 'inlineimage',
    onSubmit: (url: string) => void,
  ) => void;
}) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const removeCommands = [
      editor.registerCommand(
        INSERT_POLL_COMMAND,
        () => {
          editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
              const pollNode = $createPollNode('Poll question...', [
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
              ]);
              $insertNodeToNearestRoot(pollNode);
            }
          });
          return true;
        },
        1,
      ),
      editor.registerCommand(
        INSERT_EXCALIDRAW_COMMAND,
        () => {
          editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
              const excalidrawNode = $createExcalidrawNode('');
              $insertNodeToNearestRoot(excalidrawNode);
            }
          });
          return true;
        },
        1,
      ),
      editor.registerCommand(
        INSERT_STICKY_COMMAND,
        () => {
          editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
              const stickyNode = new StickyNode(
                'Type your note...',
                STICKY_COLORS[0],
              );
              $insertNodeToNearestRoot(stickyNode);
            }
          });
          return true;
        },
        1,
      ),
      editor.registerCommand(
        INSERT_IMAGE_COMMAND,
        () => {
          openEmbedModal('image', (url: string) => {
            editor.update(() => {
              const selection = $getSelection();
              if ($isRangeSelection(selection)) {
                const imageNode = new ImageNode(url, 'Image');
                $insertNodeToNearestRoot(imageNode);
              }
            });
          });
          return true;
        },
        1,
      ),
      editor.registerCommand(
        INSERT_INLINE_IMAGE_COMMAND,
        () => {
          openEmbedModal('inlineimage', (url: string) => {
            editor.update(() => {
              const selection = $getSelection();
              if ($isRangeSelection(selection)) {
                const inlineImageNode = new InlineImageNode(
                  url,
                  'Inline Image',
                );
                $insertNodeToNearestRoot(inlineImageNode);
              }
            });
          });
          return true;
        },
        1,
      ),
      editor.registerCommand(
        INSERT_TWEET_COMMAND,
        () => {
          openEmbedModal('tweet', (url: string) => {
            editor.update(() => {
              const selection = $getSelection();
              if ($isRangeSelection(selection)) {
                const tweetNode = new TweetNode(url);
                $insertNodeToNearestRoot(tweetNode);
              }
            });
          });
          return true;
        },
        1,
      ),
      editor.registerCommand(
        INSERT_YOUTUBE_COMMAND,
        () => {
          openEmbedModal('youtube', (url: string) => {
            editor.update(() => {
              const selection = $getSelection();
              if ($isRangeSelection(selection)) {
                const youtubeNode = new YouTubeNode(url);
                $insertNodeToNearestRoot(youtubeNode);
              }
            });
          });
          return true;
        },
        1,
      ),
      editor.registerCommand(
        INSERT_PAGE_BREAK_COMMAND,
        () => {
          editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
              const pageBreakNode = new PageBreakNode();
              $insertNodeToNearestRoot(pageBreakNode);
            }
          });
          return true;
        },
        1,
      ),
      editor.registerCommand(
        INSERT_LAYOUT_COMMAND,
        () => {
          editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
              const container = $createLayoutContainerNode(2);
              const col1 = $createLayoutItemNode();
              col1.append($createParagraphNode());
              const col2 = $createLayoutItemNode();
              col2.append($createParagraphNode());
              container.append(col1);
              container.append(col2);
              $insertNodeToNearestRoot(container);
            }
          });
          return true;
        },
        1,
      ),
      editor.registerCommand(
        INSERT_HR_COMMAND,
        () => {
          editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
              const hrNode = new HorizontalRuleNode();
              $insertNodeToNearestRoot(hrNode);
            }
          });
          return true;
        },
        1,
      ),
      editor.registerCommand(
        INSERT_TABLE_COMMAND,
        () => {
          editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
              // Create a simple 2x2 table
              const tableNode = new TableNode();
              const row1 = new TableRowNode();
              const row2 = new TableRowNode();

              // Add cells to first row
              row1.append(new TableCellNode());
              row1.append(new TableCellNode());

              // Add cells to second row
              row2.append(new TableCellNode());
              row2.append(new TableCellNode());

              tableNode.append(row1);
              tableNode.append(row2);

              $insertNodeToNearestRoot(tableNode);
            }
          });
          return true;
        },
        1,
      ),
    ];

    return () => {
      removeCommands.forEach((remove) => remove());
    };
  }, [editor, openEmbedModal]);

  return null;
}

// Substack-style Toolbar Component
function SubstackToolbar() {
  const [editor] = useLexicalComposerContext();
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [blockType, setBlockType] = useState('paragraph');
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [isCode, setIsCode] = useState(false);

  const updateToolbar = React.useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      // Update formatting state
      setIsBold(selection.hasFormat('bold'));
      setIsItalic(selection.hasFormat('italic'));
      setIsStrikethrough(selection.hasFormat('strikethrough'));
      setIsCode(selection.hasFormat('code'));

      // Update block type
      const anchorNode = selection.anchor.getNode();
      const element =
        anchorNode.getKey() === 'root'
          ? anchorNode
          : anchorNode.getTopLevelElementOrThrow();
      const elementKey = element.getKey();
      const elementDOM = editor.getElementByKey(elementKey);

      if (elementDOM !== null) {
        if ($isHeadingNode(element)) {
          setBlockType((element as HeadingNode).getTag());
        } else {
          setBlockType(element.getType());
        }
      }
    }
  }, [editor]);

  useEffect(() => {
    // Register for selection changes
    const unregisterSelectionListener = editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        editor.getEditorState().read(updateToolbar);
        return false;
      },
      1,
    );

    // Register for undo/redo state
    const unregisterCanUndoListener = editor.registerCommand(
      CAN_UNDO_COMMAND,
      (payload) => {
        setCanUndo(payload);
        return false;
      },
      1,
    );

    const unregisterCanRedoListener = editor.registerCommand(
      CAN_REDO_COMMAND,
      (payload) => {
        setCanRedo(payload);
        return false;
      },
      1,
    );

    return () => {
      unregisterSelectionListener();
      unregisterCanUndoListener();
      unregisterCanRedoListener();
    };
  }, [editor, updateToolbar]);

  const formatText = (format: TextFormatType) => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
    editor.focus();
  };

  const formatBlock = (type: string) => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        if (type === 'paragraph') {
          $setBlocksType(selection, () => $createParagraphNode());
        } else if (type === 'h1') {
          $setBlocksType(selection, () => $createHeadingNode('h1'));
        } else if (type === 'h2') {
          $setBlocksType(selection, () => $createHeadingNode('h2'));
        } else if (type === 'quote') {
          $setBlocksType(selection, () => new QuoteNode());
        }
      }
    });
    editor.focus();
  };

  const insertLink = () => {
    editor.dispatchCommand(TOGGLE_LINK_COMMAND, 'https://');
    editor.focus();
  };

  const insertUnorderedList = () => {
    editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
    editor.focus();
  };

  const insertOrderedList = () => {
    editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
    editor.focus();
  };

  const getBlockTypeLabel = () => {
    switch (blockType) {
      case 'h1':
        return 'Title';
      case 'h2':
        return 'Heading';
      case 'h3':
        return 'Subheading';
      case 'quote':
        return 'Quote';
      case 'code':
        return 'Code';
      default:
        return 'Text';
    }
  };

  return (
    <div className="border-b border-gray-200 bg-white sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-6 py-3">
        <div className="flex items-center gap-1">
          {/* Undo/Redo */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
            onMouseDown={(e) => e.preventDefault()}
            disabled={!canUndo}
            className="h-8 w-8 p-0"
          >
            <Undo className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
            onMouseDown={(e) => e.preventDefault()}
            disabled={!canRedo}
            className="h-8 w-8 p-0"
          >
            <Redo className="h-4 w-4" />
          </Button>

          <div className="w-px h-6 bg-gray-300 mx-2" />

          {/* Style Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="gap-2"
                onMouseDown={(e) => e.preventDefault()}
              >
                {getBlockTypeLabel()} <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => formatBlock('paragraph')}>
                Text
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => formatBlock('h1')}>
                Title
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => formatBlock('h2')}>
                Heading
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => formatBlock('quote')}>
                Quote
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="w-px h-6 bg-gray-300 mx-2" />

          {/* Text Formatting */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => formatText('bold')}
            onMouseDown={(e) => e.preventDefault()}
            className={`h-8 w-8 p-0 ${isBold ? 'bg-gray-100' : ''}`}
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => formatText('italic')}
            onMouseDown={(e) => e.preventDefault()}
            className={`h-8 w-8 p-0 ${isItalic ? 'bg-gray-100' : ''}`}
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => formatText('strikethrough')}
            onMouseDown={(e) => e.preventDefault()}
            className={`h-8 w-8 p-0 ${isStrikethrough ? 'bg-gray-100' : ''}`}
          >
            <Strikethrough className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => formatText('code')}
            onMouseDown={(e) => e.preventDefault()}
            className={`h-8 w-8 p-0 ${isCode ? 'bg-gray-100' : ''}`}
          >
            <Code className="h-4 w-4" />
          </Button>

          <div className="w-px h-6 bg-gray-300 mx-2" />

          {/* Insert Options */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={insertLink}
            onMouseDown={(e) => e.preventDefault()}
            title="Insert Link"
          >
            <LinkIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onMouseDown={(e) => e.preventDefault()}
            title="Insert Image"
          >
            <ImageIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onMouseDown={(e) => e.preventDefault()}
            title="Insert Video"
          >
            <Video className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onMouseDown={(e) => e.preventDefault()}
            title="Insert Poll"
          >
            <FileText className="h-4 w-4" />
          </Button>

          <div className="w-px h-6 bg-gray-300 mx-2" />

          {/* Lists */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={insertUnorderedList}
            onMouseDown={(e) => e.preventDefault()}
            title="Bullet List"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={insertOrderedList}
            onMouseDown={(e) => e.preventDefault()}
            title="Numbered List"
          >
            <ListOrdered className="h-4 w-4" />
          </Button>

          <div className="w-px h-6 bg-gray-300 mx-2" />

          {/* Button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="gap-2"
                onMouseDown={(e) => e.preventDefault()}
              >
                Button <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Subscribe Button</DropdownMenuItem>
              <DropdownMenuItem>Share Button</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="w-px h-6 bg-gray-300 mx-2" />

          {/* More */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="gap-2"
                onMouseDown={(e) => e.preventDefault()}
              >
                More <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Table</DropdownMenuItem>
              <DropdownMenuItem>Divider</DropdownMenuItem>
              <DropdownMenuItem>Poll</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

export default function PostEditor({
  initialContentJSON,
  placeholder = 'Start writing...',
  onContentChange,
  title = '',
  onTitleChange,
  titlePlaceholder = 'Title',
  subtitle = '',
  onSubtitleChange,
  author = '',
  onAuthorChange,
}: PostEditorProps) {
  const [initialContent] = useState(initialContentJSON);

  // Modal state for embed URLs
  const [embedModal, setEmbedModal] = useState<{
    type: 'tweet' | 'youtube' | 'image' | 'inlineimage';
    open: boolean;
    onSubmit: (url: string) => void;
  } | null>(null);

  const initialConfig: InitialConfigType = {
    namespace: 'LnkedPostEditor',
    onError: lexicalEditorOnError,
    nodes: editorNodes,
    theme: {
      paragraph: 'mb-6 text-xl leading-8 text-gray-900',
      quote:
        'border-l-4 border-gray-300 pl-6 my-8 text-xl italic text-gray-700 leading-8',
      heading: {
        h1: 'text-4xl font-bold mb-8 mt-12 leading-tight text-gray-900',
        h2: 'text-3xl font-semibold mb-6 mt-10 leading-tight text-gray-900',
        h3: 'text-2xl font-medium mb-4 mt-8 leading-tight text-gray-900',
      },
      code: 'bg-gray-100 px-2 py-1 rounded text-base font-mono text-gray-800',
      list: {
        ul: 'list-disc ml-8 mb-6 space-y-2',
        ol: 'list-decimal ml-8 mb-6 space-y-2',
        listitem: 'text-xl leading-8 text-gray-900',
      },
      link: 'text-blue-600 underline hover:text-blue-800 transition-colors',
    },
  };

  const handleOnChange = (editorState: import('lexical').EditorState) => {
    const json = JSON.stringify(editorState.toJSON());
    onContentChange?.(json);
  };

  const openEmbedModal = (
    type: 'tweet' | 'youtube' | 'image' | 'inlineimage',
    onSubmit: (url: string) => void,
  ) => {
    setEmbedModal({ type, open: true, onSubmit });
  };

  const closeEmbedModal = () => setEmbedModal(null);

  return (
    <div className="w-full bg-white">
      <LexicalComposer initialConfig={initialConfig}>
        {/* Substack-style Toolbar */}
        <SubstackToolbar />

        {/* Edit email header/footer */}
        <div className="max-w-4xl mx-auto px-6 py-4">
          <button className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-2">
            Edit email header / footer
            <ChevronDown className="h-3 w-3" />
          </button>
        </div>

        {/* Main Editor Content */}
        <div className="max-w-4xl mx-auto px-6 pb-20">
          {/* Title */}
          <div className="mb-4">
            <Input
              value={title}
              onChange={(e) => onTitleChange?.(e.target.value)}
              placeholder={titlePlaceholder}
              className="text-5xl font-bold border-none bg-transparent px-0 py-0 shadow-none focus-visible:ring-0 placeholder:text-gray-400 resize-none leading-tight"
              style={{
                fontSize: '3rem',
                lineHeight: '1.1',
                fontWeight: '700',
              }}
            />
          </div>

          {/* Subtitle */}
          <div className="mb-8">
            <Input
              value={subtitle}
              onChange={(e) => onSubtitleChange?.(e.target.value)}
              placeholder="Add a subtitle..."
              className="text-2xl border-none bg-transparent px-0 py-0 shadow-none focus-visible:ring-0 placeholder:text-gray-400 resize-none leading-relaxed text-gray-600"
              style={{
                fontSize: '1.5rem',
                lineHeight: '1.4',
                fontWeight: '400',
              }}
            />
          </div>

          {/* Author Byline */}
          <div className="mb-12 flex items-center gap-2">
            {author && (
              <div className="bg-gray-100 px-3 py-1 rounded-full flex items-center gap-2">
                <span className="text-sm text-gray-700">{author}</span>
                <button
                  onClick={() => onAuthorChange?.('')}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            <button
              onClick={() => onAuthorChange?.('Author Name')}
              className="w-8 h-8 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center hover:border-gray-400 transition-colors"
            >
              <Plus className="h-4 w-4 text-gray-400" />
            </button>
          </div>

          {/* Main Editor */}
          <div className="relative">
            <RichTextPlugin
              contentEditable={
                <ContentEditable
                  className="outline-none min-h-[60vh] text-xl leading-8 text-gray-900"
                  style={{
                    fontSize: '1.25rem',
                    lineHeight: '2',
                  }}
                />
              }
              placeholder={
                <div className="absolute top-0 left-0 text-xl text-gray-400 pointer-events-none leading-8">
                  {placeholder}
                </div>
              }
              ErrorBoundary={LexicalErrorBoundary}
            />

            {/* Plugins */}
            <HistoryPlugin />
            <ListPlugin />
            <LinkPlugin />
            <AutoLinkPlugin matchers={MATCHERS} />
            <CodeHighlightPlugin />
            <DragDropUploadPlugin />
            <OnChangePlugin onChange={handleOnChange} ignoreSelectionChange />
            <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
            <TablePlugin />
            {initialContent && <LoadInitialJsonPlugin json={initialContent} />}
            <FloatingLinkEditorPlugin />
            <SlashMenuPlugin />
            <CommandsPlugin openEmbedModal={openEmbedModal} />

            {/* Embed modal */}
            <EmbedUrlModal
              open={!!embedModal?.open}
              label={
                embedModal?.type === 'tweet'
                  ? 'Enter Tweet URL'
                  : embedModal?.type === 'youtube'
                    ? 'Enter YouTube URL'
                    : embedModal?.type === 'image'
                      ? 'Enter Image URL'
                      : embedModal?.type === 'inlineimage'
                        ? 'Enter Inline Image URL'
                        : 'Enter URL'
              }
              onSubmit={(url) => {
                embedModal?.onSubmit(url);
                closeEmbedModal();
              }}
              onCancel={closeEmbedModal}
            />
          </div>
        </div>
      </LexicalComposer>
    </div>
  );
}
