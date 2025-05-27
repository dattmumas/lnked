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
import ComponentPickerPlugin from '@/components/lexical-playground/plugins/ComponentPickerPlugin';
import EmojisPlugin from '@/components/lexical-playground/plugins/EmojisPlugin';
import { LayoutPlugin } from '@/components/lexical-playground/plugins/LayoutPlugin/LayoutPlugin';
import LinkPlugin from '@/components/lexical-playground/plugins/LinkPlugin';
import MarkdownShortcutPlugin from '@/components/lexical-playground/plugins/MarkdownShortcutPlugin';
import ToolbarPlugin from '@/components/lexical-playground/plugins/ToolbarPlugin';
import ContentEditable from '@/components/lexical-playground/ui/ContentEditable';
import PlusButtonPlugin from './plugins/PlusButtonPlugin';
import AutoEmbedPlugin from '@/components/lexical-playground/plugins/AutoEmbedPlugin';
import YouTubePlugin from '@/components/lexical-playground/plugins/YouTubePlugin';
import TwitterPlugin from '@/components/lexical-playground/plugins/TwitterPlugin';
import FigmaPlugin from '@/components/lexical-playground/plugins/FigmaPlugin';

// --- BEGIN AUTO-GENERATED PLUGIN IMPORTS ---
import DraggableBlockPlugin from '@/components/lexical-playground/plugins/DraggableBlockPlugin';
import ImagesPlugin from '@/components/lexical-playground/plugins/ImagesPlugin';
import TableOfContentsPlugin from '@/components/lexical-playground/plugins/TableOfContentsPlugin';
import ShortcutsPlugin from '@/components/lexical-playground/plugins/ShortcutsPlugin';
import CollapsiblePlugin from '@/components/lexical-playground/plugins/CollapsiblePlugin';
import EmojiPickerPlugin from '@/components/lexical-playground/plugins/EmojiPickerPlugin';
import SpeechToTextPlugin from '@/components/lexical-playground/plugins/SpeechToTextPlugin';
import TabFocusPlugin from '@/components/lexical-playground/plugins/TabFocusPlugin';
import StickyPlugin from '@/components/lexical-playground/plugins/StickyPlugin';
import InlineImagePlugin from '@/components/lexical-playground/plugins/InlineImagePlugin';
import FloatingTextFormatToolbarPlugin from '@/components/lexical-playground/plugins/FloatingTextFormatToolbarPlugin';
import DragDropPastePlugin from '@/components/lexical-playground/plugins/DragDropPastePlugin';
import KeywordsPlugin from '@/components/lexical-playground/plugins/KeywordsPlugin';
import TreeViewPlugin from '@/components/lexical-playground/plugins/TreeViewPlugin';
import TableHoverActionsPlugin from '@/components/lexical-playground/plugins/TableHoverActionsPlugin';
import PageBreakPlugin from '@/components/lexical-playground/plugins/PageBreakPlugin';
import EquationsPlugin from '@/components/lexical-playground/plugins/EquationsPlugin';
import ExcalidrawPlugin from '@/components/lexical-playground/plugins/ExcalidrawPlugin';
import FloatingLinkEditorPlugin from '@/components/lexical-playground/plugins/FloatingLinkEditorPlugin';
import { MaxLengthPlugin } from '@/components/lexical-playground/plugins/MaxLengthPlugin';
import AutocompletePlugin from '@/components/lexical-playground/plugins/AutocompletePlugin';
import ContextMenuPlugin from '@/components/lexical-playground/plugins/ContextMenuPlugin';
import SpecialTextPlugin from '@/components/lexical-playground/plugins/SpecialTextPlugin';
import CommentPlugin from '@/components/lexical-playground/plugins/CommentPlugin';
import CodeActionMenuPlugin from '@/components/lexical-playground/plugins/CodeActionMenuPlugin';
import TableActionMenuPlugin from '@/components/lexical-playground/plugins/TableActionMenuPlugin';
import PollPlugin from '@/components/lexical-playground/plugins/PollPlugin';
import TableCellResizer from '@/components/lexical-playground/plugins/TableCellResizer';
// --- END AUTO-GENERATED PLUGIN IMPORTS ---

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
        <ComponentPickerPlugin />
        <AutoEmbedPlugin />
        <YouTubePlugin />
        <TwitterPlugin />
        <FigmaPlugin />
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
        <PlusButtonPlugin />

        {/* --- BEGIN AUTO-GENERATED PLUGIN RENDER --- */}
        <DraggableBlockPlugin />
        <ImagesPlugin />
        <TableOfContentsPlugin />
        <ShortcutsPlugin
          editor={editor}
          setIsLinkEditMode={setIsLinkEditMode}
        />
        <CollapsiblePlugin />
        <EmojiPickerPlugin />
        <SpeechToTextPlugin />
        <TabFocusPlugin />
        <StickyPlugin />
        <InlineImagePlugin />
        <FloatingTextFormatToolbarPlugin
          setIsLinkEditMode={setIsLinkEditMode}
        />
        <DragDropPastePlugin />
        <KeywordsPlugin />
        <TreeViewPlugin />
        <TableHoverActionsPlugin />
        <PageBreakPlugin />
        <EquationsPlugin />
        <ExcalidrawPlugin />
        <FloatingLinkEditorPlugin
          isLinkEditMode={isLinkEditMode}
          setIsLinkEditMode={setIsLinkEditMode}
        />
        <MaxLengthPlugin maxLength={10000} />
        <AutocompletePlugin />
        <ContextMenuPlugin />
        <SpecialTextPlugin />
        <CommentPlugin />
        <CodeActionMenuPlugin />
        <TableActionMenuPlugin />
        <PollPlugin />
        <TableCellResizer />
        {/* --- END AUTO-GENERATED PLUGIN RENDER --- */}

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
