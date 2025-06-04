'use client';

import dynamic from 'next/dynamic';
import type { MuxVideoPlayerSimpleProps } from './MuxVideoPlayerSimple';

// Dynamically import with SSR disabled to prevent hydration mismatch
const MuxVideoPlayerSimple = dynamic(() => import('./MuxVideoPlayerSimple'), {
  ssr: false,
  loading: () => (
    <div className="aspect-video bg-black rounded-lg animate-pulse" />
  ),
});

export default function MuxVideoPlayerClient(props: MuxVideoPlayerSimpleProps) {
  return <MuxVideoPlayerSimple {...props} />;
}
