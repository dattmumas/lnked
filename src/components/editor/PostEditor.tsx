'use client';

import React, { memo, useCallback } from 'react';

import LexicalOptimizedEditor from '@/components/editor/LexicalOptimizedEditor';

import './styles/PlaygroundBase.css';
import './styles/EditorLayout.css';
import './styles/Toolbar.css';
import './styles/Menus.css';
import './styles/ResponsiveEditor.css';

interface PostEditorProps {
  initialContent?: string;
  placeholder?: string;
  onChange?: (json: string) => void;
  onMarkdownChange?: (markdown: string) => void;
  contentFormat?: 'json' | 'markdown' | 'auto';
}

function PostEditor(props: PostEditorProps): React.JSX.Element {
  const { onChange, onMarkdownChange, ...restProps } = props;

  // Create a wrapper for onChange that handles both JSON and markdown
  const handleChange = useCallback(
    (json: string, markdown?: string) => {
      // Always call the JSON onChange if provided (for backward compatibility)
      if (onChange) {
        onChange(json);
      }

      // Call the markdown onChange if provided and we have markdown
      if (onMarkdownChange && markdown) {
        onMarkdownChange(markdown);
      }
    },
    [onChange, onMarkdownChange],
  );

  return <LexicalOptimizedEditor {...restProps} onChange={handleChange} />;
}

export default memo(PostEditor);
