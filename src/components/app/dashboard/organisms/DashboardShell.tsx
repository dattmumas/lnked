'use client';

import React, { useState } from 'react';
import { DashboardSidebar } from './DashboardSidebar';
import { DashboardNav } from './DashboardNav';

export interface CollectiveSummary {
  id: string;
  name: string;
  slug: string;
}

interface DashboardShellProps {
  children: React.ReactNode;
  userCollectives: CollectiveSummary[];
}

export default function DashboardShell({
  children,
  userCollectives,
}: DashboardShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex flex-col min-h-screen h-full bg-background text-foreground">
      <a
        href="#dashboard-main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-accent text-accent-foreground p-2 rounded z-50"
      >
        Skip to main content
      </a>
      <DashboardNav
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={() => setSidebarCollapsed((c) => !c)}
        collectives={userCollectives}
      />
      <div className="flex flex-1 min-h-0">
        <DashboardSidebar
          className="hidden md:flex"
          collectives={userCollectives}
          collapsed={sidebarCollapsed}
        />
        <main
          id="dashboard-main-content"
          className="flex-1 overflow-y-auto p-4 md:p-6"
        >
          {children}
        </main>
      </div>
    </div>
  );
}

export {};
