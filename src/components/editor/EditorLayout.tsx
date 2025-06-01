'use client';

import React, { useState } from 'react';
import type { ReactNode } from 'react';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/primitives/Button';
import { cn } from '@/lib/utils';

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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-surface-base">
      {/* Mobile sidebar toggle with enhanced interaction */}
      {settingsSidebar && (
        <div className="lg:hidden fixed bottom-6 right-6 z-50">
          <Button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            size="icon"
            variant="default"
            className="rounded-full shadow-lg micro-interaction btn-scale"
            leftIcon={
              sidebarOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )
            }
          />
        </div>
      )}

      {/* Mobile sidebar overlay with design tokens */}
      {settingsSidebar && sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40 transition-opacity transition-fast"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Enhanced container with semantic spacing */}
      <div className="mx-auto max-w-[1800px] px-4 sm:px-6 lg:px-8">
        <div className="flex gap-section">
          {/* Settings sidebar - Enhanced panel separation */}
          {settingsSidebar && (
            <>
              {/* Mobile sidebar with pattern styling */}
              <aside
                className={cn(
                  'lg:hidden fixed left-0 top-0 h-full w-72 bg-surface-elevated-1 z-50',
                  'transform transition-transform duration-300 ease-in-out',
                  'border-r border-border-subtle shadow-xl',
                  sidebarOpen ? 'translate-x-0' : '-translate-x-full',
                )}
              >
                <div className="p-card-md h-full overflow-y-auto pattern-stack">
                  {settingsSidebar}
                </div>
              </aside>

              {/* Desktop sidebar with enhanced panel styling */}
              <aside className="hidden lg:block w-72 flex-shrink-0 pt-page-gap">
                <div className="sticky top-8 bg-surface-elevated-1 rounded-lg border border-border-subtle p-card-md shadow-sm">
                  <div className="pattern-stack">{settingsSidebar}</div>
                </div>
              </aside>
            </>
          )}

          {/* Main writing area with editor context */}
          <main className="flex-1 min-w-0 pt-page-gap pb-16">
            <div className="mx-auto max-w-4xl editor-content">
              {/* Typography context wrapper for editor-specific sizing */}
              <div className="editor-context">{children}</div>
            </div>
          </main>

          {/* Right spacer for visual balance */}
          {settingsSidebar && (
            <div className="hidden xl:block w-32 flex-shrink-0" />
          )}
        </div>
      </div>
    </div>
  );
}
