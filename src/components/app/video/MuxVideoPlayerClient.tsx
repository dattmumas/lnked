'use client';

import dynamic from 'next/dynamic';
import React from 'react';

import type { MuxVideoPlayerEnhancedProps } from './MuxVideoPlayerEnhanced.tsx';

// Dynamically import with SSR disabled to prevent hydration mismatch
const MuxVideoPlayerEnhanced = dynamic<MuxVideoPlayerEnhancedProps>(
  () => import('./MuxVideoPlayerEnhanced.tsx').then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="aspect-video bg-black rounded-lg animate-pulse" />
    ),
  },
);

export default function MuxVideoPlayerClient(
  props: MuxVideoPlayerEnhancedProps,
): React.ReactElement {
  return <MuxVideoPlayerEnhanced {...props} />;
}
