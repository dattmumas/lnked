'use client';

import { useEffect, useState } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';
import { CheckListPlugin } from '@lexical/react/LexicalCheckListPlugin';
import { ClearEditorPlugin } from '@lexical/react/LexicalClearEditorPlugin';
import { ClickableLinkPlugin } from '@lexical/react/LexicalClickableLinkPlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { HashtagPlugin } from '@lexical/react/LexicalHashtagPlugin';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { HorizontalRulePlugin } from '@lexical/react/LexicalHorizontalRulePlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { TabIndentationPlugin } from '@lexical/react/LexicalTabIndentationPlugin';
import { TablePlugin } from '@lexical/react/LexicalTablePlugin';

// Import playground components - but avoid problematic ones
import PlaygroundNodes from '@/components/lexical-playground/nodes/PlaygroundNodes';
import PlaygroundEditorTheme from '@/components/lexical-playground/themes/PlaygroundEditorTheme';
import { ToolbarContext } from '@/components/lexical-playground/context/ToolbarContext';
import { SharedHistoryContext } from '@/components/lexical-playground/context/SharedHistoryContext';
import AutoLinkPlugin from '@/components/lexical-playground/plugins/AutoLinkPlugin';
import CodeHighlightPlugin from '@/components/lexical-playground/plugins/CodeHighlightPlugin';
import EmojisPlugin from '@/components/lexical-playground/plugins/EmojisPlugin';
import { LayoutPlugin } from '@/components/lexical-playground/plugins/LayoutPlugin/LayoutPlugin';
import LinkPlugin from '@/components/lexical-playground/plugins/LinkPlugin';
import MarkdownShortcutPlugin from '@/components/lexical-playground/plugins/MarkdownShortcutPlugin';
import ToolbarPlugin from '@/components/lexical-playground/plugins/ToolbarPlugin';
import ContentEditable from '@/components/lexical-playground/ui/ContentEditable';

interface PostEditorProps {
  initialContent?: string;
  placeholder?: string;
  onChange?: (json: string) => void;
}

function LoadInitialJsonPlugin({ json }: { json?: string }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!json) return;
    try {
      editor.setEditorState(editor.parseEditorState(json));
    } catch (err) {
      console.error('Could not parse initialContent JSON', err);
    }
  }, [editor, json]);

  return null;
}

function EditorContent({
  placeholder,
  initialContent,
  onChange,
}: {
  placeholder: string;
  initialContent?: string;
  onChange?: (json: string) => void;
}) {
  const [editor] = useLexicalComposerContext();
  const [activeEditor, setActiveEditor] = useState(editor);
  const [isLinkEditMode, setIsLinkEditMode] = useState<boolean>(false);
  const isEditable = true;

  return (
    <div className="editor-shell">
      <ToolbarPlugin
        editor={editor}
        activeEditor={activeEditor}
        setActiveEditor={setActiveEditor}
        setIsLinkEditMode={setIsLinkEditMode}
      />
      <div className="editor-container">
        <AutoFocusPlugin />
        <ClearEditorPlugin />
        <EmojisPlugin />
        <HashtagPlugin />
        <AutoLinkPlugin />

        <HistoryPlugin />
        <RichTextPlugin
          contentEditable={
            <div className="editor-scroller">
              <div className="editor">
                <ContentEditable placeholder={placeholder} />
              </div>
            </div>
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
        <MarkdownShortcutPlugin />
        <CodeHighlightPlugin />
        <ListPlugin />
        <CheckListPlugin />
        <TablePlugin
          hasCellMerge={true}
          hasCellBackgroundColor={true}
          hasHorizontalScroll={true}
        />
        <LinkPlugin />
        <ClickableLinkPlugin disabled={!isEditable} />
        <HorizontalRulePlugin />
        <TabIndentationPlugin />
        <LayoutPlugin />

        {initialContent && <LoadInitialJsonPlugin json={initialContent} />}
        {onChange && (
          <OnChangePlugin
            onChange={(state) => onChange(JSON.stringify(state))}
            ignoreSelectionChange
          />
        )}
      </div>
    </div>
  );
}

export default function LexicalPlaygroundEditorInternal({
  initialContent,
  placeholder = 'Enter some rich text...',
  onChange,
}: PostEditorProps) {
  const initialConfig = {
    namespace: 'Playground',
    theme: PlaygroundEditorTheme,
    nodes: [...PlaygroundNodes],
    onError(error: Error) {
      console.error(error);
    },
  };

  return (
    <div className="lexical-playground">
      <LexicalComposer initialConfig={initialConfig}>
        <SharedHistoryContext>
          <ToolbarContext>
            <EditorContent
              placeholder={placeholder}
              initialContent={initialContent}
              onChange={onChange}
            />
          </ToolbarContext>
        </SharedHistoryContext>
      </LexicalComposer>
    </div>
  );
}
