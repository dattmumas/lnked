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
import dynamic from 'next/dynamic';
import * as React from 'react';

import PlaygroundNodes from '@/components/editor/nodes/PlaygroundNodes';
import AutoLinkPlugin from '@/components/editor/plugins/formatting/AutoLinkPlugin';
import KeywordsPlugin from '@/components/editor/plugins/formatting/KeywordsPlugin';
import LinkPlugin from '@/components/editor/plugins/formatting/LinkPlugin';
import EmojiPickerPlugin from '@/components/editor/plugins/input/EmojiPickerPlugin';
import EmojisPlugin from '@/components/editor/plugins/input/EmojisPlugin';
import TabFocusPlugin from '@/components/editor/plugins/input/TabFocusPlugin';
import CollapsiblePlugin from '@/components/editor/plugins/interactive/CollapsiblePlugin';
import StickyPlugin from '@/components/editor/plugins/interactive/StickyPlugin';
import TableOfContentsPlugin from '@/components/editor/plugins/layout/TableOfContentsPlugin';
import FigmaPlugin from '@/components/editor/plugins/media/FigmaPlugin';
import TwitterPlugin from '@/components/editor/plugins/media/TwitterPlugin';
import YouTubePlugin from '@/components/editor/plugins/media/YouTubePlugin';
import PlaygroundEditorTheme from '@/components/editor/themes/PlaygroundEditorTheme';

// Loading component for dynamic imports
const PluginLoader = (): React.JSX.Element => (
  <div className="animate-pulse bg-muted/20 h-4 w-full rounded" />
);

// Error boundary component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: {
    children: React.ReactNode;
    fallback?: React.ReactNode;
  }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('ReadOnlyLexicalViewer error:', error, errorInfo);
  }

  render(): React.ReactNode {
    if (this.state.hasError === true) {
      return (
        this.props.fallback ?? (
          <div className="text-muted-foreground italic text-center py-8">
            Failed to load content viewer. Please refresh the page.
          </div>
        )
      );
    }

    return this.props.children;
  }
}

// Dynamic imports for client-only plugins
const PollPlugin = dynamic(
  () =>
    import(
      /* webpackChunkName: "poll-plugin" */ '@/components/editor/plugins/interactive/PollPlugin'
    ),
  { ssr: false, loading: () => <PluginLoader /> },
);
const CodeHighlightPlugin = dynamic(
  () =>
    import(
      /* webpackChunkName: "code-highlight-plugin" */ '@/components/editor/plugins/formatting/CodeHighlightPlugin'
    ),
  { ssr: false, loading: () => <PluginLoader /> },
);
const PageBreakPlugin = dynamic(
  () =>
    import(
      /* webpackChunkName: "page-break-plugin" */ '@/components/editor/plugins/layout/PageBreakPlugin'
    ),
  { ssr: false, loading: () => <PluginLoader /> },
);
const LayoutPlugin = dynamic(
  () => import('@/components/editor/plugins/layout/LayoutPlugin/LayoutPlugin'),
  { ssr: false, loading: PluginLoader },
);
const AutoEmbedPlugin = dynamic(
  () =>
    import(
      /* webpackChunkName: "auto-embed-plugin" */ '@/components/editor/plugins/layout/AutoEmbedPlugin'
    ),
  { ssr: false, loading: () => <PluginLoader /> },
);
const FloatingLinkEditorPlugin = dynamic(
  () =>
    import(
      /* webpackChunkName: "floating-link-editor-plugin" */ '@/components/editor/plugins/toolbar/FloatingLinkEditorPlugin'
    ),
  { ssr: false, loading: () => <PluginLoader /> },
);
const CodeActionMenuPlugin = dynamic(
  () =>
    import(
      /* webpackChunkName: "code-action-menu-plugin" */ '@/components/editor/plugins/formatting/CodeActionMenuPlugin'
    ),
  { ssr: false, loading: () => <PluginLoader /> },
);
const TableCellResizer = dynamic(
  () =>
    import(
      /* webpackChunkName: "table-cell-resizer" */ '@/components/editor/plugins/layout/TableCellResizer'
    ),
  { ssr: false, loading: () => <PluginLoader /> },
);
const ContextMenuPlugin = dynamic(
  () =>
    import(
      /* webpackChunkName: "context-menu-plugin" */ '@/components/editor/plugins/toolbar/ContextMenuPlugin'
    ),
  { ssr: false, loading: () => <PluginLoader /> },
);
const SpecialTextPlugin = dynamic(
  () =>
    import(
      /* webpackChunkName: "special-text-plugin" */ '@/components/editor/plugins/formatting/SpecialTextPlugin'
    ),
  { ssr: false, loading: () => <PluginLoader /> },
);
const TableActionMenuPlugin = dynamic(
  () =>
    import(
      /* webpackChunkName: "table-action-menu-plugin" */ '@/components/editor/plugins/layout/TableActionMenuPlugin'
    ),
  { ssr: false, loading: () => <PluginLoader /> },
);
const TableHoverActionsPlugin = dynamic(
  () =>
    import(
      /* webpackChunkName: "table-hover-actions-plugin" */ '@/components/editor/plugins/layout/TableHoverActionsPlugin'
    ),
  { ssr: false, loading: () => <PluginLoader /> },
);
const MaxLengthPlugin = dynamic(
  () => import('@/components/editor/plugins/input/MaxLengthPlugin'),
  { ssr: false, loading: PluginLoader },
);
const ComponentPickerPlugin = dynamic(
  () =>
    import(
      /* webpackChunkName: "component-picker-plugin" */ '@/components/editor/plugins/interactive/ComponentPickerPlugin'
    ),
  { ssr: false, loading: () => <PluginLoader /> },
);
const ImagesPlugin = dynamic(
  () =>
    import(
      /* webpackChunkName: "images-plugin" */ '@/components/editor/plugins/media/ImagesPlugin'
    ),
  { ssr: false, loading: () => <PluginLoader /> },
);
const SpeechToTextPlugin = dynamic(
  () =>
    import(
      /* webpackChunkName: "speech-to-text-plugin" */ '@/components/editor/plugins/input/SpeechToTextPlugin'
    ),
  { ssr: false, loading: () => <PluginLoader /> },
);
const InlineImagePlugin = dynamic(
  () =>
    import(
      /* webpackChunkName: "inline-image-plugin" */ '@/components/editor/plugins/media/InlineImagePlugin'
    ),
  { ssr: false, loading: () => <PluginLoader /> },
);
const DragDropPastePlugin = dynamic(
  () =>
    import(
      /* webpackChunkName: "drag-drop-paste-plugin" */ '@/components/editor/plugins/input/DragDropPastePlugin'
    ),
  { ssr: false, loading: () => <PluginLoader /> },
);
const FloatingTextFormatToolbarPlugin = dynamic(
  () =>
    import(
      /* webpackChunkName: "floating-text-format-toolbar-plugin" */ '@/components/editor/plugins/toolbar/FloatingTextFormatToolbarPlugin'
    ),
  { ssr: false, loading: () => <PluginLoader /> },
);

