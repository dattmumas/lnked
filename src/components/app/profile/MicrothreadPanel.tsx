'use client';

import React from 'react';

export interface MicroPost {
  id: string;
  content: string;
}

interface MicrothreadPanelProps {
  posts: MicroPost[];
}

export default function MicrothreadPanel({
  posts,
}: MicrothreadPanelProps): React.ReactElement | undefined {
  if (!posts.length) return undefined;

  return (
    <aside className="sticky top-4 overflow-y-auto max-h-[calc(100vh-5rem)] space-y-4">
      {posts.map((p) => (
        <div key={p.id} className="text-sm p-3 bg-card rounded-md shadow-sm">
          {p.content}
        </div>
      ))}
    </aside>
  );
}
