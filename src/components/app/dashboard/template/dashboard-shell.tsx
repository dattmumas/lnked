import React from "react";
import { DashboardSidebar } from "../organisms/dashboard-sidebar";

interface DashboardShellProps {
  children: React.ReactNode;
}

export default function DashboardShell({ children }: DashboardShellProps) {
  return (
    <div className="flex min-h-screen h-full bg-background text-foreground">
      {/* Sidebar – hidden on mobile, shown on larger screens */}
      <DashboardSidebar className="hidden md:flex" />

      {/* Main content area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="container mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
