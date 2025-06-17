'use client';

import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';
import { CheckListPlugin } from '@lexical/react/LexicalCheckListPlugin';
import { ClearEditorPlugin } from '@lexical/react/LexicalClearEditorPlugin';
import { ClickableLinkPlugin } from '@lexical/react/LexicalClickableLinkPlugin';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { HashtagPlugin } from '@lexical/react/LexicalHashtagPlugin';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { HorizontalRulePlugin } from '@lexical/react/LexicalHorizontalRulePlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { TabIndentationPlugin } from '@lexical/react/LexicalTabIndentationPlugin';
import { TablePlugin } from '@lexical/react/LexicalTablePlugin';
import { useEffect, useState, useCallback, useRef } from 'react';

// Core imports - always loaded
import {
  PluginConfig,
  defaultPluginConfig,
  analyzeContentForPlugins,
} from './config/PluginConfig';
import { SharedHistoryContext } from './context/SharedHistoryContext';
import { ToolbarContext } from './context/ToolbarContext';

// Core plugins - always loaded for basic functionality
import PlaygroundNodes from './nodes/PlaygroundNodes';
import AutoLinkPlugin from './plugins/formatting/AutoLinkPlugin';
import CodeActionMenuPlugin from './plugins/formatting/CodeActionMenuPlugin';
import CodeHighlightPlugin from './plugins/formatting/CodeHighlightPlugin';
import KeywordsPlugin from './plugins/formatting/KeywordsPlugin';
import LinkPlugin from './plugins/formatting/LinkPlugin';
import MarkdownShortcutPlugin from './plugins/formatting/MarkdownShortcutPlugin';
import SpecialTextPlugin from './plugins/formatting/SpecialTextPlugin';

// Essential interactive plugins

// Essential input plugins
import DragDropPastePlugin from './plugins/input/DragDropPastePlugin';
import EmojisPlugin from './plugins/input/EmojisPlugin';
import { MaxLengthPlugin } from './plugins/input/MaxLengthPlugin';
import ShortcutsPlugin from './plugins/input/ShortcutsPlugin';
import TabFocusPlugin from './plugins/input/TabFocusPlugin';
import CollapsiblePlugin from './plugins/interactive/CollapsiblePlugin';
import ComponentPickerPlugin from './plugins/interactive/ComponentPickerPlugin';
import DraggableBlockPlugin from './plugins/interactive/DraggableBlockPlugin';

// Essential layout plugins
import AutoEmbedPlugin from './plugins/layout/AutoEmbedPlugin';
import { LayoutPlugin } from './plugins/layout/LayoutPlugin/LayoutPlugin';
import PageBreakPlugin from './plugins/layout/PageBreakPlugin';
import TableCellResizer from './plugins/layout/TableCellResizer';
import TableHoverActionsPlugin from './plugins/layout/TableHoverActionsPlugin';

// Essential media plugins
import ImagesPlugin from './plugins/media/ImagesPlugin';
import InlineImagePlugin from './plugins/media/InlineImagePlugin';

// Essential toolbar plugins

// UI components

// Lazy loading system
import LazyPlugin from './plugins/PluginLoader';
import PlusButtonPlugin from './plugins/PlusButtonPlugin';
import ContextMenuPlugin from './plugins/toolbar/ContextMenuPlugin';
import FloatingLinkEditorPlugin from './plugins/toolbar/FloatingLinkEditorPlugin';
import FloatingTextFormatToolbarPlugin from './plugins/toolbar/FloatingTextFormatToolbarPlugin';
import ToolbarPlugin from './plugins/toolbar/ToolbarPlugin';
import PlaygroundEditorTheme from './themes/PlaygroundEditorTheme';
import ContentEditable from './ui/inputs/ContentEditable';

interface OptimizedEditorProps {
  initialContent?: string;
  placeholder?: string;
  onChange?: (json: string) => void;
  pluginConfig?: Partial<PluginConfig>;
}

