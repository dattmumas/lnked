"use client";

import type { Editor } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code as CodeIcon,
  Minus,
  Pilcrow, // Pilcrow for Paragraph
} from "lucide-react";

interface TiptapToolbarProps {
  editor: Editor | null;
}

const TiptapToolbar: React.FC<TiptapToolbarProps> = ({ editor }) => {
  if (!editor) {
    return null;
  }

  const iconSize = 18;

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 border-b bg-background rounded-t-md sticky top-0 z-10">
      {/* Text Style Toggle Buttons */}
      <Button
        variant={editor.isActive("bold") ? "secondary" : "ghost"}
        size="icon"
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        title="Bold"
      >
        <Bold size={iconSize} />
      </Button>
      <Button
        variant={editor.isActive("italic") ? "secondary" : "ghost"}
        size="icon"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        title="Italic"
      >
        <Italic size={iconSize} />
      </Button>
      <Button
        variant={editor.isActive("underline") ? "secondary" : "ghost"}
        size="icon"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        disabled={!editor.can().chain().focus().toggleUnderline().run()}
        title="Underline"
      >
        <Underline size={iconSize} />
      </Button>
      <Button
        variant={editor.isActive("strike") ? "secondary" : "ghost"}
        size="icon"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        disabled={!editor.can().chain().focus().toggleStrike().run()}
        title="Strikethrough"
      >
        <Strikethrough size={iconSize} />
      </Button>
      <Button
        variant={editor.isActive("code") ? "secondary" : "ghost"}
        size="icon"
        onClick={() => editor.chain().focus().toggleCode().run()}
        disabled={!editor.can().chain().focus().toggleCode().run()}
        title="Inline Code"
      >
        <CodeIcon size={iconSize} />
      </Button>

      {/* Spacer */}
      <div className="h-6 w-px bg-border mx-1"></div>

      {/* Headings */}
      <Button
        variant={
          editor.isActive("heading", { level: 1 }) ? "secondary" : "ghost"
        }
        size="icon"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        title="Heading 1"
      >
        <Heading1 size={iconSize} />
      </Button>
      <Button
        variant={
          editor.isActive("heading", { level: 2 }) ? "secondary" : "ghost"
        }
        size="icon"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        title="Heading 2"
      >
        <Heading2 size={iconSize} />
      </Button>
      <Button
        variant={
          editor.isActive("heading", { level: 3 }) ? "secondary" : "ghost"
        }
        size="icon"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        title="Heading 3"
      >
        <Heading3 size={iconSize} />
      </Button>
      <Button
        variant={editor.isActive("paragraph") ? "secondary" : "ghost"}
        size="icon"
        onClick={() => editor.chain().focus().setParagraph().run()}
        title="Paragraph"
      >
        <Pilcrow size={iconSize} />
      </Button>

      {/* Spacer */}
      <div className="h-6 w-px bg-border mx-1"></div>

      {/* Lists */}
      <Button
        variant={editor.isActive("bulletList") ? "secondary" : "ghost"}
        size="icon"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        title="Bullet List"
      >
        <List size={iconSize} />
      </Button>
      <Button
        variant={editor.isActive("orderedList") ? "secondary" : "ghost"}
        size="icon"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        title="Ordered List"
      >
        <ListOrdered size={iconSize} />
      </Button>

      {/* Spacer */}
      <div className="h-6 w-px bg-border mx-1"></div>

      {/* Other Blocks */}
      <Button
        variant={editor.isActive("blockquote") ? "secondary" : "ghost"}
        size="icon"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        title="Blockquote"
      >
        <Quote size={iconSize} />
      </Button>
      <Button
        variant={editor.isActive("codeBlock") ? "secondary" : "ghost"}
        size="icon"
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        title="Code Block"
      >
        <CodeIcon size={iconSize} />{" "}
        {/* Using same icon for code block, differentiate if needed */}
      </Button>
      <Button
        variant={"ghost"}
        size="icon"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="Horizontal Rule"
      >
        <Minus size={iconSize} />
      </Button>

      {/* TODO: Add more controls like Link, Undo/Redo, Text Align, etc. */}
    </div>
  );
};

export default TiptapToolbar;
