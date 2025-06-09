import React from 'react';

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
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background text-foreground">
      <a
        href="#dashboard-main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-accent text-accent-foreground p-2 rounded z-50"
      >
        Skip to main content
      </a>
      <main id="dashboard-main-content" className="w-full p-4 md:p-6">
        {children}
      </main>
    </div>
  );
}

export {};