interface ReadOnlyLexicalViewerClientProps {
  contentJSON: string;
}

// Helper function to validate if content is valid Lexical JSON
function validateLexicalJSON(content: string): string | undefined {
  if (!content || !content.trim()) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(content) as unknown;
    // Check if it has the basic Lexical structure
    if (
      parsed !== undefined &&
      parsed !== null &&
      typeof parsed === 'object' &&
      (parsed as Record<string, unknown>)['root'] !== undefined &&
      (parsed as Record<string, unknown>)['root'] !== null
    ) {
      return content;
    }
    return undefined;
  } catch {
    // Not valid JSON, return undefined
    return undefined;
  }
}

// Error fallback component for invalid content
function InvalidContentFallback({
  content,
}: {
  content: string;
}): React.JSX.Element {
  return (
    <div className="bg-muted/10 border border-muted rounded-lg p-6 my-4">
      <p className="text-muted-foreground text-sm mb-2">
        This content cannot be displayed in the rich editor. Showing as text:
      </p>
      <div className="prose prose-sm dark:prose-invert">
        <p className="whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  );
}

function LoadInitialJsonPlugin({
  json,
}: {
  json?: string;
}): React.ReactElement | null {
  const [editor] = useLexicalComposerContext();
  React.useEffect((): void => {
    if (json === undefined || json === null || json === '') return;
    void Promise.resolve().then(() => {
      try {
        editor.setEditorState(editor.parseEditorState(json));
      } catch (err: unknown) {
        console.error('Could not parse initialContent JSON', err);
      }
    });
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

  // Callback functions to avoid inline arrow functions
  const handleSetIsLinkEditMode = React.useCallback((): void => {
    // No-op for read-only viewer
  }, []);

  // Validate the JSON content first
  const validatedJSON = React.useMemo((): string | undefined => {
    return validateLexicalJSON(contentJSON);
  }, [contentJSON]);

  const initialConfig = React.useMemo(
    () => ({
      namespace: 'Playground',
      theme: PlaygroundEditorTheme,
      nodes: [...PlaygroundNodes],
      ...(validatedJSON ? { editorState: validatedJSON } : {}),
      editable: false,
      readOnly: true,
      onError(error: Error): void {
        console.error('Lexical editor error:', error);
      },
    }),
    [validatedJSON],
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
          <HistoryPlugin />
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
          <HashtagPlugin />
          <AutoLinkPlugin />
          <CodeHighlightPlugin />
          <ListPlugin />
          <CheckListPlugin />
          <TablePlugin
            hasCellMerge
            hasCellBackgroundColor
            hasHorizontalScroll
          />
          <LinkPlugin />
          <ClickableLinkPlugin disabled />
          <HorizontalRulePlugin />
          <TabIndentationPlugin />
          <LayoutPlugin />
          <AutoEmbedPlugin />
          <YouTubePlugin />
          <TwitterPlugin />
          <FigmaPlugin />
          <EmojisPlugin />
          <ComponentPickerPlugin />
          <TableOfContentsPlugin />
          <CollapsiblePlugin />
          <EmojiPickerPlugin />
          <SpeechToTextPlugin />
          <TabFocusPlugin />
          <StickyPlugin />
          <InlineImagePlugin />
          <FloatingTextFormatToolbarPlugin
            setIsLinkEditMode={handleSetIsLinkEditMode}
          />
          <DragDropPastePlugin />
          <KeywordsPlugin />
          <TableHoverActionsPlugin />
          <PageBreakPlugin />
          <FloatingLinkEditorPlugin
            isLinkEditMode={false}
            setIsLinkEditMode={handleSetIsLinkEditMode}
          />
          <MaxLengthPlugin maxLength={10000} />
          <ContextMenuPlugin />
          <SpecialTextPlugin />
          <CodeActionMenuPlugin />
          <TableActionMenuPlugin />
          <PollPlugin />
          <TableCellResizer />
          <ImagesPlugin />
          <LoadInitialJsonPlugin json={contentJSON} />
        </LexicalComposer>
      </div>
    </ErrorBoundary>
  );
}
