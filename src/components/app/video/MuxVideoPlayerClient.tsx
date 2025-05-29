'use client';

import dynamic from 'next/dynamic';
import type { MuxVideoPlayerSimpleProps } from './MuxVideoPlayerSimple';

// Dynamically import with SSR disabled to prevent hydration mismatch
const MuxVideoPlayerSimple = dynamic(() => import('./MuxVideoPlayerSimple'), {
  ssr: false,
  loading: () => (
    <div className="aspect-video bg-black rounded-lg flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
    </div>
  ),
});

export default function MuxVideoPlayerClient(props: MuxVideoPlayerSimpleProps) {
  return <MuxVideoPlayerSimple {...props} />;
}
