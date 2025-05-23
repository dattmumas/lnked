'use client';

import React from 'react';
import type { ReactNode } from 'react';

interface EditorLayoutProps {
  toolbar?: ReactNode;
  settingsSidebar?: ReactNode;
  pageTitle?: string;
  children: ReactNode; // canvas/content
}

export default function EditorLayout({
  toolbar,
  settingsSidebar,
  pageTitle,
  children,
}: EditorLayoutProps) {
  return (
    <div className="min-h-screen bg-white">
      {/* Clean header bar */}
      {pageTitle && (
        <div className="border-b border-gray-200 bg-white sticky top-16 z-40">
          <div className="max-w-4xl mx-auto px-6 py-3">
            <h1 className="text-sm font-medium text-gray-600">{pageTitle}</h1>
          </div>
        </div>
      )}

      <div className="flex min-h-screen">
        {/* Main writing area - Full width Substack style */}
        <main className="flex-1 min-w-0">
          {/* Clean, focused writing canvas */}
          {children}
        </main>

        {/* Fixed settings sidebar */}
        {settingsSidebar && (
          <aside className="w-80 shrink-0 border-l border-gray-200 bg-gray-50">
            <div className="sticky top-24 p-6 max-h-screen overflow-y-auto">
              {settingsSidebar}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
