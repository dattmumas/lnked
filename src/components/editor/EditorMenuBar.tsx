'use client';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Link,
  Unlink,
  Image,
  Type,
  ChevronDown,
  Undo,
  Redo,
  Highlighter,
  Superscript,
  Subscript,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Youtube,
  Table,
  Minus,
  Palette,
  FileText,
} from 'lucide-react';
import { useState, useRef, useEffect, startTransition } from 'react';

import { useEditorContext } from '@/components/editor/EditorContext';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function EditorMenuBar() {
  const editor = useEditorContext();
  const [imageUrl, setImageUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  if (!editor) {
    return null;
  }

  const handleAddImage = () => {
    if (imageUrl.trim()) {
      requestAnimationFrame(() => {
        if (!mountedRef.current) return;
        try {
          editor.chain().focus().setImage({ src: imageUrl.trim() }).run();
        } catch (error) {
          console.error('Failed to add image:', error);
        }
      });
      setImageUrl('');
      setIsImageDialogOpen(false);
    }
  };

  const handleSetLink = () => {
    requestAnimationFrame(() => {
      if (!mountedRef.current) return;
      try {
        if (linkUrl.trim()) {
          editor
            .chain()
            .focus()
            .extendMarkRange('link')
            .setLink({ href: linkUrl.trim() })
            .run();
        } else {
          editor.chain().focus().extendMarkRange('link').unsetLink().run();
        }
      } catch (error) {
        console.error('Failed to set link:', error);
      }
    });
    setLinkUrl('');
    setIsLinkDialogOpen(false);
  };

  const openLinkDialog = () => {
    const previousUrl = editor.getAttributes('link')['href'] as
      | string
      | undefined;
    setLinkUrl(previousUrl || '');
    setIsLinkDialogOpen(true);
  };

  const getCurrentStyle = () => {
    if (editor.isActive('heading', { level: 1 })) return 'Heading 1';
    if (editor.isActive('heading', { level: 2 })) return 'Heading 2';
    if (editor.isActive('heading', { level: 3 })) return 'Heading 3';
    return 'Paragraph';
  };

  return (
    <div className="flex items-center gap-1 p-3 border-b bg-background">
      {/* Undo/Redo */}
      <div className="flex items-center">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0 rounded-md"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo"
          aria-label="Undo"
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0 rounded-md"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo"
          aria-label="Redo"
        >
          <Redo className="h-4 w-4" />
        </Button>
      </div>

      {/* Style Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 px-3 rounded-md font-medium"
            onMouseDown={(e) => e.preventDefault()}
          >
            <span className="mr-1">Style</span>
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuItem
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().setParagraph().run()}
            className={editor.isActive('paragraph') ? 'bg-accent' : ''}
          >
            <Type className="h-4 w-4 mr-2" />
            Paragraph
          </DropdownMenuItem>
          <DropdownMenuItem
            onMouseDown={(e) => e.preventDefault()}
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 1 }).run()
            }
            className={
              editor.isActive('heading', { level: 1 }) ? 'bg-accent' : ''
            }
          >
            <Heading1 className="h-4 w-4 mr-2" />
            Heading 1
          </DropdownMenuItem>
          <DropdownMenuItem
            onMouseDown={(e) => e.preventDefault()}
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
            className={
              editor.isActive('heading', { level: 2 }) ? 'bg-accent' : ''
            }
          >
            <Heading2 className="h-4 w-4 mr-2" />
            Heading 2
          </DropdownMenuItem>
          <DropdownMenuItem
            onMouseDown={(e) => e.preventDefault()}
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 3 }).run()
            }
            className={
              editor.isActive('heading', { level: 3 }) ? 'bg-accent' : ''
            }
          >
            <Heading3 className="h-4 w-4 mr-2" />
            Heading 3
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={editor.isActive('bulletList') ? 'bg-accent' : ''}
          >
            <List className="h-4 w-4 mr-2" />
            Bullet List
          </DropdownMenuItem>
          <DropdownMenuItem
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={editor.isActive('orderedList') ? 'bg-accent' : ''}
          >
            <ListOrdered className="h-4 w-4 mr-2" />
            Numbered List
          </DropdownMenuItem>
          <DropdownMenuItem
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={editor.isActive('blockquote') ? 'bg-accent' : ''}
          >
            <Quote className="h-4 w-4 mr-2" />
            Quote
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Core Formatting */}
      <div className="flex items-center">
        <Button
          type="button"
          size="sm"
          variant={editor.isActive('bold') ? 'default' : 'ghost'}
          className="h-8 w-8 p-0 rounded-md font-bold"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Bold"
          aria-label="Bold"
          aria-pressed={editor.isActive('bold')}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant={editor.isActive('italic') ? 'default' : 'ghost'}
          className="h-8 w-8 p-0 rounded-md italic"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italic"
          aria-label="Italic"
          aria-pressed={editor.isActive('italic')}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant={editor.isActive('underline') ? 'default' : 'ghost'}
          className="h-8 w-8 p-0 rounded-md"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="Underline"
          aria-label="Underline"
          aria-pressed={editor.isActive('underline')}
        >
          <Underline className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant={editor.isActive('strike') ? 'default' : 'ghost'}
          className="h-8 w-8 p-0 rounded-md"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          title="Strikethrough"
          aria-label="Strikethrough"
          aria-pressed={editor.isActive('strike')}
        >
          <Strikethrough className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant={editor.isActive('code') ? 'default' : 'ghost'}
          className="h-8 w-8 p-0 rounded-md"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().toggleCode().run()}
          title="Code"
          aria-label="Code"
          aria-pressed={editor.isActive('code')}
        >
          <Code className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant={editor.isActive('highlight') ? 'default' : 'ghost'}
          className="h-8 w-8 p-0 rounded-md"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          title="Highlight"
          aria-label="Highlight"
          aria-pressed={editor.isActive('highlight')}
        >
          <Highlighter className="h-4 w-4" />
        </Button>

        {/* Text Color Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 rounded-md"
              onMouseDown={(e) => e.preventDefault()}
              title="Text Color"
              aria-label="Text Color"
            >
              <Palette className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => editor.chain().focus().unsetColor().run()}
            >
              Default
            </DropdownMenuItem>
            <DropdownMenuItem
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => editor.chain().focus().setColor('#ef4444').run()}
            >
              <div className="w-4 h-4 bg-red-500 rounded mr-2" />
              Red
            </DropdownMenuItem>
            <DropdownMenuItem
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => editor.chain().focus().setColor('#3b82f6').run()}
            >
              <div className="w-4 h-4 bg-blue-500 rounded mr-2" />
              Blue
            </DropdownMenuItem>
            <DropdownMenuItem
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => editor.chain().focus().setColor('#10b981').run()}
            >
              <div className="w-4 h-4 bg-green-500 rounded mr-2" />
              Green
            </DropdownMenuItem>
            <DropdownMenuItem
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => editor.chain().focus().setColor('#f59e0b').run()}
            >
              <div className="w-4 h-4 bg-yellow-500 rounded mr-2" />
              Yellow
            </DropdownMenuItem>
            <DropdownMenuItem
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => editor.chain().focus().setColor('#8b5cf6').run()}
            >
              <div className="w-4 h-4 bg-purple-500 rounded mr-2" />
              Purple
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Font Family Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 px-3 rounded-md"
              onMouseDown={(e) => e.preventDefault()}
              title="Font Family"
            >
              <Type className="h-4 w-4 mr-1" />
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => editor.chain().focus().unsetFontFamily().run()}
            >
              Default
            </DropdownMenuItem>
            <DropdownMenuItem
              onMouseDown={(e) => e.preventDefault()}
              onClick={() =>
                editor.chain().focus().setFontFamily('serif').run()
              }
              style={{ fontFamily: 'serif' }}
            >
              Serif
            </DropdownMenuItem>
            <DropdownMenuItem
              onMouseDown={(e) => e.preventDefault()}
              onClick={() =>
                editor.chain().focus().setFontFamily('monospace').run()
              }
              style={{ fontFamily: 'monospace' }}
            >
              Monospace
            </DropdownMenuItem>
            <DropdownMenuItem
              onMouseDown={(e) => e.preventDefault()}
              onClick={() =>
                editor.chain().focus().setFontFamily('cursive').run()
              }
              style={{ fontFamily: 'cursive' }}
            >
              Cursive
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Link */}
      <Button
        type="button"
        size="sm"
        variant={editor.isActive('link') ? 'default' : 'ghost'}
        className="h-8 w-8 p-0 rounded-md"
        onMouseDown={(e) => e.preventDefault()}
        onClick={openLinkDialog}
        title="Link"
        aria-label="Link"
      >
        <Link className="h-4 w-4" />
      </Button>

      {/* Image */}
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0 rounded-md"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setIsImageDialogOpen(true)}
        title="Image"
        aria-label="Image"
      >
        <Image className="h-4 w-4" />
      </Button>

      {/* Button Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 px-3 rounded-md"
            onMouseDown={(e) => e.preventDefault()}
          >
            <span className="mr-1">Button</span>
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuItem
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            className={editor.isActive('taskList') ? 'bg-accent' : ''}
          >
            <CheckSquare className="h-4 w-4 mr-2" />
            Task List
          </DropdownMenuItem>
          <DropdownMenuItem
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            className={editor.isActive('codeBlock') ? 'bg-accent' : ''}
          >
            <Code className="h-4 w-4 mr-2" />
            Code Block
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* More Options */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 px-3 rounded-md"
            onMouseDown={(e) => e.preventDefault()}
          >
            <span className="mr-1">More</span>
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuItem
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleSuperscript().run()}
            className={editor.isActive('superscript') ? 'bg-accent' : ''}
          >
            <Superscript className="h-4 w-4 mr-2" />
            Superscript
          </DropdownMenuItem>
          <DropdownMenuItem
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().toggleSubscript().run()}
            className={editor.isActive('subscript') ? 'bg-accent' : ''}
          >
            <Subscript className="h-4 w-4 mr-2" />
            Subscript
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            className={
              editor.isActive({ textAlign: 'left' }) ? 'bg-accent' : ''
            }
          >
            <AlignLeft className="h-4 w-4 mr-2" />
            Align Left
          </DropdownMenuItem>
          <DropdownMenuItem
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            className={
              editor.isActive({ textAlign: 'center' }) ? 'bg-accent' : ''
            }
          >
            <AlignCenter className="h-4 w-4 mr-2" />
            Align Center
          </DropdownMenuItem>
          <DropdownMenuItem
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            className={
              editor.isActive({ textAlign: 'right' }) ? 'bg-accent' : ''
            }
          >
            <AlignRight className="h-4 w-4 mr-2" />
            Align Right
          </DropdownMenuItem>
          <DropdownMenuItem
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().setTextAlign('justify').run()}
            className={
              editor.isActive({ textAlign: 'justify' }) ? 'bg-accent' : ''
            }
          >
            <AlignJustify className="h-4 w-4 mr-2" />
            Justify
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              const url = window.prompt('Enter YouTube URL:');
              if (url) {
                editor.chain().focus().setYoutubeVideo({ src: url }).run();
              }
            }}
          >
            <Youtube className="h-4 w-4 mr-2" />
            YouTube Video
          </DropdownMenuItem>
          <DropdownMenuItem
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              startTransition(() => {
                try {
                  editor
                    .chain()
                    .focus()
                    .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                    .run();
                } catch (error) {
                  console.error('Failed to insert table:', error);
                }
              });
            }}
          >
            <Table className="h-4 w-4 mr-2" />
            Insert Table
          </DropdownMenuItem>
          <DropdownMenuItem
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
          >
            <Minus className="h-4 w-4 mr-2" />
            Horizontal Rule
          </DropdownMenuItem>
          <DropdownMenuItem
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              startTransition(() => {
                try {
                  editor
                    .chain()
                    .focus()
                    .insertContent(
                      '<div class="table-of-contents"><h3>Table of Contents</h3><p>Table of contents will appear here based on your headings.</p></div>',
                    )
                    .run();
                } catch (error) {
                  console.error('Failed to insert table of contents:', error);
                }
              });
            }}
          >
            <FileText className="h-4 w-4 mr-2" />
            Table of Contents
          </DropdownMenuItem>
          {editor.isActive('link') && (
            <DropdownMenuItem
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => editor.chain().focus().unsetLink().run()}
            >
              <Unlink className="h-4 w-4 mr-2" />
              Remove Link
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Link Dialog */}
      <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Link</DialogTitle>
            <DialogDescription>
              Enter a URL to create a hyperlink in your content.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="link-url">URL</Label>
              <Input
                id="link-url"
                type="url"
                placeholder="https://example.com"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSetLink();
                  }
                }}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsLinkDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleSetLink}
              >
                {linkUrl ? 'Update Link' : 'Add Link'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Dialog */}
      <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Image</DialogTitle>
            <DialogDescription>
              Enter an image URL to embed it in your content.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="image-url">Image URL</Label>
              <Input
                id="image-url"
                type="url"
                placeholder="https://example.com/image.jpg"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddImage();
                  }
                }}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsImageDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleAddImage}
              >
                Add Image
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
