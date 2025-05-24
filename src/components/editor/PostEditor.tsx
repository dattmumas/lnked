'use client';

import dynamic from 'next/dynamic';
import '@/styles/editor.css';

interface PostEditorProps {
  initialContent?: string;
  placeholder?: string;
  onChange?: (json: string) => void;
}

// Dynamically import the actual editor to avoid SSR issues
const LexicalPlaygroundEditor = dynamic(
  () => import('./LexicalPlaygroundEditorInternal'),
  {
    ssr: false,
    loading: () => (
      <div className="editor-shell" style={{ minHeight: 250 }}>
        <div
          className="flex flex-wrap items-center py-2 px-3 bg-background border-b border-border shadow-sm sticky top-0 z-10"
          style={{ height: 48, minHeight: 48 }}
        >
          {/* Toolbar placeholder: keep height and flex structure */}
        </div>
        <div className="editor-container">
          <div className="editor-scroller" style={{ minHeight: 150 }}>
            <div className="editor" />
          </div>
        </div>
      </div>
    ),
  },
);

export default function PostEditor(props: PostEditorProps) {
  return <LexicalPlaygroundEditor {...props} />;
}
