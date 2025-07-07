import React from 'react';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Chat - Lnked',
  description: 'Real-time messaging with your network',
};

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactNode {
  return children;
}
