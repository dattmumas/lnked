'use client';

import React, { memo } from 'react';

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
}

function PostEditor(props: PostEditorProps): React.JSX.Element {
  return <LexicalOptimizedEditor {...props} />;
}

export default memo(PostEditor);
