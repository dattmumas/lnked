// Specific module declarations for editor plugins used in ReadOnlyLexicalViewerClient
declare module '@/components/editor/plugins/interactive/PollPlugin' {
  import * as React from 'react';
  const C: React.ComponentType<any>;
  export default C;
}

declare module '@/components/editor/plugins/formatting/CodeHighlightPlugin' {
  import * as React from 'react';
  const C: React.ComponentType<any>;
  export default C;
}

declare module '@/components/editor/plugins/layout/PageBreakPlugin' {
  import * as React from 'react';
  const C: React.ComponentType<any>;
  export default C;
}

declare module '@/components/editor/plugins/layout/LayoutPlugin/LayoutPlugin' {
  import * as React from 'react';
  const C: React.ComponentType<any>;
  export default C;
  export const LayoutPlugin: React.ComponentType<any>;
}

declare module '@/components/editor/plugins/layout/AutoEmbedPlugin' {
  import * as React from 'react';
  const C: React.ComponentType<any>;
  export default C;
}

declare module '@/components/editor/plugins/toolbar/FloatingLinkEditorPlugin' {
  import * as React from 'react';
  const C: React.ComponentType<any>;
  export default C;
}

declare module '@/components/editor/plugins/formatting/CodeActionMenuPlugin' {
  import * as React from 'react';
  const C: React.ComponentType<any>;
  export default C;
}

declare module '@/components/editor/plugins/layout/TableCellResizer' {
  import * as React from 'react';
  const C: React.ComponentType<any>;
  export default C;
}

declare module '@/components/editor/plugins/toolbar/ContextMenuPlugin' {
  import * as React from 'react';
  const C: React.ComponentType<any>;
  export default C;
}

declare module '@/components/editor/plugins/formatting/SpecialTextPlugin' {
  import * as React from 'react';
  const C: React.ComponentType<any>;
  export default C;
}

declare module '@/components/editor/plugins/layout/TableActionMenuPlugin' {
  import * as React from 'react';
  const C: React.ComponentType<any>;
  export default C;
}

declare module '@/components/editor/plugins/layout/TableHoverActionsPlugin' {
  import * as React from 'react';
  const C: React.ComponentType<any>;
  export default C;
}

declare module '@/components/editor/plugins/input/MaxLengthPlugin' {
  import * as React from 'react';
  const C: React.ComponentType<any>;
  export default C;
  export const MaxLengthPlugin: React.ComponentType<any>;
}

declare module '@/components/editor/plugins/interactive/ComponentPickerPlugin' {
  import * as React from 'react';
  const C: React.ComponentType<any>;
  export default C;
}

declare module '@/components/editor/plugins/media/ImagesPlugin' {
  import * as React from 'react';
  const C: React.ComponentType<any>;
  export default C;
}

declare module '@/components/editor/plugins/input/SpeechToTextPlugin' {
  import * as React from 'react';
  const C: React.ComponentType<any>;
  export default C;
}

declare module '@/components/editor/plugins/media/InlineImagePlugin' {
  import * as React from 'react';
  const C: React.ComponentType<any>;
  export default C;
}

declare module '@/components/editor/plugins/input/DragDropPastePlugin' {
  import * as React from 'react';
  const C: React.ComponentType<any>;
  export default C;
}

declare module '@/components/editor/plugins/toolbar/FloatingTextFormatToolbarPlugin' {
  import * as React from 'react';
  const C: React.ComponentType<any>;
  export default C;
}

// Non-dynamic imports used in ReadOnlyLexicalViewerClient
declare module '@/components/editor/nodes/PlaygroundNodes' {
  import { KlassConstructor, LexicalNode } from 'lexical';
  const PlaygroundNodes: KlassConstructor<typeof LexicalNode>[];
  export default PlaygroundNodes;
}

declare module '@/components/editor/plugins/formatting/AutoLinkPlugin' {
  import * as React from 'react';
  const C: React.ComponentType<any>;
  export default C;
}

declare module '@/components/editor/plugins/formatting/KeywordsPlugin' {
  import * as React from 'react';
  const C: React.ComponentType<any>;
  export default C;
}

declare module '@/components/editor/plugins/formatting/LinkPlugin' {
  import * as React from 'react';
  const C: React.ComponentType<any>;
  export default C;
}

declare module '@/components/editor/plugins/input/EmojiPickerPlugin' {
  import * as React from 'react';
  const C: React.ComponentType<any>;
  export default C;
}

declare module '@/components/editor/plugins/input/EmojisPlugin' {
  import * as React from 'react';
  const C: React.ComponentType<any>;
  export default C;
}

declare module '@/components/editor/plugins/input/TabFocusPlugin' {
  import * as React from 'react';
  const C: React.ComponentType<any>;
  export default C;
}

declare module '@/components/editor/plugins/interactive/CollapsiblePlugin' {
  import * as React from 'react';
  const C: React.ComponentType<any>;
  export default C;
}

declare module '@/components/editor/plugins/interactive/StickyPlugin' {
  import * as React from 'react';
  const C: React.ComponentType<any>;
  export default C;
}

declare module '@/components/editor/plugins/layout/TableOfContentsPlugin' {
  import * as React from 'react';
  const C: React.ComponentType<any>;
  export default C;
}

declare module '@/components/editor/plugins/media/FigmaPlugin' {
  import * as React from 'react';
  const C: React.ComponentType<any>;
  export default C;
}

declare module '@/components/editor/plugins/media/TwitterPlugin' {
  import * as React from 'react';
  const C: React.ComponentType<any>;
  export default C;
}

declare module '@/components/editor/plugins/media/YouTubePlugin' {
  import * as React from 'react';
  const C: React.ComponentType<any>;
  export default C;
}

declare module '@/components/editor/themes/PlaygroundEditorTheme' {
  import { EditorThemeClasses } from 'lexical';
  const PlaygroundEditorTheme: EditorThemeClasses;
  export default PlaygroundEditorTheme;
}

// PostEditor component used in post editing pages
declare module '@/components/editor/PostEditor' {
  import * as React from 'react';
  const PostEditor: React.ComponentType<any>;
  export default PostEditor;
}

// Generic fallback: treat any other editor sub-module as `any`
declare module '@/components/editor/*' {
  const anyExport: any;
  export = anyExport;
} 