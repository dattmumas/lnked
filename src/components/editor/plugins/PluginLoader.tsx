'use client';

import { lazy, Suspense, ComponentType } from 'react';

// Lazy load advanced plugins to reduce bundle size
const LazyEquationsPlugin = lazy(() => import('./interactive/EquationsPlugin'));
const LazyExcalidrawPlugin = lazy(() => import('./media/ExcalidrawPlugin'));
const LazyPollPlugin = lazy(() => import('./interactive/PollPlugin'));
const LazyStickyPlugin = lazy(() => import('./interactive/StickyPlugin'));
const LazyYouTubePlugin = lazy(() => import('./media/YouTubePlugin'));
const LazyTwitterPlugin = lazy(() => import('./media/TwitterPlugin'));
const LazyFigmaPlugin = lazy(() => import('./media/FigmaPlugin'));
const LazyEmojiPickerPlugin = lazy(() => import('./input/EmojiPickerPlugin'));
const LazySpeechToTextPlugin = lazy(() => import('./input/SpeechToTextPlugin'));
const LazyTableOfContentsPlugin = lazy(
  () => import('./layout/TableOfContentsPlugin'),
);
const LazyTableActionMenuPlugin = lazy(
  () => import('./layout/TableActionMenuPlugin'),
);

interface LazyPluginProps {
  pluginName: string;
  enabled: boolean;
  [key: string]: unknown;
}

function LoadingFallback() {
  return null; // Silent loading for plugins
}

function LazyPlugin({ pluginName, enabled, ...props }: LazyPluginProps) {
  if (!enabled) return null;

  const getPluginComponent = (): ComponentType<
    Record<string, unknown>
  > | null => {
    switch (pluginName) {
      case 'equations':
        return LazyEquationsPlugin;
      case 'excalidraw':
        return LazyExcalidrawPlugin;
      case 'poll':
        return LazyPollPlugin;
      case 'sticky':
        return LazyStickyPlugin;
      case 'youtube':
        return LazyYouTubePlugin;
      case 'twitter':
        return LazyTwitterPlugin;
      case 'figma':
        return LazyFigmaPlugin;
      case 'emojiPicker':
        return LazyEmojiPickerPlugin;
      case 'speechToText':
        return LazySpeechToTextPlugin;
      case 'tableOfContents':
        return LazyTableOfContentsPlugin;
      case 'tableActionMenu':
        return LazyTableActionMenuPlugin;
      default:
        return null;
    }
  };

  const PluginComponent = getPluginComponent();

  if (!PluginComponent) {
    console.warn(`Unknown plugin: ${pluginName}`);
    return null;
  }

  return (
    <Suspense fallback={<LoadingFallback />}>
      { }
      <PluginComponent {...(props as Record<string, never>)} />
    </Suspense>
  );
}

export default LazyPlugin;
