import { useEditorContext } from '@/components/editor/EditorContext';

/** Expose common editor commands for convenient use in UI components */
export function useEditorCommands() {
  const editor = useEditorContext();

  if (!editor) {
    return {
      // Text formatting
      toggleBold: () => {},
      toggleItalic: () => {},
      toggleUnderline: () => {},
      toggleStrike: () => {},
      toggleCode: () => {},
      toggleHighlight: () => {},
      toggleSuperscript: () => {},
      toggleSubscript: () => {},

      // Headings
      setParagraph: () => {},
      toggleHeading: (level: 1 | 2 | 3) => {},

      // Lists
      toggleBulletList: () => {},
      toggleOrderedList: () => {},
      toggleTaskList: () => {},

      // Blocks
      toggleBlockquote: () => {},
      toggleCodeBlock: () => {},
      setHorizontalRule: () => {},

      // Alignment
      setTextAlign: (align: 'left' | 'center' | 'right' | 'justify') => {},

      // Links & Media
      setLink: (href: string) => {},
      unsetLink: () => {},
      setImage: (src: string) => {},
      setYoutubeVideo: (src: string) => {},

      // Tables
      insertTable: (rows: number, cols: number) => {},

      // Utility
      insertContent: (content: string) => {},
      undo: () => {},
      redo: () => {},

      // State checks
      isActive: (name: string, attrs?: Record<string, unknown>) => false,
      can: () => ({ undo: () => false, redo: () => false }),
    };
  }

  return {
    // Text formatting
    toggleBold: () => editor.chain().focus().toggleBold().run(),
    toggleItalic: () => editor.chain().focus().toggleItalic().run(),
    toggleUnderline: () => editor.chain().focus().toggleUnderline().run(),
    toggleStrike: () => editor.chain().focus().toggleStrike().run(),
    toggleCode: () => editor.chain().focus().toggleCode().run(),
    toggleHighlight: () => editor.chain().focus().toggleHighlight().run(),
    toggleSuperscript: () => editor.chain().focus().toggleSuperscript().run(),
    toggleSubscript: () => editor.chain().focus().toggleSubscript().run(),

    // Headings
    setParagraph: () => editor.chain().focus().setParagraph().run(),
    toggleHeading: (level: 1 | 2 | 3) =>
      editor.chain().focus().toggleHeading({ level }).run(),

    // Lists
    toggleBulletList: () => editor.chain().focus().toggleBulletList().run(),
    toggleOrderedList: () => editor.chain().focus().toggleOrderedList().run(),
    toggleTaskList: () => editor.chain().focus().toggleTaskList().run(),

    // Blocks
    toggleBlockquote: () => editor.chain().focus().toggleBlockquote().run(),
    toggleCodeBlock: () => editor.chain().focus().toggleCodeBlock().run(),
    setHorizontalRule: () => editor.chain().focus().setHorizontalRule().run(),

    // Alignment
    setTextAlign: (align: 'left' | 'center' | 'right' | 'justify') =>
      editor.chain().focus().setTextAlign(align).run(),

    // Links & Media
    setLink: (href: string) =>
      editor.chain().focus().extendMarkRange('link').setLink({ href }).run(),
    unsetLink: () => editor.chain().focus().unsetLink().run(),
    setImage: (src: string) => editor.chain().focus().setImage({ src }).run(),
    setYoutubeVideo: (src: string) =>
      editor.chain().focus().setYoutubeVideo({ src }).run(),

    // Tables
    insertTable: (rows: number = 3, cols: number = 3) =>
      editor
        .chain()
        .focus()
        .insertTable({ rows, cols, withHeaderRow: true })
        .run(),

    // Utility
    insertContent: (content: string) =>
      editor.chain().focus().insertContent(content).run(),
    undo: () => editor.chain().focus().undo().run(),
    redo: () => editor.chain().focus().redo().run(),

    // State checks
    isActive: (name: string, attrs?: Record<string, unknown>) =>
      editor.isActive(name, attrs),
    can: () => editor.can(),
  };
}
