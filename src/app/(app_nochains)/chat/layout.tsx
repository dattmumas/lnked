import React from 'react';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Chat v2',
  description: 'Modern chat interface with real-time messaging',
};

export default function ChatV2Layout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return <div className="h-full flex flex-col overflow-hidden">{children}</div>;
}
