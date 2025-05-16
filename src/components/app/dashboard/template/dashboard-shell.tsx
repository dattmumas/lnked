import React from "react";
import DashboardSidebar from "../organisms/dashboard-sidebar";

interface DashboardShellProps {
  children: React.ReactNode;
}

export default function DashboardShell({ children }: DashboardShellProps) {
  return (
    <div className="flex h-[calc(100vh-4rem)] bg-background text-foreground">
      {/* Adjusted height to account for global navbar (4rem = 16 * 0.25rem) */}
      {/* Sidebar – hidden on mobile, fixed on desktop */}
      <DashboardSidebar />

      {/* Main content area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">{children}</div>
    </div>
  );
}
