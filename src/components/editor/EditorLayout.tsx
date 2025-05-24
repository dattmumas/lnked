'use client';

import React from 'react';
import type { ReactNode } from 'react';

interface EditorLayoutProps {
  settingsSidebar?: ReactNode;
  children: ReactNode; // canvas/content
  /**
   * Optional page title used by parent components. This is currently
   * unused but included so consuming components can pass it without
   * causing type errors during type checking.
   */
  pageTitle?: string;
}

export default function EditorLayout({
  settingsSidebar,
  children,
}: EditorLayoutProps) {
  return (
    <div className="container mx-auto px-4 md:px-6">
      <div className="flex gap-6">
        {/* Main writing area - Full width Substack style */}
        <div className="flex-1">
          {/* Clean, focused writing canvas */}
          {children}
        </div>

        {/* Fixed settings sidebar */}
        {settingsSidebar && (
          <aside className="w-80 flex-shrink-0">
            <div className="sticky top-24 bg-gray-50 border border-gray-200 rounded-lg p-6 max-h-[calc(100vh-6rem)] overflow-y-auto">
              {settingsSidebar}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
