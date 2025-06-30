'use client';

import React, { lazy, Suspense, ComponentType } from 'react';

// Map plugin names to their lazy imports
const PLUGIN_LOADERS: Record<
  string,
  React.LazyExoticComponent<React.ComponentType<any>>
> = {
  equations: lazy(() => import('./interactive/EquationsPlugin')),
  excalidraw: lazy(() => import('./media/ExcalidrawPlugin')),
  poll: lazy(() => import('./interactive/PollPlugin')),
  sticky: lazy(() => import('./interactive/StickyPlugin')),
  youtube: lazy(() => import('./media/YouTubePlugin')),
  twitter: lazy(() => import('./media/TwitterPlugin')),
  figma: lazy(() => import('./media/FigmaPlugin')),
  emojiPicker: lazy(() => import('./input/EmojiPickerPlugin')),
  speechToText: lazy(() => import('./input/SpeechToTextPlugin')),
  tableActionMenu: lazy(() => import('./layout/TableActionMenuPlugin')),
} as const;

type PluginName = keyof typeof PLUGIN_LOADERS;

interface LazyPluginProps {
  pluginName: PluginName;
  enabled: boolean;
  [key: string]: unknown;
}

function LoadingFallback(): React.JSX.Element | null {
  // Silent loading for plugins - they'll appear when ready
  return null;
}

function LazyPlugin({
  pluginName,
  enabled,
  ...props
}: LazyPluginProps): React.JSX.Element | null {
  // Only render if enabled
  if (!enabled) {
    return null;
  }

  // Get the lazy component for this plugin
  const LazyComponent = PLUGIN_LOADERS[pluginName];

  if (!LazyComponent) {
    console.warn(`Unknown plugin: ${pluginName}`);
    return null;
  }

  return (
    <Suspense fallback={<LoadingFallback />}>
      <LazyComponent {...props} />
    </Suspense>
  );
}

export default LazyPlugin;
