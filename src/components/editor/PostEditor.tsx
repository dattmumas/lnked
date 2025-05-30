'use client';

import dynamic from 'next/dynamic';
import '@/components/lexical-playground/index.css';
import './styles/EditorLayout.css';
import './styles/Toolbar.css';
import './styles/Menus.css';
import './styles/ResponsiveEditor.css';

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
      <div className="lexical-playground">
        <div className="editor-shell" style={{ minHeight: 250 }}>
          <div
            className="toolbar"
            style={{
              height: 48,
              minHeight: 48,
              display: 'flex',
              alignItems: 'center',
              padding: '8px 12px',
              borderBottom: '1px solid hsl(var(--border))',
              background: 'var(--background)',
            }}
          >
            {/* Toolbar placeholder: keep height and flex structure */}
          </div>
          <div className="editor-container">
            <div className="editor-scroller" style={{ minHeight: 150 }}>
              <div className="editor" />
            </div>
          </div>
        </div>
      </div>
    ),
  },
);

export default function PostEditor(props: PostEditorProps) {
  return <LexicalPlaygroundEditor {...props} />;
}
