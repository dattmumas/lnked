'use client';

import dynamic from 'next/dynamic';
import React from 'react';

import type { MuxVideoPlayerSimpleProps } from './MuxVideoPlayerSimple';

// Dynamically import with SSR disabled to prevent hydration mismatch
const MuxVideoPlayerSimple = dynamic(() => import('./MuxVideoPlayerSimple'), {
  ssr: false,
  loading: () => (
    <div className="aspect-video bg-black rounded-lg animate-pulse" />
  ),
});

export default function MuxVideoPlayerClient(
  props: MuxVideoPlayerSimpleProps,
): React.ReactElement {
  return <MuxVideoPlayerSimple {...props} />;
}
