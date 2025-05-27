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
import PlaygroundNodes from '@/components/lexical-playground/nodes/PlaygroundNodes';
import PlaygroundEditorTheme from '@/components/lexical-playground/themes/PlaygroundEditorTheme';
import AutoLinkPlugin from '@/components/lexical-playground/plugins/AutoLinkPlugin';
import LinkPlugin from '@/components/lexical-playground/plugins/LinkPlugin';
import YouTubePlugin from '@/components/lexical-playground/plugins/YouTubePlugin';
import TwitterPlugin from '@/components/lexical-playground/plugins/TwitterPlugin';
import FigmaPlugin from '@/components/lexical-playground/plugins/FigmaPlugin';
import EmojisPlugin from '@/components/lexical-playground/plugins/EmojisPlugin';
import TableOfContentsPlugin from '@/components/lexical-playground/plugins/TableOfContentsPlugin';
import CollapsiblePlugin from '@/components/lexical-playground/plugins/CollapsiblePlugin';
import EmojiPickerPlugin from '@/components/lexical-playground/plugins/EmojiPickerPlugin';
import TabFocusPlugin from '@/components/lexical-playground/plugins/TabFocusPlugin';
import StickyPlugin from '@/components/lexical-playground/plugins/StickyPlugin';
import KeywordsPlugin from '@/components/lexical-playground/plugins/KeywordsPlugin';
import ContentEditable from '@/components/lexical-playground/ui/ContentEditable';

// Dynamic imports for client-only plugins
const PollPlugin = dynamic(
  () => import('@/components/lexical-playground/plugins/PollPlugin'),
  { ssr: false },
);
const CodeHighlightPlugin = dynamic(
  () => import('@/components/lexical-playground/plugins/CodeHighlightPlugin'),
  { ssr: false },
);
const PageBreakPlugin = dynamic(
  () => import('@/components/lexical-playground/plugins/PageBreakPlugin'),
  { ssr: false },
);
const CommentPlugin = dynamic(
  () => import('@/components/lexical-playground/plugins/CommentPlugin'),
  { ssr: false },
);
const LayoutPlugin = dynamic(
  () =>
    import(
      '@/components/lexical-playground/plugins/LayoutPlugin/LayoutPlugin'
    ).then((mod) => mod.LayoutPlugin),
  { ssr: false },
);
const AutoEmbedPlugin = dynamic(
  () => import('@/components/lexical-playground/plugins/AutoEmbedPlugin'),
  { ssr: false },
);
const FloatingLinkEditorPlugin = dynamic(
  () =>
    import('@/components/lexical-playground/plugins/FloatingLinkEditorPlugin'),
  { ssr: false },
);
const CodeActionMenuPlugin = dynamic(
  () => import('@/components/lexical-playground/plugins/CodeActionMenuPlugin'),
  { ssr: false },
);
const TableCellResizer = dynamic(
  () => import('@/components/lexical-playground/plugins/TableCellResizer'),
  { ssr: false },
);
const TreeViewPlugin = dynamic(
  () => import('@/components/lexical-playground/plugins/TreeViewPlugin'),
  { ssr: false },
);
const ContextMenuPlugin = dynamic(
  () => import('@/components/lexical-playground/plugins/ContextMenuPlugin'),
  { ssr: false },
);
const SpecialTextPlugin = dynamic(
  () => import('@/components/lexical-playground/plugins/SpecialTextPlugin'),
  { ssr: false },
);
const TableActionMenuPlugin = dynamic(
  () => import('@/components/lexical-playground/plugins/TableActionMenuPlugin'),
  { ssr: false },
);
const TableHoverActionsPlugin = dynamic(
  () =>
    import('@/components/lexical-playground/plugins/TableHoverActionsPlugin'),
  { ssr: false },
);
const MaxLengthPlugin = dynamic(
  () =>
    import('@/components/lexical-playground/plugins/MaxLengthPlugin').then(
      (mod) => mod.MaxLengthPlugin,
    ),
  { ssr: false },
);
const ComponentPickerPlugin = dynamic(
  () => import('@/components/lexical-playground/plugins/ComponentPickerPlugin'),
  { ssr: false },
);
const ImagesPlugin = dynamic(
  () => import('@/components/lexical-playground/plugins/ImagesPlugin'),
  { ssr: false },
);
const SpeechToTextPlugin = dynamic(
  () => import('@/components/lexical-playground/plugins/SpeechToTextPlugin'),
  { ssr: false },
);
const InlineImagePlugin = dynamic(
  () => import('@/components/lexical-playground/plugins/InlineImagePlugin'),
  { ssr: false },
);
const DragDropPastePlugin = dynamic(
  () => import('@/components/lexical-playground/plugins/DragDropPastePlugin'),
  { ssr: false },
);
const FloatingTextFormatToolbarPlugin = dynamic(
  () =>
    import(
      '@/components/lexical-playground/plugins/FloatingTextFormatToolbarPlugin'
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
        <TreeViewPlugin />
        <TableHoverActionsPlugin />
        <PageBreakPlugin />
        <FloatingLinkEditorPlugin
          isLinkEditMode={false}
          setIsLinkEditMode={() => {}}
        />
        <MaxLengthPlugin maxLength={10000} />
        <ContextMenuPlugin />
        <SpecialTextPlugin />
        <CommentPlugin />
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