function LoadInitialJsonPlugin({ json }: { json?: string }) {
  const [editor] = useLexicalComposerContext();
  const hasLoadedInitialContent = useRef(false);

  useEffect(() => {
    if (!json || hasLoadedInitialContent.current) return;

    const timer = setTimeout(() => {
      try {
        editor.setEditorState(editor.parseEditorState(json));
        hasLoadedInitialContent.current = true;
      } catch (err) {
        console.error('Could not parse initialContent JSON', err);
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [editor]);

  return null;
}

function EditorContent({
  placeholder,
  initialContent,
  onChange,
  advancedPlugins,
}: {
  placeholder: string;
  initialContent?: string;
  onChange?: (json: string) => void;
  advancedPlugins: PluginConfig['advanced'];
}) {
  const [editor] = useLexicalComposerContext();
  const [activeEditor, setActiveEditor] = useState(editor);
  const [isLinkEditMode, setIsLinkEditMode] = useState<boolean>(false);
  const isEditable = true;

  const stableOnChange = useCallback(
    (state: unknown) => {
      if (onChange) {
        onChange(JSON.stringify(state));
      }
    },
    [onChange],
  );

  return (
    <div className="editor-shell w-full">
      <ToolbarPlugin
        editor={editor}
        activeEditor={activeEditor}
        setActiveEditor={setActiveEditor}
        setIsLinkEditMode={setIsLinkEditMode}
      />
      <div className="editor-container w-full">
        {/* Core plugins - always loaded */}
        <AutoFocusPlugin />
        <ClearEditorPlugin />
        <ComponentPickerPlugin />
        <AutoEmbedPlugin />
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

        {/* Essential plugins */}
        <DraggableBlockPlugin />
        <ImagesPlugin />
        <ShortcutsPlugin
          editor={editor}
          setIsLinkEditMode={setIsLinkEditMode}
        />
        <CollapsiblePlugin />
        <TabFocusPlugin />
        <InlineImagePlugin />
        <FloatingTextFormatToolbarPlugin
          setIsLinkEditMode={setIsLinkEditMode}
        />
        <DragDropPastePlugin />
        <KeywordsPlugin />
        <TableHoverActionsPlugin />
        <PageBreakPlugin />
        <FloatingLinkEditorPlugin
          isLinkEditMode={isLinkEditMode}
          setIsLinkEditMode={setIsLinkEditMode}
        />
        <MaxLengthPlugin maxLength={10000} />
        <ContextMenuPlugin />
        <SpecialTextPlugin />
        <CodeActionMenuPlugin />
        <TableCellResizer />

        {/* Advanced plugins - lazy loaded only when needed */}
        <LazyPlugin
          pluginName="equations"
          enabled={advancedPlugins.equations}
        />
        <LazyPlugin
          pluginName="excalidraw"
          enabled={advancedPlugins.excalidraw}
        />
        <LazyPlugin pluginName="poll" enabled={advancedPlugins.poll} />
        <LazyPlugin pluginName="sticky" enabled={advancedPlugins.sticky} />
        <LazyPlugin pluginName="youtube" enabled={advancedPlugins.youtube} />
        <LazyPlugin pluginName="twitter" enabled={advancedPlugins.twitter} />
        <LazyPlugin pluginName="figma" enabled={advancedPlugins.figma} />
        <LazyPlugin
          pluginName="emojiPicker"
          enabled={advancedPlugins.emojiPicker}
        />
        <LazyPlugin
          pluginName="speechToText"
          enabled={advancedPlugins.speechToText}
        />
        <LazyPlugin
          pluginName="tableOfContents"
          enabled={advancedPlugins.tableOfContents}
        />
        <LazyPlugin
          pluginName="tableActionMenu"
          enabled={advancedPlugins.tableActionMenu}
        />

        {initialContent && <LoadInitialJsonPlugin json={initialContent} />}
        {onChange && (
          <OnChangePlugin onChange={stableOnChange} ignoreSelectionChange />
        )}
      </div>
    </div>
  );
}

export default function LexicalOptimizedEditor({
  initialContent,
  placeholder = 'Enter some rich text...',
  onChange,
  pluginConfig,
}: OptimizedEditorProps) {
  const [advancedPlugins, setAdvancedPlugins] = useState<
    PluginConfig['advanced']
  >(defaultPluginConfig.advanced);

  // Analyze initial content to determine which plugins are needed
  useEffect(() => {
    if (initialContent) {
      const neededPlugins = analyzeContentForPlugins(initialContent);
      setAdvancedPlugins((prev) => ({ ...prev, ...neededPlugins }));
    }
  }, [initialContent]);

  // Apply custom plugin configuration if provided
  useEffect(() => {
    if (pluginConfig?.advanced) {
      setAdvancedPlugins((prev) => ({ ...prev, ...pluginConfig.advanced }));
    }
  }, [pluginConfig]);

  const initialConfig = {
    namespace: 'OptimizedPlayground',
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
              advancedPlugins={advancedPlugins}
            />
          </ToolbarContext>
        </SharedHistoryContext>
      </LexicalComposer>
    </div>
  );
}
