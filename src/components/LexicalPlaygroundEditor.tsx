'use client';

import dynamic from 'next/dynamic';
import '@/components/lexical-playground/index.css';

// Lazy-load the heavy playground so it doesn't bloat the first bundle.
const PlaygroundApp = dynamic(
  () => import('@/components/lexical-playground/App'),
  { ssr: false },
);

export default function LexicalPlaygroundEditor() {
  return (
    <div className="flex justify-center">
      <div className="w-full max-w-screen-lg">
        <PlaygroundApp />
      </div>
    </div>
  );
}
