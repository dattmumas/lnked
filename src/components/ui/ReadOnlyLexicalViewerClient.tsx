// @ts-nocheck
'use client';
import { CheckListPlugin } from '@lexical/react/LexicalCheckListPlugin';
import { ClickableLinkPlugin } from '@lexical/react/LexicalClickableLinkPlugin';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { HashtagPlugin } from '@lexical/react/LexicalHashtagPlugin';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { HorizontalRulePlugin } from '@lexical/react/LexicalHorizontalRulePlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { TabIndentationPlugin } from '@lexical/react/LexicalTabIndentationPlugin';
import { TablePlugin } from '@lexical/react/LexicalTablePlugin';
import * as React from 'react';

import PlaygroundNodes from '@/components/editor/nodes/PlaygroundNodes';
import AutoLinkPlugin from '@/components/editor/plugins/formatting/AutoLinkPlugin';
import CodeHighlightPlugin from '@/components/editor/plugins/formatting/CodeHighlightPlugin';

import LinkPlugin from '@/components/editor/plugins/formatting/LinkPlugin';
import EmojisPlugin from '@/components/editor/plugins/input/EmojisPlugin';
import TabFocusPlugin from '@/components/editor/plugins/input/TabFocusPlugin';
import CollapsiblePlugin from '@/components/editor/plugins/interactive/CollapsiblePlugin';
import PlaygroundEditorTheme from '@/components/editor/themes/PlaygroundEditorTheme';
import {
  loadContentIntoEditor,
  validateLexicalJSON,
} from '@/components/editor/utils/content-loader';

// Loading component for dynamic imports
const PluginLoader = (): React.JSX.Element => (
  <div className="animate-pulse bg-muted/20 h-4 w-full rounded" />
);

// Error boundary for graceful failure
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('ReadOnlyLexicalViewer error:', error, errorInfo);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

// Fallback for invalid content
function InvalidContentFallback({
  content,
}: {
  content: string;
}): React.JSX.Element {
  // Attempt to show the content as plain text
  return (
    <div className="p-4 border rounded-md bg-muted/10">
      <pre className="whitespace-pre-wrap font-sans text-sm">{content}</pre>
    </div>
  );
}

interface ReadOnlyLexicalViewerClientProps {
  contentJSON: string;
}

function LoadInitialJsonPlugin({
  json,
}: {
  json?: string;
}): React.ReactElement | null {
  const [editor] = useLexicalComposerContext();

  React.useEffect((): void => {
    if (!json || json.trim() === '') return;

    void loadContentIntoEditor(editor, { content: json, format: 'json' }).catch(
      (error) => {
        console.error('Failed to parse initialContent JSON:', error);
      },
    );
  }, [editor, json]);

  return null;
}

export function ReadOnlyLexicalViewerClient({
  contentJSON,
}: ReadOnlyLexicalViewerClientProps): React.JSX.Element {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect((): void => {
    setMounted(true);
  }, []);

  // Validate the JSON content first
  const validatedJSON = React.useMemo((): string | undefined => {
    return validateLexicalJSON(contentJSON);
  }, [contentJSON]);

  const initialConfig = React.useMemo(
    () => ({
      namespace: 'ReadOnlyViewer',
      theme: PlaygroundEditorTheme,
      nodes: [...PlaygroundNodes],
      editable: false,
      onError(error: Error): void {
        console.error('Lexical editor error:', error);
      },
    }),
    [],
  );

  if (!mounted) {
    return <PluginLoader />;
  }

  if (validatedJSON === undefined) {
    if (
      contentJSON === undefined ||
      contentJSON === null ||
      contentJSON.trim() === ''
    ) {
      return (
        <div className="text-muted-foreground italic text-center py-8">
          No content available.
        </div>
      );
    }
    return <InvalidContentFallback content={contentJSON} />;
  }

  return (
    <ErrorBoundary fallback={<PluginLoader />}>
      <div className="lexical-playground">
        <LexicalComposer initialConfig={initialConfig}>
          {/* Core read-only plugins only */}
          <RichTextPlugin
            contentEditable={
              <div className="editor-scroller">
                <div className="editor">
                  <ContentEditable
                    className="ContentEditable__root"
                    readOnly
                    spellCheck={false}
                  />
                </div>
              </div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />

          {/* Essential plugins for content display */}
          <HashtagPlugin />
          <AutoLinkPlugin />
          <CodeHighlightPlugin />
          <ListPlugin />
          <CheckListPlugin />
          <TablePlugin
            hasCellMerge={false}
            hasCellBackgroundColor
            hasHorizontalScroll
          />
          <LinkPlugin />
          <ClickableLinkPlugin disabled />
          <HorizontalRulePlugin />
          <TabIndentationPlugin />
          <EmojisPlugin />

          <CollapsiblePlugin />
          <TabFocusPlugin />

          {/* Load the content */}
          <LoadInitialJsonPlugin json={validatedJSON} />
        </LexicalComposer>
      </div>
    </ErrorBoundary>
  );
}
