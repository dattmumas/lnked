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

// Import reorganized editor components
import PlaygroundNodes from './nodes/PlaygroundNodes';
import PlaygroundEditorTheme from './themes/PlaygroundEditorTheme';
import { ToolbarContext } from './context/ToolbarContext';
import { SharedHistoryContext } from './context/SharedHistoryContext';

// Formatting plugins
import AutoLinkPlugin from './plugins/formatting/AutoLinkPlugin';
import CodeHighlightPlugin from './plugins/formatting/CodeHighlightPlugin';
import LinkPlugin from './plugins/formatting/LinkPlugin';
import MarkdownShortcutPlugin from './plugins/formatting/MarkdownShortcutPlugin';
import KeywordsPlugin from './plugins/formatting/KeywordsPlugin';
import SpecialTextPlugin from './plugins/formatting/SpecialTextPlugin';
import CodeActionMenuPlugin from './plugins/formatting/CodeActionMenuPlugin';

// Interactive plugins
import ComponentPickerPlugin from './plugins/interactive/ComponentPickerPlugin';
import DraggableBlockPlugin from './plugins/interactive/DraggableBlockPlugin';
import CollapsiblePlugin from './plugins/interactive/CollapsiblePlugin';
import StickyPlugin from './plugins/interactive/StickyPlugin';
import EquationsPlugin from './plugins/interactive/EquationsPlugin';
import PollPlugin from './plugins/interactive/PollPlugin';

// Input plugins
import EmojisPlugin from './plugins/input/EmojisPlugin';
import EmojiPickerPlugin from './plugins/input/EmojiPickerPlugin';
import SpeechToTextPlugin from './plugins/input/SpeechToTextPlugin';
import TabFocusPlugin from './plugins/input/TabFocusPlugin';
import ShortcutsPlugin from './plugins/input/ShortcutsPlugin';
import DragDropPastePlugin from './plugins/input/DragDropPastePlugin';
import { MaxLengthPlugin } from './plugins/input/MaxLengthPlugin';
import AutocompletePlugin from './plugins/input/AutocompletePlugin';

// Layout plugins
import { LayoutPlugin } from './plugins/layout/LayoutPlugin/LayoutPlugin';
import TableOfContentsPlugin from './plugins/layout/TableOfContentsPlugin';
import TableHoverActionsPlugin from './plugins/layout/TableHoverActionsPlugin';
import PageBreakPlugin from './plugins/layout/PageBreakPlugin';
import TableActionMenuPlugin from './plugins/layout/TableActionMenuPlugin';
import TableCellResizer from './plugins/layout/TableCellResizer';
import AutoEmbedPlugin from './plugins/layout/AutoEmbedPlugin';

// Media plugins
import ImagesPlugin from './plugins/media/ImagesPlugin';
import InlineImagePlugin from './plugins/media/InlineImagePlugin';
import YouTubePlugin from './plugins/media/YouTubePlugin';
import TwitterPlugin from './plugins/media/TwitterPlugin';
import FigmaPlugin from './plugins/media/FigmaPlugin';
import ExcalidrawPlugin from './plugins/media/ExcalidrawPlugin';

// Toolbar plugins
import ToolbarPlugin from './plugins/toolbar/ToolbarPlugin';
import FloatingTextFormatToolbarPlugin from './plugins/toolbar/FloatingTextFormatToolbarPlugin';
import FloatingLinkEditorPlugin from './plugins/toolbar/FloatingLinkEditorPlugin';
import ContextMenuPlugin from './plugins/toolbar/ContextMenuPlugin';

// UI components
import ContentEditable from './ui/inputs/ContentEditable';
import PlusButtonPlugin from './plugins/PlusButtonPlugin';

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
    <div className="editor-shell w-full">
      <ToolbarPlugin
        editor={editor}
        activeEditor={activeEditor}
        setActiveEditor={setActiveEditor}
        setIsLinkEditMode={setIsLinkEditMode}
      />
      <div className="editor-container w-full">
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
        <TablePlugin hasCellMerge hasCellBackgroundColor hasHorizontalScroll />
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
