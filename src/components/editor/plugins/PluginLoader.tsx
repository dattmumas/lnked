// @ts-nocheck
'use client';

import React, { lazy, Suspense, ComponentType } from 'react';

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

function LoadingFallback(): React.JSX.Element | null {
  return null; // Silent loading for plugins
}

function LazyPlugin({
  pluginName,
  enabled,
  ...props
}: LazyPluginProps): React.JSX.Element | null {
  // Temporarily disable all lazy plugins to debug the issue
  return null;
}

export default LazyPlugin;
