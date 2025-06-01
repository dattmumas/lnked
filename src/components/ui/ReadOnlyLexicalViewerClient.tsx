'use client';
import * as React from 'react';
import dynamic from 'next/dynamic';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { HashtagPlugin } from '@lexical/react/LexicalHashtagPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { CheckListPlugin } from '@lexical/react/LexicalCheckListPlugin';
import { TablePlugin } from '@lexical/react/LexicalTablePlugin';
import { HorizontalRulePlugin } from '@lexical/react/LexicalHorizontalRulePlugin';
import { TabIndentationPlugin } from '@lexical/react/LexicalTabIndentationPlugin';
import { ClickableLinkPlugin } from '@lexical/react/LexicalClickableLinkPlugin';
import PlaygroundNodes from '@/components/editor/nodes/PlaygroundNodes';
import PlaygroundEditorTheme from '@/components/editor/themes/PlaygroundEditorTheme';
import AutoLinkPlugin from '@/components/editor/plugins/formatting/AutoLinkPlugin';
import LinkPlugin from '@/components/editor/plugins/formatting/LinkPlugin';
import YouTubePlugin from '@/components/editor/plugins/media/YouTubePlugin';
import TwitterPlugin from '@/components/editor/plugins/media/TwitterPlugin';
import FigmaPlugin from '@/components/editor/plugins/media/FigmaPlugin';
import EmojisPlugin from '@/components/editor/plugins/input/EmojisPlugin';
import TableOfContentsPlugin from '@/components/editor/plugins/layout/TableOfContentsPlugin';
import CollapsiblePlugin from '@/components/editor/plugins/interactive/CollapsiblePlugin';
import EmojiPickerPlugin from '@/components/editor/plugins/input/EmojiPickerPlugin';
import TabFocusPlugin from '@/components/editor/plugins/input/TabFocusPlugin';
import StickyPlugin from '@/components/editor/plugins/interactive/StickyPlugin';
import KeywordsPlugin from '@/components/editor/plugins/formatting/KeywordsPlugin';
import ContentEditable from '@/components/editor/ui/inputs/ContentEditable';

// Dynamic imports for client-only plugins
const PollPlugin = dynamic(
  () => import('@/components/editor/plugins/interactive/PollPlugin'),
  { ssr: false },
);
const CodeHighlightPlugin = dynamic(
  () => import('@/components/editor/plugins/formatting/CodeHighlightPlugin'),
  { ssr: false },
);
const PageBreakPlugin = dynamic(
  () => import('@/components/editor/plugins/layout/PageBreakPlugin'),
  { ssr: false },
);
const LayoutPlugin = dynamic(
  () =>
    import('@/components/editor/plugins/layout/LayoutPlugin/LayoutPlugin').then(
      (mod) => mod.LayoutPlugin,
    ),
  { ssr: false },
);
const AutoEmbedPlugin = dynamic(
  () => import('@/components/editor/plugins/layout/AutoEmbedPlugin'),
  { ssr: false },
);
const FloatingLinkEditorPlugin = dynamic(
  () => import('@/components/editor/plugins/toolbar/FloatingLinkEditorPlugin'),
  { ssr: false },
);
const CodeActionMenuPlugin = dynamic(
  () => import('@/components/editor/plugins/formatting/CodeActionMenuPlugin'),
  { ssr: false },
);
const TableCellResizer = dynamic(
  () => import('@/components/editor/plugins/layout/TableCellResizer'),
  { ssr: false },
);
const ContextMenuPlugin = dynamic(
  () => import('@/components/editor/plugins/toolbar/ContextMenuPlugin'),
  { ssr: false },
);
const SpecialTextPlugin = dynamic(
  () => import('@/components/editor/plugins/formatting/SpecialTextPlugin'),
  { ssr: false },
);
const TableActionMenuPlugin = dynamic(
  () => import('@/components/editor/plugins/layout/TableActionMenuPlugin'),
  { ssr: false },
);
const TableHoverActionsPlugin = dynamic(
  () => import('@/components/editor/plugins/layout/TableHoverActionsPlugin'),
  { ssr: false },
);
const MaxLengthPlugin = dynamic(
  () =>
    import('@/components/editor/plugins/input/MaxLengthPlugin').then(
      (mod) => mod.MaxLengthPlugin,
    ),
  { ssr: false },
);
const ComponentPickerPlugin = dynamic(
  () => import('@/components/editor/plugins/interactive/ComponentPickerPlugin'),
  { ssr: false },
);
const ImagesPlugin = dynamic(
  () => import('@/components/editor/plugins/media/ImagesPlugin'),
  { ssr: false },
);
const SpeechToTextPlugin = dynamic(
  () => import('@/components/editor/plugins/input/SpeechToTextPlugin'),
  { ssr: false },
);
const InlineImagePlugin = dynamic(
  () => import('@/components/editor/plugins/media/InlineImagePlugin'),
  { ssr: false },
);
const DragDropPastePlugin = dynamic(
  () => import('@/components/editor/plugins/input/DragDropPastePlugin'),
  { ssr: false },
);
const FloatingTextFormatToolbarPlugin = dynamic(
  () =>
    import(
      '@/components/editor/plugins/toolbar/FloatingTextFormatToolbarPlugin'
    ),
  { ssr: false },
);

interface ReadOnlyLexicalViewerClientProps {
  contentJSON: string;
}

function LoadInitialJsonPlugin({ json }: { json?: string }) {
  const [editor] = useLexicalComposerContext();
  React.useEffect(() => {
    if (!json) return;
    Promise.resolve().then(() => {
      try {
        editor.setEditorState(editor.parseEditorState(json));
      } catch (err) {
        console.error('Could not parse initialContent JSON', err);
      }
    });
  }, [editor, json]);
  return null;
}

export function ReadOnlyLexicalViewerClient({
  contentJSON,
}: ReadOnlyLexicalViewerClientProps) {
  const initialConfig = React.useMemo(
    () => ({
      namespace: 'Playground',
      theme: PlaygroundEditorTheme,
      nodes: [...PlaygroundNodes],
      editorState: contentJSON,
      editable: false,
      readOnly: true,
      onError(error: Error) {
        console.error(error);
      },
    }),
    [contentJSON],
  );

  return (
    <div className="lexical-playground">
      <LexicalComposer initialConfig={initialConfig}>
        <HistoryPlugin />
        <RichTextPlugin
          contentEditable={
            <div className="editor-scroller">
              <div className="editor">
                <ContentEditable readOnly />
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
        <TablePlugin hasCellMerge hasCellBackgroundColor hasHorizontalScroll />
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
        <FloatingTextFormatToolbarPlugin setIsLinkEditMode={() => {}} />
        <DragDropPastePlugin />
        <KeywordsPlugin />
        <TableHoverActionsPlugin />
        <PageBreakPlugin />
        <FloatingLinkEditorPlugin
          isLinkEditMode={false}
          setIsLinkEditMode={() => {}}
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
  );
}
