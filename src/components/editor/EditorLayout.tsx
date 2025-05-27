'use client';

import React, { useState } from 'react';
import type { ReactNode } from 'react';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar toggle */}
      {settingsSidebar && (
        <div className="lg:hidden fixed bottom-4 right-4 z-50">
          <Button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            size="icon"
            className="rounded-full shadow-lg"
          >
            {sidebarOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>
      )}

      {/* Mobile sidebar overlay */}
      {settingsSidebar && sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="mx-auto max-w-[1800px] px-4 sm:px-6 lg:px-8">
        <div className="flex gap-4">
          {/* Settings sidebar - Left side */}
          {settingsSidebar && (
            <>
              {/* Mobile sidebar */}
              <aside
                className={cn(
                  'lg:hidden fixed left-0 top-0 h-full w-60 bg-background z-50 transform transition-transform duration-300 ease-in-out',
                  sidebarOpen ? 'translate-x-0' : '-translate-x-full',
                )}
              >
                <div className="p-6 h-full overflow-y-auto">
                  {settingsSidebar}
                </div>
              </aside>

              {/* Desktop sidebar */}
              <aside className="hidden lg:block w-60 flex-shrink-0 pt-8">
                <div className="sticky top-8">{settingsSidebar}</div>
              </aside>
            </>
          )}

          {/* Main writing area - Much wider */}
          <main className="flex-1 min-w-0 pt-8 pb-16">
            <div className="mx-auto max-w-5xl">{children}</div>
          </main>

          {/* Right spacer for balance - desktop only, minimal */}
          {settingsSidebar && (
            <div className="hidden xl:block w-32 flex-shrink-0" />
          )}
        </div>
      </div>
    </div>
  );
}
