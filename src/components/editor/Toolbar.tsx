'use client';

import React, { useCallback, useEffect, useState } from 'react';
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
  Quote,
  Type,
  Link as LinkIcon,
  Plus,
  MoreHorizontal,
} from 'lucide-react';
import { $setBlocksType } from '@lexical/selection';
import { $createParagraphNode, type TextFormatType } from 'lexical';
import { TOGGLE_LINK_COMMAND } from '@lexical/link';
import { $isLinkNode } from '@lexical/link';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface ToolbarProps {
  className?: string;
}

function Toolbar({ className }: ToolbarProps): React.ReactElement {
  const [editor] = useLexicalComposerContext();

  // Local state for active formatting
  const [blockType, setBlockType] = useState<string>('paragraph');
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isLink, setIsLink] = useState(false);

  // Update toolbar state
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

      // Link detection
      let node = selection.anchor.getNode();
      let isLinkFound = false;
      while (node != null) {
        if ($isLinkNode(node)) {
          isLinkFound = true;
          break;
        }
        const parent = node.getParent();
        if (!parent) break;
        node = parent;
      }
      setIsLink(isLinkFound);
    }
  }, []);

  useEffect(() => {
    return editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        editor.getEditorState().read(updateToolbar);
        return false;
      },
      0,
    );
  }, [editor, updateToolbar]);

  // Format handlers
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

  const toggleFormat = (format: TextFormatType) => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
  };

  const insertLink = useCallback(() => {
    if (!isLink) {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, 'https://');
    } else {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
    }
  }, [editor, isLink]);

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
    <div
      role="toolbar"
      aria-label="Text formatting toolbar"
      className={cn(
        'flex items-center gap-1 p-2 bg-background border border-border/50 rounded-lg shadow-sm backdrop-blur-sm',
        className,
      )}
    >
      {/* Block type selector */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2 font-normal">
            <Type className="w-4 h-4" />
            {getBlockTypeLabel()}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-40">
          <DropdownMenuItem onClick={() => formatBlock('paragraph')}>
            Text
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => formatBlock('h1')}>
            Title
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => formatBlock('h2')}>
            Heading
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => formatBlock('h3')}>
            Subheading
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => formatBlock('quote')}>
            <Quote className="w-4 h-4 mr-2" />
            Quote
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="w-px h-4 bg-border mx-1" />

      {/* Formatting buttons */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => toggleFormat('bold')}
        className={cn('w-8 h-8 p-0', isBold && 'bg-muted text-foreground')}
        aria-label="Bold"
      >
        <Bold className="w-4 h-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => toggleFormat('italic')}
        className={cn('w-8 h-8 p-0', isItalic && 'bg-muted text-foreground')}
        aria-label="Italic"
      >
        <Italic className="w-4 h-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={insertLink}
        className={cn('w-8 h-8 p-0', isLink && 'bg-muted text-foreground')}
        aria-label="Link"
      >
        <LinkIcon className="w-4 h-4" />
      </Button>

      <div className="w-px h-4 bg-border mx-1" />

      {/* Insert menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
            <Plus className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem>📷 Image</DropdownMenuItem>
          <DropdownMenuItem>🎬 Video</DropdownMenuItem>
          <DropdownMenuItem>📊 Poll</DropdownMenuItem>
          <DropdownMenuItem>📝 Quote</DropdownMenuItem>
          <DropdownMenuItem>💭 Note</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* More options */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem>Underline</DropdownMenuItem>
          <DropdownMenuItem>Strikethrough</DropdownMenuItem>
          <DropdownMenuItem>Code</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default Toolbar;
